'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getAnonId } from '@/lib/anon'
import { Meal } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

const TODAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

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

type PageState = 'idle' | 'loading' | 'done'

export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRegen = searchParams.get('mode') === 'regen'

  const [pageState, setPageState] = useState<PageState>('idle')
  const [pantryInput, setPantryInput] = useState('')
  const [weekContext, setWeekContext] = useState('')
  const [useSoon, setUseSoon] = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')
  const [meals, setMeals] = useState<Meal[]>([])
  const [weekPlanId, setWeekPlanId] = useState('')
  const [visibleCount, setVisibleCount] = useState(0)
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pre-fill pantry from last saved input
  useEffect(() => {
    const anonId = getAnonId()
    fetch(`/api/preferences/get?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ preferences }) => {
        if (preferences?.last_pantry_input) {
          setPantryInput(preferences.last_pantry_input)
        }
      })
      .catch(() => {/* allow through */})
  }, [])

  // Rotate loading messages
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

  // Stagger meal cards in after reveal
  useEffect(() => {
    if (meals.length === 0) return
    setVisibleCount(0)
    meals.forEach((_, i) => {
      setTimeout(() => setVisibleCount(prev => Math.max(prev, i + 1)), i * 200)
    })
  }, [meals])

  async function handleGenerate() {
    if (!pantryInput.trim()) return
    setError('')
    setPageState('loading')

    const anonId = getAnonId()
    try {
      const res = await fetch('/api/plans/generate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id: anonId,
          pantry_input: pantryInput.trim(),
          week_context: weekContext.trim() || undefined,
          use_soon: useSoon.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')

      setMeals(data.meals ?? [])
      setWeekPlanId(data.week_plan_id ?? '')
      setPageState('done')
    } catch {
      setPageState('idle')
      setError("Hmm, something went wrong. Give it one more try?")
    }
  }

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen bg-p1-cream flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-center max-w-xs">
          {/* Animated cooking dots */}
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
            This takes about 30 seconds — we&apos;re writing full recipes, not just picking names.
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

  // ── Reveal screen ───────────────────────────────────────────────────────────
  if (pageState === 'done') {
    const n = meals.length
    return (
      <main className="min-h-screen bg-p1-cream pb-32">
        {/* Forest success banner */}
        <div className="bg-p1-forest px-5 py-3 flex items-center gap-2">
          <span className="text-white text-sm">✓</span>
          <p className="text-white text-sm font-ui">
            These recipes have been saved to your bank.
          </p>
        </div>

        <div className="px-5 pt-7 pb-4">
          <h1 className="text-2xl font-ui font-bold text-p1-dark">
            Your week is sorted. 🎉
          </h1>
          <p className="mt-1 text-sm text-p1-brown font-ui">
            {n} dinner{n !== 1 ? 's' : ''}, zero decision fatigue.
          </p>
        </div>

        {/* Meal cards — staggered reveal */}
        <div className="px-5 space-y-3">
          {meals.map((meal, i) => {
            const isToday = meal.day === TODAY_ABBR
            const isVisible = i < visibleCount
            return (
              <div
                key={meal.id}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 400ms ease-out, transform 400ms ease-out',
                  borderLeft: meal.use_soon_priority ? '3px solid #C4522A' : undefined,
                }}
                className="bg-p1-card rounded-2xl p-4 shadow-sm"
              >
                {/* Day + use-soon tag */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-ui font-semibold uppercase tracking-wider ${isToday ? 'text-p1-terra' : 'text-p1-brown'}`}>
                    {isToday ? 'Tonight — ' : ''}{DAY_LABELS[meal.day] ?? meal.day}
                    {meal.use_soon_priority && (
                      <span className="ml-1.5 text-p1-terra">· Use soon</span>
                    )}
                  </span>
                </div>

                {/* Recipe name */}
                <p className="text-base font-ui font-bold text-p1-dark leading-snug">
                  {meal.recipe_name}
                </p>

                {/* Reasoning */}
                {meal.reasoning && (
                  <p className="mt-1.5 text-sm font-ui text-p1-brown italic leading-relaxed">
                    {meal.reasoning}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer CTAs */}
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
          {isRegen ? 'Rethink the week' : "Let's build your week"}
        </h1>
        <p className="mt-1 text-sm text-p1-brown font-ui">
          {isRegen
            ? 'Update what you have and we\'ll generate a fresh plan.'
            : 'Tell us what\'s in the kitchen and we\'ll handle the rest.'}
        </p>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Field 1 — Pantry (required, terra border) */}
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

        {/* Field 2 — Week context (optional, normal border) */}
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

        {/* Field 3 — Use soon (optional, dashed border, smaller) */}
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

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 font-ui bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={handleGenerate}
          disabled={!pantryInput.trim()}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
        >
          Build my week →
        </button>

        <p className="text-center text-xs text-p1-brown/50 font-ui">
          Takes about 30 seconds — we write real recipes, not templates.
        </p>
      </div>
    </main>
  )
}
