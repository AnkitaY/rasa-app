'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAnonId } from '@/lib/anon'
import { cn } from '@/lib/utils'
import SwapSheet from '@/app/components/SwapSheet'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_ORDER: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
}

const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

const TODAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

const VERDICT_LABELS: Record<string, string> = {
  loved: 'Everyone loved it 🙌',
  ok: 'It was fine 🤷',
  skip: 'Won\'t make again',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MealWithRecipe {
  id: string
  day: string
  recipe_name: string
  reasoning: string | null
  cooked: boolean
  cooked_at: string | null
  verdict: 'loved' | 'ok' | 'skip' | null
  use_soon_priority: boolean
  recipe_id: string | null
}

interface WeekPlanMeta {
  id: string
  week_start_date: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const [meals, setMeals] = useState<MealWithRecipe[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlanMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [cookingId, setCookingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [swapMeal, setSwapMeal] = useState<MealWithRecipe | null>(null)

  useEffect(() => {
    const anonId = getAnonId()
    fetch(`/api/meals/current?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ week_plan, meals: raw }) => {
        setWeekPlan(week_plan ?? null)
        const sorted = (raw ?? []).sort(
          (a: MealWithRecipe, b: MealWithRecipe) =>
            (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)
        )
        setMeals(sorted)
      })
      .catch(() => {/* allow through */})
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleMarkCooked(meal: MealWithRecipe) {
    if (meal.cooked || cookingId) return
    setCookingId(meal.id)

    try {
      const res = await fetch('/api/meals/cooked', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: meal.id }),
      })
      if (!res.ok) throw new Error()

      // Optimistic update
      setMeals(prev =>
        prev.map(m =>
          m.id === meal.id
            ? { ...m, cooked: true, cooked_at: new Date().toISOString() }
            : m
        )
      )
      showToast('Nice work. Dinner\'s done. 🍽')
    } catch {
      showToast('Hmm, something went wrong. Try again?')
    } finally {
      setCookingId(null)
    }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-p1-cream">
        <div className="px-5 pt-12 pb-6">
          <div className="h-7 bg-p1-surface rounded-lg w-32 animate-pulse" />
          <div className="h-4 bg-p1-surface rounded w-40 mt-2 animate-pulse" />
        </div>
        <div className="px-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-p1-surface rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (!weekPlan || meals.length === 0) {
    return (
      <main className="min-h-screen bg-p1-cream flex flex-col">
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-ui font-bold text-p1-dark">This Week</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32 text-center gap-5">
          <span className="text-5xl">📅</span>
          <div>
            <p className="text-base font-ui font-semibold text-p1-dark">
              Nothing planned yet
            </p>
            <p className="text-sm text-p1-brown font-ui mt-1">
              Your recipe bank fills up the moment you plan your first week.
            </p>
          </div>
          <Link
            href="/planner/generate"
            className="px-6 py-3.5 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold"
          >
            Plan my week →
          </Link>
        </div>
      </main>
    )
  }

  const uncooked = meals.filter(m => !m.cooked)

  // ── Main view ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-p1-cream">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-p1-dark text-white text-sm font-ui font-medium px-5 py-3 rounded-2xl shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-ui font-bold text-p1-dark">This Week</h1>
          {weekPlan.week_start_date && (
            <p className="mt-0.5 text-sm text-p1-brown font-ui">
              {formatDateRange(weekPlan.week_start_date)}
            </p>
          )}
        </div>
        {uncooked.length > 0 && (
          <Link
            href="/planner/generate?mode=regen"
            className="text-xs font-ui font-medium text-p1-terra pt-1.5"
          >
            Rethink remaining →
          </Link>
        )}
      </div>

      {/* Swap sheet */}
      {swapMeal && (
        <SwapSheet
          meal={swapMeal}
          open={!!swapMeal}
          onClose={() => setSwapMeal(null)}
          onSwapped={newName => {
            setMeals(prev =>
              prev.map(m =>
                m.id === swapMeal.id
                  ? { ...m, recipe_name: newName, swapped_from: m.recipe_name }
                  : m
              )
            )
            setSwapMeal(null)
            showToast('Done — plan updated. 🔄')
          }}
        />
      )}

      {/* Meal cards */}
      <div className="px-5 space-y-3 pb-10">
        {meals.map(meal => {
          const isToday = meal.day === TODAY_ABBR
          const isCooking = cookingId === meal.id

          if (meal.cooked) {
            // ── Cooked card ─────────────────────────────────────────────────
            return (
              <div
                key={meal.id}
                className="rounded-2xl bg-p1-forest-lt border border-p1-forest/20 px-4 py-4"
              >
                <p className="text-[11px] font-ui font-semibold text-p1-forest uppercase tracking-wider mb-1">
                  {DAY_LABELS[meal.day] ?? meal.day} · Cooked ✓
                </p>
                <p className="text-base font-ui font-semibold text-p1-forest leading-snug">
                  {meal.recipe_name}
                </p>
                {meal.verdict && (
                  <p className="mt-1.5 text-xs font-ui text-p1-forest/70">
                    {VERDICT_LABELS[meal.verdict] ?? meal.verdict}
                  </p>
                )}
              </div>
            )
          }

          // ── Active card ───────────────────────────────────────────────────
          return (
            <div
              key={meal.id}
              className={cn(
                'rounded-2xl bg-p1-card shadow-sm overflow-hidden',
                meal.use_soon_priority && 'border-l-[3px] border-p1-terra'
              )}
            >
              <div className="px-4 pt-4 pb-3">
                {/* Day label */}
                <p className={cn(
                  'text-[11px] font-ui font-semibold uppercase tracking-wider mb-1',
                  isToday ? 'text-p1-terra' : 'text-p1-brown'
                )}>
                  {isToday ? 'Tonight — ' : ''}{DAY_LABELS[meal.day] ?? meal.day}
                  {meal.use_soon_priority && (
                    <span className="ml-1.5 text-p1-terra">· Use soon</span>
                  )}
                </p>

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

              {/* Action row */}
              <div className="flex items-center gap-2 px-4 pb-4">
                <button
                  onClick={() => handleMarkCooked(meal)}
                  disabled={!!cookingId}
                  className="flex-1 py-2.5 rounded-xl bg-p1-terra text-white text-xs font-ui font-semibold tracking-wide disabled:opacity-50 transition-opacity active:opacity-80"
                >
                  {isCooking ? 'Saving…' : 'Mark as cooked'}
                </button>

                <button
                  onClick={() => setSwapMeal(meal)}
                  className="px-4 py-2.5 rounded-xl border border-p1-border bg-p1-card text-xs font-ui font-medium text-p1-dark active:opacity-70"
                >
                  Swap
                </button>

                {/* Recipe link */}
                {meal.recipe_id && (
                  <Link
                    href={`/recipes/${meal.recipe_id}`}
                    className="px-4 py-2.5 rounded-xl border border-p1-border bg-p1-card text-xs font-ui font-medium text-p1-dark active:opacity-70"
                  >
                    Recipe
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
