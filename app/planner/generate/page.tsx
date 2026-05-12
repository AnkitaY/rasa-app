'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getAnonId } from '@/lib/anon'
import { MealTypeChips } from '@/app/components/MealTypeChips'
import { DaysStepper, MEAL_TYPE_DEFAULTS, MEAL_TYPE_RANGES } from '@/app/components/DaysStepper'

// ── Types ─────────────────────────────────────────────────────────────────────

type StreamedMeal = {
  day: string
  meal_type?: string
  recipe_name: string
  reasoning?: string | null
  use_soon_priority?: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

const TODAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

const DEFAULT_MEAL_TYPES = ['brunch', 'dinner']
const DEFAULT_MEAL_DAYS: Record<string, number> = { brunch: 5, dinner: 2 }

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLoadingMessages(useSoon: string, weekContext: string): string[] {
  const msgs: string[] = ['Building around what you\'ve got…']

  if (useSoon.trim()) {
    const firstItem = useSoon.split(/[,\n]/)[0].trim()
    msgs.push(`Getting that ${firstItem} into Monday before it goes…`)
  }

  if (weekContext.trim()) {
    const dayMatch = weekContext.match(
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i
    )
    if (dayMatch) {
      msgs.push(`Keeping ${dayMatch[0]} light for you…`)
    } else {
      msgs.push('Reading your week and making it work…')
    }
  }

  msgs.push('Almost there — putting the finishing touches on your week…')
  return msgs
}

// ── Page ─────────────────────────────────────────────────────────────────────

type PageState = 'idle' | 'loading' | 'streaming' | 'done'

export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRegen = searchParams.get('mode') === 'regen'

  const [pageState, setPageState] = useState<PageState>('idle')

  // ── Meal type + days state ──────────────────────────────────────────────────
  const [mealTypes, setMealTypes] = useState<string[]>(DEFAULT_MEAL_TYPES)
  const [mealDays, setMealDays] = useState<Record<string, number>>(DEFAULT_MEAL_DAYS)

  // ── Existing fields ─────────────────────────────────────────────────────────
  const [pantryInput, setPantryInput] = useState('')
  const [weekContext, setWeekContext] = useState('')
  const [useSoon, setUseSoon] = useState('')

  // ── Generation state ────────────────────────────────────────────────────────
  const [loadingMsg, setLoadingMsg] = useState('')
  const [meals, setMeals] = useState<StreamedMeal[]>([])
  const [weekPlanId, setWeekPlanId] = useState('')
  const [visibleCount, setVisibleCount] = useState(0)
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mealIndexRef = useRef(0)

  // Pre-fill from preferences on mount
  useEffect(() => {
    const anonId = getAnonId()
    fetch(`/api/preferences/get?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ preferences: p }) => {
        if (!p) return
        // Pre-fill pantry
        if (p.last_pantry_input) setPantryInput(p.last_pantry_input)
        // Pre-fill meal types from profile defaults
        if (Array.isArray(p.meal_types_default) && p.meal_types_default.length > 0) {
          setMealTypes(p.meal_types_default as string[])
        }
        // Pre-fill meal days from profile defaults
        if (p.meal_days_default && typeof p.meal_days_default === 'object') {
          const defaults = p.meal_days_default as Record<string, number>
          setMealDays(prev => {
            const merged: Record<string, number> = { ...prev }
            for (const [type, days] of Object.entries(defaults)) {
              if (typeof days === 'number') merged[type] = days
            }
            return merged
          })
        }
      })
      .catch(() => {/* allow through */})
  }, [])

  // Handle meal type toggle — initialise days value when a new type is added
  function handleMealTypeChange(selected: string[]) {
    setMealTypes(selected)
    // initialise any newly-added type with its default day count
    setMealDays(prev => {
      const next = { ...prev }
      for (const type of selected) {
        if (next[type] === undefined) {
          next[type] = MEAL_TYPE_DEFAULTS[type] ?? 3
        }
      }
      return next
    })
  }

  function handleDaysChange(type: string, value: number) {
    const { min, max } = MEAL_TYPE_RANGES[type] ?? { min: 1, max: 7 }
    setMealDays(prev => ({ ...prev, [type]: Math.min(max, Math.max(min, value)) }))
  }

  // Rotate loading messages while in the initial loading state
  useEffect(() => {
    if (pageState !== 'loading') {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    const msgs = buildLoadingMessages(useSoon, weekContext)
    let i = 0
    setLoadingMsg(msgs[0])
    intervalRef.current = setInterval(() => {
      i = (i + 1) % msgs.length
      setLoadingMsg(msgs[i])
    }, 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pageState, useSoon, weekContext])

  async function handleGenerate() {
    if (!pantryInput.trim() || mealTypes.length === 0) return
    setError('')
    setMeals([])
    setVisibleCount(0)
    setWeekPlanId('')
    mealIndexRef.current = 0
    setPageState('loading')

    const anonId = getAnonId()
    const today = new Date().toISOString().split('T')[0]

    // Build meal_plan from selected types + their day counts
    const mealPlan: Record<string, number> = {}
    for (const type of mealTypes) {
      mealPlan[type] = mealDays[type] ?? MEAL_TYPE_DEFAULTS[type] ?? 3
    }

    let gotDone = false

    try {
      const res = await fetch('/api/plans/generate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id: anonId,
          pantry_input: pantryInput.trim(),
          week_context: weekContext.trim() || undefined,
          use_soon: useSoon.trim() || undefined,
          plan_start_date: today,
          meal_plan: mealPlan,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Unknown error')
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          let event: { type: string; meal?: StreamedMeal; week_plan_id?: string; meals?: StreamedMeal[]; message?: string }
          try {
            event = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (event.type === 'meal' && event.meal) {
            const idx = mealIndexRef.current++
            setMeals(prev => [...prev, event.meal as StreamedMeal])
            setPageState('streaming')
            setTimeout(() => setVisibleCount(c => Math.max(c, idx + 1)), 50)
          } else if (event.type === 'done') {
            gotDone = true
            setWeekPlanId(event.week_plan_id ?? '')
            if (event.meals && event.meals.length > 0) {
              setMeals(event.meals)
              setVisibleCount(event.meals.length)
            }
            setPageState('done')
          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'Unknown error')
          }
        }
      }

      if (!gotDone) {
        throw new Error('Plan generation did not complete')
      }
    } catch {
      setPageState('idle')
      setMeals([])
      setVisibleCount(0)
      mealIndexRef.current = 0
      setError('Hmm, something went wrong. Give it one more try?')
    }
  }

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen bg-p1-cream flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-center max-w-xs">
          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-p1-terra"
                style={{
                  animation: 'bounce 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <p className="text-lg font-ui font-semibold text-p1-dark leading-snug min-h-[3.5rem] transition-all duration-500">
            {loadingMsg}
          </p>
          <p className="mt-3 text-sm text-p1-brown font-ui">
            First meal appears in a few seconds — full recipes take a little longer.
          </p>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-10px); opacity: 1; }
          }
        `}</style>
      </main>
    )
  }

  // ── Reveal screen (streaming + done) ─────────────────────────────────────────
  if (pageState === 'streaming' || pageState === 'done') {
    const n = meals.length
    const isSaving = pageState === 'streaming'
    return (
      <main className="min-h-screen bg-p1-cream pb-32">
        <div className={`px-5 py-3 flex items-center gap-2 ${isSaving ? 'bg-p1-dark' : 'bg-p1-forest'}`}>
          {isSaving ? (
            <p className="text-white text-sm font-ui">Building your plan…</p>
          ) : (
            <>
              <span className="text-white text-sm">✓</span>
              <p className="text-white text-sm font-ui">
                These recipes have been saved to your bank.
              </p>
            </>
          )}
        </div>

        <div className="px-5 pt-7 pb-4">
          <h1 className="text-2xl font-ui font-bold text-p1-dark">
            Your week is sorted. 🎉
          </h1>
          <p className="mt-1 text-sm text-p1-brown font-ui">
            {n} meal{n !== 1 ? 's' : ''}{isSaving ? ' so far…' : ', zero decision fatigue.'}
          </p>
        </div>

        <div className="px-5 space-y-3">
          {meals.map((meal, i) => {
            const isToday = meal.day === TODAY_ABBR
            const isVisible = i < visibleCount
            return (
              <div
                key={`${meal.day}-${i}`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 400ms ease-out, transform 400ms ease-out',
                  borderLeft: meal.use_soon_priority ? '3px solid #C4522A' : undefined,
                }}
                className="bg-p1-card rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-ui font-semibold uppercase tracking-wider ${isToday ? 'text-p1-terra' : 'text-p1-brown'}`}>
                    {isToday ? 'Today — ' : ''}{DAY_LABELS[meal.day] ?? meal.day}
                    {meal.meal_type && (
                      <span className="ml-1.5 normal-case font-normal text-p1-brown/70">
                        · {meal.meal_type}
                      </span>
                    )}
                    {meal.use_soon_priority && (
                      <span className="ml-1.5 text-p1-terra">· Use soon</span>
                    )}
                  </span>
                </div>

                <p className="text-base font-ui font-bold text-p1-dark leading-snug">
                  {meal.recipe_name}
                </p>

                {meal.reasoning && (
                  <p className="mt-1.5 text-sm font-ui text-p1-brown italic leading-relaxed">
                    {meal.reasoning}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-5 pt-6 space-y-3">
          <button
            onClick={() => router.push('/planner')}
            className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide active:opacity-80 transition-opacity"
          >
            Go to planner →
          </button>
          <Link
            href="/shopping"
            className="block w-full py-3 rounded-xl border border-p1-border bg-p1-card text-p1-dark text-sm font-ui font-medium text-center active:opacity-80"
          >
            🛒 Shopping list ready →
          </Link>
          {weekPlanId && (
            <p className="text-center text-xs text-p1-brown/60 font-ui pt-1">
              Plan saved · week of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      </main>
    )
  }

  // ── Input form ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-p1-cream">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-ui font-bold text-p1-dark">
          {isRegen ? 'Rethink the week' : "Let’s build your week"}
        </h1>
        <p className="mt-1 text-sm text-p1-brown font-ui">
          {isRegen
            ? 'Update what you have and we’ll generate a fresh plan.'
            : 'Tell us what’s in the kitchen and we’ll handle the rest.'}
        </p>
      </div>

      <div className="px-5 space-y-6 pb-8">

        {/* ── Field 1 — Meal type chips ───────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider block">
            What are you cooking this week?
          </label>
          <p className="text-xs font-ui text-p1-brown/70">
            Pick everything that applies — you&apos;ll set days for each one.
          </p>
          <MealTypeChips
            selected={mealTypes}
            onChange={handleMealTypeChange}
          />
        </div>

        {/* ── Field 2 — Days stepper per selected meal type ───────────────────── */}
        {mealTypes.length > 0 && (
          <div className="space-y-1 bg-p1-card rounded-2xl px-4 py-2">
            {mealTypes.map(type => (
              <DaysStepper
                key={type}
                label={`How many ${type} days this week?`}
                mealType={type}
                value={mealDays[type] ?? MEAL_TYPE_DEFAULTS[type] ?? 3}
                onChange={value => handleDaysChange(type, value)}
              />
            ))}
            <p className="text-xs font-ui text-p1-brown/60 pt-1 pb-1">
              Just this week — you can change it every time you plan.
            </p>
          </div>
        )}

        {/* ── Field 3 — Pantry (required, terra border) ──────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
            What&apos;s in the kitchen? <span className="text-p1-terra">*</span>
          </label>
          <textarea
            className="w-full min-h-[130px] rounded-xl px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none resize-none leading-relaxed bg-p1-card"
            style={{ border: '1.5px solid #C4522A' }}
            placeholder="Chicken thighs, basmati rice, onions, tomatoes, garlic, ginger, spinach, lentils, coconut milk…"
            value={pantryInput}
            onChange={e => setPantryInput(e.target.value)}
          />
          <p className="text-xs text-p1-brown/70 font-ui">
            No need for amounts — just list what you have.
          </p>
        </div>

        {/* ── Field 4 — Use soon (optional, dashed border) ───────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
            Anything to use up?{' '}
            <span className="font-normal normal-case text-p1-brown/60">(optional)</span>
          </label>
          <textarea
            className="w-full min-h-[60px] rounded-xl bg-p1-card px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors resize-none leading-relaxed"
            style={{ border: '1.5px dashed #DED2C2' }}
            placeholder="Wilting spinach, leftover cooked chicken, yogurt going out of date…"
            value={useSoon}
            onChange={e => setUseSoon(e.target.value)}
          />
          <p className="text-xs text-p1-brown/70 font-ui">
            We&apos;ll use these up first — Mon or Tue.
          </p>
        </div>

        {/* ── Field 5 — Week context (optional) ──────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
            Anything going on this week?{' '}
            <span className="font-normal normal-case text-p1-brown/60">(optional)</span>
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-p1-border bg-p1-card px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors resize-none leading-relaxed"
            placeholder="Busy Thursday, guests Saturday, want to eat lighter this week…"
            value={weekContext}
            onChange={e => setWeekContext(e.target.value)}
          />
        </div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && (
          <p className="text-sm text-red-600 font-ui bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* ── CTA ────────────────────────────────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={!pantryInput.trim()}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
        >
          Build my week →
        </button>

        <p className="text-center text-xs text-p1-brown/50 font-ui">
          First meals appear in seconds — full recipes take a little longer.
        </p>
      </div>
    </main>
  )
}
