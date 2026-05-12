'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { getAnonId } from '@/lib/anon'
import { cn } from '@/lib/utils'
import SwapSheet from '@/app/components/SwapSheet'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TODAY_ABBR = DAYS_OF_WEEK[new Date().getDay()]
const TOMORROW_ABBR = DAYS_OF_WEEK[(new Date().getDay() + 1) % 7]

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrepAheadNew {
  tonight: string
  tomorrow: string
}

interface MealRow {
  id: string
  day: string
  meal_type: 'breakfast' | 'brunch' | 'lunch' | 'dinner'
  recipe_name: string
  reasoning: string | null
  cooked: boolean
  cooked_at: string | null
  verdict: 'loved' | 'ok' | 'skip' | null
  verdict_shown: boolean
  use_soon_priority: boolean
  recipe_id: string | null
  prep_ahead: unknown
  assembly_time_mins: number | null
  cook_time_minutes: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPrepAhead(raw: unknown): PrepAheadNew | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const pa = raw as Record<string, unknown>
  if (typeof pa.tonight === 'string' && typeof pa.tomorrow === 'string') {
    return { tonight: pa.tonight, tomorrow: pa.tomorrow }
  }
  return null
}

function withinFeedbackWindow(cookedAt: string | null): boolean {
  if (!cookedAt) return false
  return (Date.now() - new Date(cookedAt).getTime()) < 72 * 60 * 60 * 1000
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

type HomeCardState =
  | { type: 'active'; meal: MealRow; prepAhead: PrepAheadNew | null }
  | { type: 'prep_reminder'; meal: MealRow; prepAhead: PrepAheadNew }
  | { type: 'empty' }

function computeHomeCard(meals: MealRow[], skipPrepReminder: boolean): HomeCardState {
  // Today's uncooked meals — prep-ahead first, then by meal_type order
  const todayUncooked = meals.filter(m => m.day === TODAY_ABBR && !m.cooked)
  if (todayUncooked.length > 0) {
    const sorted = [...todayUncooked].sort((a, b) => {
      const aPA = !!getPrepAhead(a.prep_ahead)
      const bPA = !!getPrepAhead(b.prep_ahead)
      if (aPA && !bPA) return -1
      if (!aPA && bPA) return 1
      return 0
    })
    const meal = sorted[0]
    return { type: 'active', meal, prepAhead: getPrepAhead(meal.prep_ahead) }
  }

  // Tomorrow's prep-ahead meal as a prep reminder (if not skipped)
  if (!skipPrepReminder) {
    const tomorrowPrep = meals.find(m =>
      m.day === TOMORROW_ABBR && !m.cooked && !!getPrepAhead(m.prep_ahead)
    )
    if (tomorrowPrep) {
      const prepAhead = getPrepAhead(tomorrowPrep.prep_ahead)!
      return { type: 'prep_reminder', meal: tomorrowPrep, prepAhead }
    }
  }

  return { type: 'empty' }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonHome() {
  return (
    <main className="min-h-screen bg-p1-cream">
      <div className="px-5 pt-12 pb-6 flex justify-between">
        <div className="h-6 w-32 bg-p1-surface rounded animate-pulse" />
        <div className="h-6 w-6 bg-p1-surface rounded animate-pulse" />
      </div>
      <div className="mx-5 h-52 bg-p1-surface rounded-3xl animate-pulse mb-5" />
      <div className="mx-5 flex gap-2">
        {DAYS.map(d => (
          <div key={d} className="flex-1 h-12 bg-p1-surface rounded-2xl animate-pulse" />
        ))}
      </div>
    </main>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState<MealRow[]>([])
  const [feedbackDismissed, setFeedbackDismissed] = useState(false)
  const [verdictSent, setVerdictSent] = useState(false)
  const [sendingVerdict, setSendingVerdict] = useState(false)
  const [markingCookedId, setMarkingCookedId] = useState<string | null>(null)
  const [skipPrepReminder, setSkipPrepReminder] = useState(false)
  const [swapMeal, setSwapMeal] = useState<MealRow | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const anonId = getAnonId()
        const res = await fetch(`/api/meals/current?anon_id=${encodeURIComponent(anonId)}`)
        const { meals: raw } = await res.json()
        setMeals(raw ?? [])
      } catch {
        // allow through
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleMarkCooked(mealId: string) {
    if (markingCookedId) return
    setMarkingCookedId(mealId)
    try {
      const res = await fetch('/api/meals/cooked', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: mealId }),
      })
      if (!res.ok) throw new Error()
      setMeals(prev =>
        prev.map(m => m.id === mealId
          ? { ...m, cooked: true, cooked_at: new Date().toISOString() }
          : m
        )
      )
    } catch {
      // allow through — user can retry
    } finally {
      setMarkingCookedId(null)
    }
  }

  async function sendVerdict(mealId: string, verdict: string | null, dismiss?: boolean) {
    if (sendingVerdict) return
    setSendingVerdict(true)
    try {
      await fetch('/api/meals/verdict', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: mealId, verdict, dismiss }),
      })
      setVerdictSent(true)
      setMeals(prev =>
        prev.map(m =>
          m.id === mealId
            ? { ...m, verdict: (verdict as MealRow['verdict']) ?? m.verdict, verdict_shown: true }
            : m
        )
      )
    } catch {
      // allow through
    } finally {
      setSendingVerdict(false)
    }
  }

  if (loading) return <SkeletonHome />

  const hasPlan = meals.length > 0
  const cardState = computeHomeCard(meals, skipPrepReminder)

  // Narrow card state for TypeScript
  const activeCard = cardState.type === 'active' ? cardState : null
  const reminderCard = cardState.type === 'prep_reminder' ? cardState : null

  // Derived active card values
  const activeMeal = activeCard?.meal ?? null
  const activePrepAhead = activeCard?.prepAhead ?? null
  const activeOverline = activePrepAhead ? 'Ready to assemble' : "What's cooking"
  const activeSubtitle = activePrepAhead
    ? `Assemble in ${activeMeal?.assembly_time_mins ?? '?'} min`
    : activeMeal?.reasoning ?? null
  const activeTiming = activePrepAhead
    ? `Prepped last night: ${activePrepAhead.tonight}`
    : activeMeal?.cook_time_minutes
      ? `${activeMeal.cook_time_minutes} min`
      : null

  // Feedback candidate: cooked, no verdict, within 72h, not shown yet
  const feedbackMeal = !feedbackDismissed && !verdictSent
    ? meals.find(
        m =>
          m.cooked &&
          m.verdict === null &&
          !m.verdict_shown &&
          withinFeedbackWindow(m.cooked_at)
      ) ?? null
    : null

  // Week strip meal map
  const mealByDay: Record<string, MealRow> = {}
  for (const m of meals) {
    mealByDay[m.day] = m
  }

  return (
    <main className="min-h-screen bg-p1-cream">

      {/* Swap sheet */}
      {swapMeal && (
        <SwapSheet
          meal={swapMeal}
          open={!!swapMeal}
          onClose={() => setSwapMeal(null)}
          isPrepAhead={!!getPrepAhead(swapMeal.prep_ahead)}
          isToday={swapMeal.day === TODAY_ABBR}
          onSwapped={newName => {
            setMeals(prev =>
              prev.map(m => m.id === swapMeal.id ? { ...m, recipe_name: newName } : m)
            )
            setSwapMeal(null)
          }}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-widest">
            {greeting()}
          </p>
          <h1 className="text-xl font-ui font-bold text-p1-dark mt-0.5">
            {hasPlan ? "Here's your week" : 'Ready to plan?'}
          </h1>
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-p1-card border border-p1-border text-p1-brown active:opacity-70"
          aria-label="Profile settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 space-y-4 pb-10">

        {/* ── Feedback card ──────────────────────────────────────────────── */}
        {feedbackMeal && (
          <div className="rounded-2xl bg-p1-card border border-p1-border-lt shadow-sm px-4 py-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-ui font-semibold text-p1-dark leading-snug pr-4">
                How did {feedbackMeal.recipe_name} land? 🍽
              </p>
              <button
                onClick={() => {
                  setFeedbackDismissed(true)
                  sendVerdict(feedbackMeal.id, null, true)
                }}
                className="text-p1-brown/50 text-lg leading-none shrink-0 -mt-0.5"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => sendVerdict(feedbackMeal.id, 'loved')}
                disabled={sendingVerdict}
                className="flex-1 py-2.5 rounded-xl bg-p1-forest text-white text-xs font-ui font-semibold active:opacity-80 disabled:opacity-50"
              >
                Everyone loved it 🙌
              </button>
              <button
                onClick={() => sendVerdict(feedbackMeal.id, 'ok')}
                disabled={sendingVerdict}
                className="flex-1 py-2.5 rounded-xl bg-p1-surface text-p1-dark text-xs font-ui font-semibold active:opacity-80 disabled:opacity-50"
              >
                It was fine 🤷
              </button>
              <button
                onClick={() => sendVerdict(feedbackMeal.id, 'skip')}
                disabled={sendingVerdict}
                className="flex-1 py-2.5 rounded-xl bg-p1-surface text-p1-brown text-xs font-ui font-semibold active:opacity-80 disabled:opacity-50"
              >
                Won&apos;t make again
              </button>
            </div>
          </div>
        )}

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl px-5 py-6 min-h-[200px] flex flex-col justify-between"
          style={{ backgroundColor: '#C4522A' }}
        >

          {/* State A — Active meal */}
          {activeMeal && (
            <>
              <div>
                <p className="text-[11px] font-ui font-semibold uppercase tracking-widest text-white/70 mb-2">
                  {activeOverline}
                </p>
                <h2 className="text-xl font-ui font-bold text-white leading-snug">
                  {activeMeal.recipe_name}
                </h2>
                {activeSubtitle && (
                  <p className="mt-1.5 text-sm font-ui text-white/85 leading-snug">
                    {activeSubtitle}
                  </p>
                )}
                {activeTiming && (
                  <p className="mt-1 text-xs font-ui text-white/70 leading-snug">
                    {activeTiming}
                  </p>
                )}
              </div>

              {/* Three CTAs */}
              <div className="mt-5 space-y-2.5">
                <Link
                  href={activeMeal.recipe_id ? `/cook/${activeMeal.recipe_id}` : '/planner'}
                  className="block w-full py-3 rounded-xl bg-white text-p1-terra text-sm font-ui font-bold text-center active:opacity-80"
                >
                  Let&apos;s cook →
                </Link>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setSwapMeal(activeMeal)}
                    className="flex-1 py-2.5 rounded-xl border border-white/40 text-white text-sm font-ui font-semibold text-center active:opacity-80"
                  >
                    Swap
                  </button>
                  <button
                    onClick={() => handleMarkCooked(activeMeal.id)}
                    disabled={markingCookedId === activeMeal.id}
                    className="flex-1 py-2.5 rounded-xl border border-p1-forest/60 text-white text-sm font-ui font-semibold text-center active:opacity-80 disabled:opacity-60"
                  >
                    {markingCookedId === activeMeal.id ? 'Saving…' : 'Mark as cooked ✓'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* State B — Tomorrow's prep reminder */}
          {reminderCard && (
            <>
              <div>
                <p className="text-[11px] font-ui font-semibold uppercase tracking-widest text-white/70 mb-2">
                  Tomorrow&apos;s plan
                </p>
                <h2 className="text-xl font-ui font-bold text-white leading-snug">
                  Tomorrow: {reminderCard.meal.recipe_name}
                </h2>
                <p className="mt-1.5 text-sm font-ui text-white/85 leading-snug">
                  Prep tonight: {reminderCard.prepAhead.tonight}
                </p>
                {reminderCard.meal.assembly_time_mins && (
                  <p className="mt-1 text-xs font-ui text-white/70">
                    Assemble in {reminderCard.meal.assembly_time_mins} min tomorrow
                  </p>
                )}
              </div>
              <div className="mt-5 space-y-2.5">
                <Link
                  href="/planner"
                  className="block w-full py-3 rounded-xl bg-white text-p1-terra text-sm font-ui font-bold text-center active:opacity-80"
                >
                  Start prepping
                </Link>
                <button
                  onClick={() => setSkipPrepReminder(true)}
                  className="block w-full py-2.5 text-sm font-ui text-white/70 text-center"
                >
                  Skip tonight
                </button>
              </div>
            </>
          )}

          {/* Empty state */}
          {cardState.type === 'empty' && (
            <>
              <div>
                <p className="text-[11px] font-ui font-semibold uppercase tracking-widest text-white/70 mb-2">
                  All sorted
                </p>
                <h2 className="text-xl font-ui font-bold text-white">
                  {hasPlan ? "You're all sorted for now" : 'Nothing planned right now'}
                </h2>
                <p className="text-sm font-ui text-white/70 mt-1">
                  {hasPlan
                    ? "Check back when it's time to cook — or head to the planner if you want to tweak the week."
                    : "Tell us what's in the kitchen and we'll sort the week."}
                </p>
              </div>
              <Link
                href={hasPlan ? '/planner' : '/planner/generate'}
                className="mt-5 block py-3 rounded-xl border border-white/40 text-white text-sm font-ui font-semibold text-center active:opacity-80"
              >
                {hasPlan ? 'Go to planner' : 'Plan my week →'}
              </Link>
            </>
          )}
        </div>

        {/* ── Week strip ─────────────────────────────────────────────────── */}
        {hasPlan && (
          <div>
            <p className="text-[11px] font-ui font-semibold text-p1-brown uppercase tracking-widest mb-2.5">
              This week
            </p>
            <div className="flex gap-1.5">
              {DAYS.map(day => {
                const meal = mealByDay[day]
                const isToday = day === TODAY_ABBR
                const isCooked = meal?.cooked
                const hasMeal = !!meal

                return (
                  <button
                    key={day}
                    onClick={() => router.push('/planner')}
                    className={cn(
                      'flex-1 flex flex-col items-center py-2.5 rounded-2xl gap-1 transition-colors',
                      isToday
                        ? 'bg-p1-terra'
                        : isCooked
                        ? 'bg-p1-forest-lt'
                        : 'bg-p1-card border border-p1-border-lt'
                    )}
                  >
                    <span className={cn(
                      'text-[10px] font-ui font-bold',
                      isToday ? 'text-white'
                        : isCooked ? 'text-p1-forest'
                        : 'text-p1-brown'
                    )}>
                      {day.slice(0, 1)}
                    </span>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isToday ? 'bg-white/60'
                        : isCooked ? 'bg-p1-forest'
                        : hasMeal ? 'bg-p1-terra'
                        : 'bg-p1-border'
                    )} />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Quick actions (no plan) ────────────────────────────────────── */}
        {!hasPlan && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/recipes"
              className="flex flex-col gap-1.5 px-4 py-4 rounded-2xl bg-p1-card border border-p1-border-lt"
            >
              <span className="text-xl">📖</span>
              <span className="text-sm font-ui font-semibold text-p1-dark">Recipe bank</span>
              <span className="text-xs font-ui text-p1-brown">Browse saved recipes</span>
            </Link>
            <Link
              href="/pantry"
              className="flex flex-col gap-1.5 px-4 py-4 rounded-2xl bg-p1-card border border-p1-border-lt"
            >
              <span className="text-xl">🧺</span>
              <span className="text-sm font-ui font-semibold text-p1-dark">Pantry</span>
              <span className="text-xs font-ui text-p1-brown">What&apos;s in the kitchen</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
