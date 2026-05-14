'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { getAnonId } from '@/lib/anon'
import SwapSheet from '@/app/components/SwapSheet'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
  meal_type: 'breakfast' | 'lunch' | 'dinner'
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

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

type Scenario =
  | 1 // No plan
  | 2 // Rest day (0 meals today)
  | 3 // Morning — uncooked meals
  | 4 // Afternoon — uncooked meals
  | 5 // Evening — uncooked meals
  | 6 // Some cooked, some uncooked
  | 7 // All cooked
  | 8 // Empty slot (same as scenario 2 path)

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

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const MEAL_ORDER: MealRow['meal_type'][] = ['breakfast', 'lunch', 'dinner']

function getHeroMeal(todayMeals: MealRow[], timeOfDay: TimeOfDay): MealRow | null {
  const uncooked = todayMeals.filter(m => !m.cooked)
  if (uncooked.length === 0) return null

  // Try preferred meal type for time of day
  const preferred: MealRow['meal_type'] =
    timeOfDay === 'morning' ? 'breakfast' :
    timeOfDay === 'afternoon' ? 'lunch' : 'dinner'

  const byPreferred = uncooked.find(m => m.meal_type === preferred)
  if (byPreferred) return byPreferred

  // Fall back to next in order
  for (const type of MEAL_ORDER) {
    const found = uncooked.find(m => m.meal_type === type)
    if (found) return found
  }
  return uncooked[0]
}

function getScenario(meals: MealRow[], timeOfDay: TimeOfDay): Scenario {
  const todayMeals = meals.filter(m => m.day === TODAY_ABBR)

  // Scenario 1 — no plan at all
  if (meals.length === 0) return 1

  // Scenario 2 — rest day (no meals today)
  if (todayMeals.length === 0) return 2

  const uncooked = todayMeals.filter(m => !m.cooked)
  const cooked = todayMeals.filter(m => m.cooked)

  // Scenario 7 — all cooked
  if (uncooked.length === 0 && cooked.length > 0) return 7

  // Scenario 6 — some cooked, some uncooked
  if (uncooked.length > 0 && cooked.length > 0) return 6

  // Scenarios 3,4,5 — all uncooked
  if (timeOfDay === 'morning') return 3
  if (timeOfDay === 'afternoon') return 4
  return 5
}

