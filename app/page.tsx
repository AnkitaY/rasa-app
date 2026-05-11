'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { getAnonId } from '@/lib/anon'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TODAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

// ── Types ─────────────────────────────────────────────────────────────────────

interface MealRow {
  id: string
  day: string
  recipe_name: string
  cooked: boolean
  cooked_at: string | null
  verdict: 'loved' | 'ok' | 'skip' | null
  verdict_shown: boolean
  use_soon_priority: boolean
  recipe_id: string | null
}

interface TonightRecipe {
  cook_time_minutes: number | null
  servings: number | null
  prep_ahead: { task: string; time_sensitive: boolean }[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [meals, setMeals] = useState<MealRow[]>([])
  const [tonightRecipe, setTonightRecipe] = useState<TonightRecipe | null>(null)
  const [feedbackDismissed, setFeedbackDismissed] = useState(false)
  const [verdictSent, setVerdictSent] = useState(false)
  const [sendingVerdict, setSendingVerdict] = useState(false)

  useEffect(() => {
    const anonId = getAnonId()

    fetch(`/api/meals/current?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(async ({ meals: raw }) => {
        const list: MealRow[] = raw ?? []
        setMeals(list)

        // Fetch recipe details for tonight's meal
        const tonight = list.find(m => m.day === TODAY_ABBR && !m.cooked)
        if (tonight?.recipe_id) {
          const res = await fetch(`/api/recipes/${encodeURIComponent(tonight.recipe_id)}`)
          if (res.ok) {
            const { recipe } = await res.json()
            if (recipe) setTonightRecipe(recipe)
          }
        }
      })
      .catch(() => {/* allow through */})
      .finally(() => setLoading(false))
  }, [])

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
      // Update local state
      setMeals(prev =>
        prev.map(m =>
          m.id === mealId
            ? { ...m, verdict: (verdict as MealRow['verdict']) ?? m.verdict, verdict_shown: true }
            : m
        )
      )
    } catch {
      /* allow through */
    } finally {
      setSendingVerdict(false)
    }
  }

  if (loading) return <SkeletonHome />

  // Derive display data
  const tonightMeal = meals.find(m => m.day === TODAY_ABBR && !m.cooked) ?? null
  const hasPlan = meals.length > 0

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

  // Build a meal-status map for the week strip
  const mealByDay: Record<string, MealRow> = {}
  for (const m of meals) mealByDay[m.day] = m

  // Time-sensitive prep note for hero card
  const prepNote =
    tonightRecipe?.prep_ahead?.find(p => p.time_sensitive)?.task ?? null

  return (
    <main className="min-h-screen bg-p1-cream">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-widest">
            {greeting()}
          </p>
          <h1 className="text-xl font-ui font-bold text-p1-dark mt-0.5">
            {hasPlan ? 'Here\'s your week' : 'Ready to plan?'}
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
          {tonightMeal ? (
            <>
              <div>
                <p className="text-[11px] font-ui font-semibold uppercase tracking-widest text-white/70 mb-2">
                  What&apos;s cooking tonight
                </p>
                <h2 className="text-xl font-ui font-bold text-white leading-snug">
                  {tonightMeal.recipe_name}
                </h2>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-2">
                  {tonightRecipe?.cook_time_minutes && (
                    <span className="text-xs font-ui text-white/80">
                      ⏱ {tonightRecipe.cook_time_minutes} min
                    </span>
                  )}
                  {tonightRecipe?.servings && (
                    <span className="text-xs font-ui text-white/80">
                      🍽 Serves {tonightRecipe.servings}
                    </span>
                  )}
                  {tonightMeal.use_soon_priority && (
                    <span className="text-[10px] font-ui font-semibold uppercase tracking-wider text-white/60">
                      · Use soon
                    </span>
                  )}
                </div>

                {/* Prep-ahead note */}
                {prepNote && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-white/15">
                    <p className="text-[11px] font-ui text-white/90 leading-relaxed">
                      ⏰ Prep ahead: {prepNote}
                    </p>
                  </div>
                )}
              </div>

              {/* CTA buttons */}
              <div className="flex gap-2.5 mt-5">
                {tonightMeal.recipe_id ? (
                  <>
                    <Link
                      href={`/cook/${tonightMeal.recipe_id}`}
                      className="flex-1 py-3 rounded-xl bg-white text-p1-terra text-sm font-ui font-bold text-center active:opacity-80"
                    >
                      Let&apos;s cook →
                    </Link>
                    <Link
                      href={`/recipes/${tonightMeal.recipe_id}`}
                      className="flex-1 py-3 rounded-xl bg-white/20 text-white text-sm font-ui font-semibold text-center active:opacity-80"
                    >
                      View full recipe
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/planner"
                    className="flex-1 py-3 rounded-xl bg-white/20 text-white text-sm font-ui font-semibold text-center active:opacity-80"
                  >
                    View plan
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-ui font-semibold uppercase tracking-widest text-white/70 mb-2">
                  Tonight
                </p>
                <h2 className="text-xl font-ui font-bold text-white">
                  {hasPlan
                    ? 'Nothing on the plan tonight'
                    : 'Nothing planned right now'}
                </h2>
                <p className="text-sm font-ui text-white/70 mt-1">
                  {hasPlan
                    ? 'Free night — enjoy the break.'
                    : 'Tell us what\'s in the kitchen and we\'ll sort the week.'}
                </p>
              </div>
              <Link
                href="/planner/generate"
                className="mt-5 block py-3 rounded-xl bg-white text-p1-terra text-sm font-ui font-bold text-center active:opacity-80"
              >
                {hasPlan ? 'Add to plan →' : 'Plan my week →'}
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
                    {/* Status dot */}
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

        {/* ── Quick actions (no plan state) ──────────────────────────────── */}
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
