'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAnonId } from '@/lib/anon'
import { MealTypeChips } from '@/app/components/MealTypeChips'
import { DaySelectionWidget, isDaySelectionValid } from '@/app/components/DaySelectionWidget'

// ── Types ─────────────────────────────────────────────────────────────────────

type StreamedMeal = {
  day: string
  meal_type?: string
  recipe_name: string
  reasoning?: string | null
  use_soon_priority?: boolean
}

type SlotState = 'pending' | 'generating' | 'done'

type SlotRow = {
  day: string          // 'Mon', 'Tue', etc.
  mealType: string     // 'breakfast', 'lunch', 'dinner'
  state: SlotState
  recipeName?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']

const DAY_LABELS: Record<string, string> = {
  Mon: 'Mon', Tue: 'Tue', Wed: 'Wed',
  Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun',
}

const MEAL_CHIP_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const ROTATING_LABELS = [
  "Picking recipes you’ll actually want to make.",
  "Making sure nothing repeats too soon.",
  "Thinking about what goes well together.",
]

const DEFAULT_MEAL_TYPES = ['breakfast', 'dinner']
const DEFAULT_DAY_SELECTIONS: Record<string, string[]> = {
  breakfast: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  dinner: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build ordered slot list from day selections (Mon Bfast → Mon Dinner → Tue Bfast → ...) */
function buildExpectedSlots(daySelections: Record<string, string[]>): SlotRow[] {
  const slots: SlotRow[] = []
  for (const day of DAY_ORDER) {
    for (const mealType of MEAL_TYPE_ORDER) {
      if ((daySelections[mealType] ?? []).includes(day)) {
        slots.push({ day, mealType, state: 'pending' })
      }
    }
  }
  return slots
}

// ── Page ─────────────────────────────────────────────────────────────────────

type PageState = 'idle' | 'generating' | 'success' | 'error'

export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRegen = searchParams.get('mode') === 'regen'

  const [pageState, setPageState] = useState<PageState>('idle')

  // ── Form state ─────────────────────────────────────────────────────────────
  const [mealTypes, setMealTypes] = useState<string[]>(DEFAULT_MEAL_TYPES)
  const [daySelections, setDaySelections] = useState<Record<string, string[]>>(DEFAULT_DAY_SELECTIONS)
  const [pantryInput, setPantryInput] = useState('')
  const [weekContext, setWeekContext] = useState('')
  const [useSoon, setUseSoon] = useState('')
  const [formError, setFormError] = useState('')

  // ── Generation state ────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<SlotRow[]>([])
  const [rotatingLabelIdx, setRotatingLabelIdx] = useState(0)
  const [labelVisible, setLabelVisible] = useState(true)
  const [successVisible, setSuccessVisible] = useState(false)
  const [listVisible, setListVisible] = useState(true)
  const [showFallbackBtn, setShowFallbackBtn] = useState(false)
  const [partialError, setPartialError] = useState('')
  const [completedCount, setCompletedCount] = useState(0)

  const rotateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-fill from preferences on mount
  useEffect(() => {
    const anonId = getAnonId()
    fetch(`/api/preferences/get?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ preferences: p }) => {
        if (!p) return
        if (p.last_pantry_input) setPantryInput(p.last_pantry_input)
        if (Array.isArray(p.meal_types_default) && p.meal_types_default.length > 0) {
          const normalized = (p.meal_types_default as string[]).map(t => t === 'brunch' ? 'breakfast' : t)
          setMealTypes(Array.from(new Set(normalized)))
        }
      })
      .catch(() => {/* allow through */})
  }, [])

  // Rotate sub-labels every 4s with 200ms cross-fade
  useEffect(() => {
    if (pageState !== 'generating') {
      if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current)
      return
    }
    rotateIntervalRef.current = setInterval(() => {
      setLabelVisible(false)
      setTimeout(() => {
        setRotatingLabelIdx(i => (i + 1) % ROTATING_LABELS.length)
        setLabelVisible(true)
      }, 200)
    }, 4000)
    return () => {
      if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current)
    }
  }, [pageState])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current)
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [])

  function handleMealTypeChange(selected: string[]) {
    setMealTypes(selected)
  }

  /** Called when all slots reach State 3 — trigger success transition then auto-nav */
  function triggerSuccess(totalSlots: number) {
    setCompletedCount(totalSlots)
    // Fade list out
    setListVisible(false)
    setTimeout(() => {
      setPageState('success')
      setSuccessVisible(true)
      // Auto-navigate after 1.5s
      navTimerRef.current = setTimeout(() => {
        router.push('/planner')
      }, 1500)
      // Fallback button after 3s
      fallbackTimerRef.current = setTimeout(() => {
        setShowFallbackBtn(true)
      }, 3000)
    }, 200)
  }

  async function handleGenerate() {
    if (!pantryInput.trim() || mealTypes.length === 0) return
    if (!isDaySelectionValid(mealTypes, daySelections)) return

    setFormError('')
    setPartialError('')
    setShowFallbackBtn(false)
    setSuccessVisible(false)
    setListVisible(true)
    setRotatingLabelIdx(0)
    setLabelVisible(true)
    setCompletedCount(0)

    // Compute expected slots before submit
    const expectedSlots = buildExpectedSlots(daySelections)
    setSlots(expectedSlots)
    setPageState('generating')

    const anonId = getAnonId()
    const today = new Date().toISOString().split('T')[0]

    const mealPlan: Record<string, number> = {}
    for (const [type, days] of Object.entries(daySelections)) {
      mealPlan[type] = days.length
    }

    let gotDone = false
    let slotsRef = expectedSlots.map(s => ({ ...s }))

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
          day_selections: daySelections,
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
            const meal = event.meal
            // Find matching pending slot (by day + meal_type)
            const idx = slotsRef.findIndex(
              s => s.day === meal.day &&
                   s.mealType === (meal.meal_type ?? '') &&
                   s.state !== 'done'
            )
            if (idx !== -1) {
              slotsRef = slotsRef.map((s, i) =>
                i === idx ? { ...s, state: 'done' as SlotState, recipeName: meal.recipe_name } : s
              )
              setSlots([...slotsRef])
            }
          } else if (event.type === 'done') {
            gotDone = true
            // Reconcile any remaining slots from the done payload
            if (event.meals && event.meals.length > 0) {
              for (const meal of event.meals) {
                const idx = slotsRef.findIndex(
                  s => s.day === meal.day &&
                       s.mealType === (meal.meal_type ?? '') &&
                       s.state !== 'done'
                )
                if (idx !== -1) {
                  slotsRef = slotsRef.map((s, i) =>
                    i === idx ? { ...s, state: 'done' as SlotState, recipeName: meal.recipe_name } : s
                  )
                }
              }
              setSlots([...slotsRef])
            }
            const allDone = slotsRef.every(s => s.state === 'done')
            if (allDone) {
              triggerSuccess(slotsRef.length)
            } else {
              // Partial failure — show partial error
              setPartialError('Couldn’t find a recipe for some slots — try again?')
            }
          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'Unknown error')
          }
        }
      }

      if (!gotDone) {
        throw new Error('Plan generation did not complete')
      }
    } catch {
      setPageState('error')
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <main className="min-h-screen bg-p1-cream flex flex-col items-center justify-center px-6 pb-24">
        <div
          style={{
            opacity: successVisible ? 1 : 0,
            transition: 'opacity 200ms ease-in',
          }}
          className="text-center"
        >
          <p className="font-serif-display text-2xl font-bold text-p1-dark">
            Your week is sorted. ✓
          </p>
          <p className="mt-2 text-sm text-p1-brown font-ui">
            {completedCount} meal{completedCount !== 1 ? 's' : ''}, zero decisions left.
          </p>
          {showFallbackBtn && (
            <button
              onClick={() => router.push('/planner')}
              className="mt-6 w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide active:opacity-80 transition-opacity"
            >
              Go to Planner
            </button>
          )}
        </div>
      </main>
    )
  }

  // ── Error screen ────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <main className="min-h-screen bg-p1-cream px-4 pt-8 pb-24">
        <p className="font-serif-display text-xl font-bold text-p1-dark">
          Hmm, something didn&apos;t work.
        </p>
        <p className="mt-2 text-sm text-p1-brown font-ui">
          Give it one more try?
        </p>
        <button
          onClick={() => {
            setPageState('idle')
            setSlots([])
          }}
          className="mt-6 w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide active:opacity-80 transition-opacity"
        >
          Try again
        </button>
      </main>
    )
  }

  // ── Generating screen (loading + streaming rows) ─────────────────────────────
  if (pageState === 'generating') {
    const allDone = slots.length > 0 && slots.every(s => s.state === 'done')
    return (
      <main className="min-h-screen bg-p1-cream pb-24">
        {/* Header */}
        <div className="pt-8 px-4 pb-4">
          <p className="font-serif-display text-xl font-bold text-p1-dark">
            Rasa is sorting your week...
          </p>
          <p
            className="mt-1 text-sm text-p1-brown font-ui"
            style={{
              opacity: labelVisible ? 1 : 0,
              transition: 'opacity 200ms ease-in-out',
            }}
          >
            {ROTATING_LABELS[rotatingLabelIdx]}
          </p>
        </div>

        {/* Slot rows */}
        <div
          className="px-4 space-y-3"
          style={{
            opacity: listVisible && !allDone ? 1 : 0,
            transition: 'opacity 200ms ease-out',
          }}
        >
          {slots.map((slot, i) => (
            <SlotRowItem key={`${slot.day}-${slot.mealType}-${i}`} slot={slot} />
          ))}

          {/* Partial error + continue link */}
          {partialError && (
            <div className="pt-2 space-y-2">
              <p className="text-sm text-p1-brown font-ui">{partialError}</p>
              <button
                onClick={() => router.push('/planner')}
                className="text-sm text-p1-brown font-ui underline active:opacity-60"
              >
                Continue with what we have
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── Input form (idle) ───────────────────────────────────────────────────────
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

        {/* ── Field 2 — Day selection widget ──────────────────────────────────── */}
        <DaySelectionWidget
          selectedMealTypes={mealTypes}
          onChange={setDaySelections}
        />

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
        {formError && (
          <p className="text-sm text-red-600 font-ui bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {formError}
          </p>
        )}

        {/* ── CTA ────────────────────────────────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={!pantryInput.trim() || !isDaySelectionValid(mealTypes, daySelections)}
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

// ── SlotRowItem ───────────────────────────────────────────────────────────────

function SlotRowItem({ slot }: { slot: SlotRow }) {
  const dayLabel = DAY_LABELS[slot.day] ?? slot.day
  const chipLabel = MEAL_CHIP_LABELS[slot.mealType] ?? slot.mealType

  return (
    <div className="flex items-center gap-3 py-1">
      {/* Day label — fixed 52px */}
      <span
        className="text-sm font-ui font-medium text-p1-dark shrink-0"
        style={{ width: 52 }}
      >
        {dayLabel}
      </span>

      {/* Meal chip */}
      <span className="bg-p1-surface text-p1-brown text-xs font-ui px-2.5 py-1 rounded-full shrink-0">
        {chipLabel}
      </span>

      {/* State content */}
      {slot.state === 'pending' && (
        <span
          className="h-4 rounded-sm bg-p1-surface animate-pulse"
          style={{ width: 140 }}
        />
      )}
      {slot.state === 'generating' && (
        <span className="text-sm italic text-p1-brown font-ui animate-pulse">
          Finding...
        </span>
      )}
      {slot.state === 'done' && (
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-ui font-medium text-p1-dark truncate">
            {slot.recipeName}
          </span>
          <span
            className="text-sm shrink-0"
            style={{
              color: '#2D5B3F',
              opacity: 1,
              transition: 'opacity 100ms ease-in',
            }}
          >
            ✓
          </span>
        </span>
      )}
    </div>
  )
}