function getMealTypeLabel(type: MealRow['meal_type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function getCookTime(meal: MealRow): string | null {
  if (meal.cook_time_minutes) return `${meal.cook_time_minutes} min`
  if (meal.assembly_time_mins) return `Assemble in ${meal.assembly_time_mins} min`
  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonHome() {
  return (
    <main className="min-h-screen bg-p1-cream">
      <div className="px-5 pt-12 pb-6 flex justify-between">
        <div className="h-6 w-32 bg-p1-surface rounded animate-pulse" />
        <div className="h-6 w-6 bg-p1-surface rounded animate-pulse" />
      </div>
      <div className="mx-5 h-52 bg-p1-surface rounded-xl animate-pulse mb-5" />
      <div className="mx-5 h-24 bg-p1-surface rounded-xl animate-pulse" />
    </main>
  )
}

// ── Today Card ────────────────────────────────────────────────────────────────

interface TodayCardProps {
  meals: MealRow[]
  scenario: Scenario
  timeOfDay: TimeOfDay
  heroMeal: MealRow | null
  markingCookedId: string | null
  onMarkCooked: (id: string) => Promise<void>
  onRemoveMeal: (id: string) => Promise<void>
  onSetSwapMeal: (meal: MealRow) => void
  onSetHeroMeal: (meal: MealRow) => void
}

function TodayCard({
  meals,
  scenario,
  timeOfDay,
  heroMeal,
  markingCookedId,
  onMarkCooked,
  onRemoveMeal,
  onSetSwapMeal,
  onSetHeroMeal,
}: TodayCardProps) {
  const todayMeals = meals.filter(m => m.day === TODAY_ABBR)
  const uncookedToday = todayMeals.filter(m => !m.cooked)
  const cookedToday = todayMeals.filter(m => m.cooked)

  // Breakfast afternoon nudge: breakfast was planned, not cooked, and it's afternoon or evening
  const breakfastNudge =
    (timeOfDay === 'afternoon' || timeOfDay === 'evening') &&
    todayMeals.find(m => m.meal_type === 'breakfast' && !m.cooked) || null

  const cardBase = 'rounded-xl px-4 py-4 w-full'

  // Scenario 1 — No plan
  if (scenario === 1) {
    return (
      <div className={cardBase} style={{ backgroundColor: '#C4522A' }}>
        <p className="text-white font-ui text-base font-semibold mb-1">No plan yet this week.</p>
        <Link
          href="/planner/generate"
          className="text-white font-ui font-semibold underline text-sm"
        >
          Plan my week →
        </Link>
      </div>
    )
  }

  // Scenario 2 — Rest day
  if (scenario === 2) {
    return (
      <div className={cardBase} style={{ backgroundColor: '#C4522A' }}>
        <p className="text-white font-ui text-base font-semibold mb-0.5">Nothing planned today.</p>
        <p className="text-white font-ui text-sm opacity-80 mb-4">Take it easy.</p>
        <Link
          href="/planner"
          className="inline-block px-4 py-2 rounded-lg border border-white/50 text-white font-ui text-sm font-semibold"
        >
          + Add a meal for today
        </Link>
      </div>
    )
  }

  // Scenarios 3,4,5,6 — has hero meal (uncooked)
  if ((scenario === 3 || scenario === 4 || scenario === 5 || scenario === 6) && heroMeal) {
    const otherUncooked = uncookedToday.filter(m => m.id !== heroMeal.id)
    const cookTime = getCookTime(heroMeal)

    return (
      <div className={cardBase} style={{ backgroundColor: '#C4522A' }}>
        {/* Meal type chip */}
        <span className="inline-block bg-white/20 text-white text-xs font-ui font-semibold px-2 py-0.5 rounded-full mb-2">
          {getMealTypeLabel(heroMeal.meal_type)}
        </span>

        {/* Recipe name */}
        <h2 className="text-xl font-serif-display font-bold text-white leading-snug mb-1">
          {heroMeal.recipe_name}
        </h2>

        {/* Subtitle */}
        {heroMeal.reasoning && (
          <p className="text-white text-sm font-ui opacity-80 mb-1 leading-snug">
            {heroMeal.reasoning}
          </p>
        )}

        {/* Time */}
        {cookTime && (
          <p className="text-white text-xs font-ui opacity-70 mb-4">{cookTime}</p>
        )}
        {!cookTime && <div className="mb-4" />}

        {/* CTAs */}
        <div className="space-y-2.5">
          {/* Row 1 — Start Cooking */}
          <Link
            href={heroMeal.recipe_id ? `/cook/${heroMeal.recipe_id}` : '/planner'}
            className="block w-full h-10 flex items-center justify-center rounded-lg bg-white text-p1-terra text-sm font-ui font-bold text-center active:opacity-80"
          >
            Start Cooking
          </Link>

          {/* Row 2 — See Recipe | Swap */}
          <div className="flex gap-2">
            {heroMeal.recipe_id ? (
              <Link
                href={`/recipes/${heroMeal.recipe_id}`}
                className="flex-1 py-2.5 rounded-lg border border-white/50 text-white text-sm font-ui font-semibold text-center active:opacity-80"
              >
                See Recipe
              </Link>
            ) : (
              <span className="flex-1 py-2.5 rounded-lg border border-white/30 text-white/50 text-sm font-ui font-semibold text-center">
                See Recipe
              </span>
            )}
            <button
              onClick={() => onSetSwapMeal(heroMeal)}
              className="flex-1 py-2.5 rounded-lg border border-white/50 text-white text-sm font-ui font-semibold text-center active:opacity-80"
            >
              Swap
            </button>
          </div>

          {/* Row 3 — Skip · Mark as Cooked */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => onRemoveMeal(heroMeal.id)}
              className="text-white text-sm font-ui opacity-70 underline active:opacity-50"
            >
              Skip
            </button>
            <span className="text-white/30 text-sm">·</span>
            <button
              onClick={() => onMarkCooked(heroMeal.id)}
              disabled={markingCookedId === heroMeal.id}
              className="text-white text-sm font-ui opacity-70 underline active:opacity-50 disabled:opacity-40"
            >
              {markingCookedId === heroMeal.id ? 'Saving…' : 'Mark as Cooked'}
            </button>
          </div>
        </div>

        {/* Afternoon nudge */}
        {breakfastNudge && breakfastNudge.id !== heroMeal.id && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white text-xs font-ui opacity-60 mb-1">Did you make breakfast?</p>
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-ui opacity-80">{breakfastNudge.recipe_name}</span>
              <button
                onClick={() => onMarkCooked(breakfastNudge.id)}
                disabled={markingCookedId === breakfastNudge.id}
                className="text-white text-sm font-ui underline opacity-80 active:opacity-50 disabled:opacity-40"
              >
                {markingCookedId === breakfastNudge.id ? 'Saving…' : 'Yes, mark it cooked'}
              </button>
            </div>
          </div>
        )}

        {/* Also today — other uncooked meals */}
        {otherUncooked.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white text-xs font-ui opacity-60 mb-1.5">Also today:</p>
            {otherUncooked.map(m => (
              <button
                key={m.id}
                onClick={() => onSetHeroMeal(m)}
                className="block w-full text-left text-white text-sm font-ui opacity-80 py-0.5 active:opacity-50"
              >
                {getMealTypeLabel(m.meal_type)} · {m.recipe_name}
              </button>
            ))}
          </div>
        )}

        {/* Scenario 6 — Done today */}
        {scenario === 6 && cookedToday.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white text-xs font-ui opacity-60 mb-1.5">Done today:</p>
            {cookedToday.map(m => (
              <p key={m.id} className="text-white text-sm font-ui opacity-70 py-0.5">
                ✓ {getMealTypeLabel(m.meal_type)} · {m.recipe_name}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Scenario 7 — All cooked today
  if (scenario === 7) {
    const needsRating = todayMeals.some(m => m.verdict === null)
    return (
      <div className={cardBase} style={{ backgroundColor: '#C4522A' }}>
        <h2 className="text-xl font-serif-display font-bold text-white mb-1">
          Today&apos;s done. ✓
        </h2>
        <p className="text-white text-sm font-ui opacity-80 mb-4">Well fed.</p>
        {needsRating && (
          <>
            <p className="text-white text-sm font-ui opacity-80 mb-3">
              How did it go? Rate today&apos;s meals.
            </p>
            <Link
              href="/planner"
              className="inline-block px-4 py-2.5 rounded-lg border border-white/50 text-white text-sm font-ui font-semibold active:opacity-80"
            >
              Rate meals
            </Link>
          </>
        )}
      </div>
    )
  }

  // Fallback (scenario 8 — empty slot after removal falls to scenario 2 logic above)
  return (
    <div className={cardBase} style={{ backgroundColor: '#C4522A' }}>
      <p className="text-white font-ui text-base font-semibold">Nothing planned today.</p>
      <p className="text-white font-ui text-sm opacity-80 mt-0.5 mb-4">Take it easy.</p>
      <Link
        href="/planner"
        className="inline-block px-4 py-2 rounded-lg border border-white/50 text-white font-ui text-sm font-semibold"
      >
        + Add a meal for today
      </Link>
    </div>
  )
}

// ── Tomorrow Preview ──────────────────────────────────────────────────────────

interface TomorrowPreviewProps {
  meals: MealRow[]
  timeOfDay: TimeOfDay
}

function TomorrowPreview({ meals, timeOfDay }: TomorrowPreviewProps) {
  const tomorrowMeals = meals.filter(m => m.day === TOMORROW_ABBR)
  const today = new Date().getDay() // 0=Sun
  const isSunday = today === 0

  // Sunday evening nudge
  if (isSunday && timeOfDay === 'evening' && tomorrowMeals.length === 0) {
    return (
      <div className="rounded-xl bg-p1-card px-4 py-4">
        <p className="text-p1-dark font-ui text-sm font-semibold mb-1">Sunday already.</p>
        <p className="text-p1-dark font-ui text-sm mb-3">
          Plan next week while it&apos;s fresh?
        </p>
        <Link
          href="/planner/generate"
          className="text-p1-terra font-ui font-semibold text-sm"
        >
          Let&apos;s plan →
        </Link>
      </div>
    )
  }

  // Hide if no meals tomorrow (and not the sunday evening case above)
  if (tomorrowMeals.length === 0) return null

  // Check for Breakfast + Dinner (elevated prep tonight card)
  const tomorrowBreakfast = tomorrowMeals.find(m => m.meal_type === 'breakfast')
  const tomorrowDinner = tomorrowMeals.find(m => m.meal_type === 'dinner')
  const hasPrepAheadDinner = tomorrowDinner ? getPrepAhead(tomorrowDinner.prep_ahead) : null

  if (tomorrowBreakfast && tomorrowDinner && hasPrepAheadDinner) {
    const prepAhead = hasPrepAheadDinner
    return (
      <div className="rounded-xl bg-p1-card px-4 py-4">
        <p className="text-p1-dark font-ui text-xs font-semibold uppercase tracking-widest opacity-60 mb-2">
          Prep tonight for tomorrow
        </p>
        <p className="text-p1-dark font-ui text-base font-bold mb-1">
          {tomorrowDinner.recipe_name}
        </p>
        <p className="text-p1-brown font-ui text-sm mb-1 leading-snug line-clamp-1">
          {prepAhead.tonight}
        </p>
        {tomorrowDinner.assembly_time_mins && (
          <p className="text-p1-brown font-ui text-xs mb-3">
            {tomorrowDinner.assembly_time_mins} min prep
          </p>
        )}
        {tomorrowDinner.recipe_id ? (
          <Link
            href={`/recipes/${tomorrowDinner.recipe_id}`}
            className="text-p1-terra font-ui text-sm font-semibold"
          >
            See prep steps →
          </Link>
        ) : (
          <Link
            href="/planner"
            className="text-p1-terra font-ui text-sm font-semibold"
          >
            See prep steps →
          </Link>
        )}
      </div>
    )
  }

  // Standard tomorrow preview
  return (
    <Link href="/planner" className="block rounded-xl bg-p1-card px-4 py-4">
      <p className="text-p1-dark font-ui text-sm font-semibold mb-2">Tomorrow</p>
      {tomorrowMeals.map(m => (
        <p key={m.id} className="text-p1-brown font-ui text-sm py-0.5">
          {getMealTypeLabel(m.meal_type)} · {m.recipe_name}
        </p>
      ))}
    </Link>
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
  const [swapMeal, setSwapMeal] = useState<MealRow | null>(null)
  const [heroMealOverride, setHeroMealOverride] = useState<MealRow | null>(null)

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
      // Clear hero override if this meal was the override
      if (heroMealOverride?.id === mealId) setHeroMealOverride(null)
    } catch {
      // allow through
    } finally {
      setMarkingCookedId(null)
    }
  }

  async function handleRemoveMeal(mealId: string) {
    try {
      await fetch('/api/meals/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: mealId }),
      })
      setMeals(prev => prev.filter(m => m.id !== mealId))
      if (heroMealOverride?.id === mealId) setHeroMealOverride(null)
    } catch {
      // allow through
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
  const timeOfDay = getTimeOfDay()
  const scenario = getScenario(meals, timeOfDay)

  // Compute hero meal — use override if set and still valid (uncooked today)
  const todayMeals = meals.filter(m => m.day === TODAY_ABBR)
  const defaultHero = getHeroMeal(todayMeals, timeOfDay)
  const heroMeal =
    heroMealOverride && todayMeals.find(m => m.id === heroMealOverride.id && !m.cooked)
      ? heroMealOverride
      : defaultHero

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

      <div className="px-5 space-y-4 pb-20">

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

        {/* ── Today card ─────────────────────────────────────────────────── */}
        <TodayCard
          meals={meals}
          scenario={scenario}
          timeOfDay={timeOfDay}
          heroMeal={heroMeal}
          markingCookedId={markingCookedId}
          onMarkCooked={handleMarkCooked}
          onRemoveMeal={handleRemoveMeal}
          onSetSwapMeal={setSwapMeal}
          onSetHeroMeal={setHeroMealOverride}
        />

        {/* ── Tomorrow preview ───────────────────────────────────────────── */}
        <TomorrowPreview meals={meals} timeOfDay={timeOfDay} />

      </div>
    </main>
  )
}
