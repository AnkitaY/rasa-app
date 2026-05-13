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

const MEAL_TYPE_ORDER = ['breakfast', 'brunch', 'lunch', 'dinner']

const TODAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrepAheadNew {
  tonight: string
  tomorrow: string
}

interface MealWithRecipe {
  id: string
  day: string
  meal_type: 'breakfast' | 'brunch' | 'lunch' | 'dinner'
  recipe_name: string
  reasoning: string | null
  cooked: boolean
  cooked_at: string | null
  verdict: 'loved' | 'ok' | 'skip' | null
  use_soon_priority: boolean
  recipe_id: string | null
  prep_ahead: unknown
  assembly_time_mins: number | null
  cook_time_minutes: number | null
  removed?: boolean
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

function getPrepAhead(raw: unknown): PrepAheadNew | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const pa = raw as Record<string, unknown>
  if (typeof pa.tonight === 'string' && typeof pa.tomorrow === 'string') {
    return { tonight: pa.tonight, tomorrow: pa.tomorrow }
  }
  return null
}

function sectionLabel(mealType: string): string {
  if (mealType === 'dinner') return 'DINNERS THIS WEEK'
  if (mealType === 'brunch' || mealType === 'breakfast') return 'BREAKFAST THIS WEEK'
  return `${mealType.toUpperCase()} THIS WEEK`
}

// Day-of = today or past (within the same week)
function isDayOf(mealDay: string): boolean {
  return (DAY_ORDER[mealDay] ?? 99) <= (DAY_ORDER[TODAY_ABBR] ?? 0)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const [meals, setMeals] = useState<MealWithRecipe[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlanMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [swapMeal, setSwapMeal] = useState<MealWithRecipe | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const anonId = getAnonId()
        const res = await fetch(`/api/meals/current?anon_id=${encodeURIComponent(anonId)}`)
        const { week_plan, meals: raw } = await res.json()
        setWeekPlan(week_plan ?? null)
        const sorted = (raw ?? []).sort(
          (a: MealWithRecipe, b: MealWithRecipe) =>
            (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99)
        )
        setMeals(sorted)
      } catch {
        // allow through
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleRemove(meal: MealWithRecipe) {
    if (removingId) return
    setRemovingId(meal.id)
    try {
      const res = await fetch('/api/meals/remove', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: meal.id }),
      })
      if (!res.ok) throw new Error()
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, removed: true } : m))
    } catch {
      showToast('Hmm, something went wrong. Try again?')
    } finally {
      setRemovingId(null)
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────

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

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!weekPlan || meals.length === 0) {
    return (
      <main className="min-h-screen bg-p1-cream flex flex-col">
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-ui font-bold text-p1-dark">This Week</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32 text-center gap-5">
          <span className="text-5xl">📅</span>
          <div>
            <p className="text-base font-ui font-semibold text-p1-dark">Nothing planned yet</p>
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

  // Group all meals by meal_type (including removed — shown as empty slots)
  const mealsByType: Record<string, MealWithRecipe[]> = {}
  for (const m of meals) {
    if (!mealsByType[m.meal_type]) mealsByType[m.meal_type] = []
    mealsByType[m.meal_type].push(m)
  }
  const orderedTypes = MEAL_TYPE_ORDER.filter(t => mealsByType[t]?.length > 0)

  // ── Main view ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-p1-cream">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-p1-dark text-white text-sm font-ui font-medium px-5 py-3 rounded-2xl shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <h1 className="text-2xl font-ui font-bold text-p1-dark">This Week</h1>
        {weekPlan.week_start_date && (
          <p className="mt-0.5 text-sm text-p1-brown font-ui">
            {formatDateRange(weekPlan.week_start_date)}
          </p>
        )}
      </div>

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
            showToast('Plan updated.')
          }}
        />
      )}

      {/* Meal sections */}
      <div className="px-5 pb-10 space-y-8">
        {orderedTypes.map(mealType => {
          const typeMeals = mealsByType[mealType]

          return (
            <div key={mealType}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-p1-border" />
                <p className="text-[11px] font-ui font-bold text-p1-brown uppercase tracking-widest whitespace-nowrap">
                  {sectionLabel(mealType)}
                </p>
                <div className="h-px flex-1 bg-p1-border" />
              </div>

              {/* Cards for this type */}
              <div className="space-y-3">
                {typeMeals.map(meal => {
                  const prepAhead = getPrepAhead(meal.prep_ahead)
                  const isPrepAheadMeal = !!prepAhead
                  const dayOf = isDayOf(meal.day)
                  const isToday = meal.day === TODAY_ABBR

                  // ── Removed (empty slot) ─────────────────────────────
                  if (meal.removed) {
                    return (
                      <div
                        key={meal.id}
                        className="rounded-2xl bg-p1-surface px-4 py-4"
                      >
                        <p className="text-[11px] font-ui font-semibold text-p1-brown uppercase tracking-wider mb-1">
                          {DAY_LABELS[meal.day] ?? meal.day}
                        </p>
                        <p className="text-sm font-ui text-p1-brown">
                          Available — nothing planned here
                        </p>
                      </div>
                    )
                  }

                  // ── Cooked card ───────────────────────────────────────
                  if (meal.cooked) {
                    return (
                      <div
                        key={meal.id}
                        className="rounded-2xl bg-p1-forest-lt border border-p1-forest/20 px-4 py-4"
                      >
                        <p className="text-[11px] font-ui font-semibold text-p1-forest uppercase tracking-wider mb-1">
                          {DAY_LABELS[meal.day] ?? meal.day}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-ui font-semibold text-p1-forest leading-snug">
                            {meal.recipe_name}
                          </p>
                          <span className="text-xs font-ui text-p1-forest">✓ cooked</span>
                        </div>
                      </div>
                    )
                  }

                  // ── Active card — prep-ahead ──────────────────────────
                  if (isPrepAheadMeal) {
                    const subtitle = dayOf
                      ? `This morning: ${prepAhead.tomorrow}`
                      : `Prep tonight: ${prepAhead.tonight}`

                    return (
                      <div
                        key={meal.id}
                        className={cn(
                          'rounded-2xl bg-p1-card shadow-sm overflow-hidden',
                          isToday && 'border-l-[3px] border-p1-terra'
                        )}
                      >
                        <div className="px-4 pt-4 pb-3">
                          <p className={cn(
                            'text-[11px] font-ui font-semibold uppercase tracking-wider mb-1',
                            isToday ? 'text-p1-terra' : 'text-p1-brown'
                          )}>
                            {DAY_LABELS[meal.day] ?? meal.day}
                          </p>
                          <p className="text-base font-ui font-bold text-p1-dark leading-snug">
                            {meal.recipe_name}
                          </p>
                          <p className="mt-1.5 text-sm font-ui text-p1-brown leading-relaxed">
                            {subtitle}
                          </p>
                          {meal.assembly_time_mins && (
                            <p className="mt-1 text-xs font-ui text-p1-brown">
                              Assemble in {meal.assembly_time_mins} min
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 px-4 pb-4">
                          <button
                            onClick={() => setSwapMeal(meal)}
                            className="flex-1 py-2.5 rounded-xl border border-p1-border bg-p1-card text-xs font-ui font-medium text-p1-dark active:opacity-70"
                          >
                            Swap
                          </button>
                          <button
                            onClick={() => handleRemove(meal)}
                            disabled={removingId === meal.id}
                            className="flex-1 py-2.5 rounded-xl border border-p1-border bg-p1-card text-xs font-ui font-medium text-p1-dark active:opacity-70 disabled:opacity-50"
                          >
                            {removingId === meal.id ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )
                  }

                  // ── Active card — non-prep-ahead ──────────────────────
                  return (
                    <div
                      key={meal.id}
                      className={cn(
                        'rounded-2xl bg-p1-card shadow-sm overflow-hidden',
                        meal.use_soon_priority && 'border-l-[3px] border-p1-terra'
                      )}
                    >
                      <div className="px-4 pt-4 pb-3">
                        <p className={cn(
                          'text-[11px] font-ui font-semibold uppercase tracking-wider mb-1',
                          isToday ? 'text-p1-terra' : 'text-p1-brown'
                        )}>
                          {DAY_LABELS[meal.day] ?? meal.day}
                        </p>
                        <p className="text-base font-ui font-bold text-p1-dark leading-snug">
                          {meal.recipe_name}
                        </p>
                        {meal.reasoning && (
                          <p className="mt-1.5 text-sm font-ui text-p1-brown italic leading-relaxed">
                            {meal.reasoning}
                          </p>
                        )}
                        {meal.cook_time_minutes && (
                          <p className="mt-1 text-xs font-ui text-p1-brown">
                            {meal.cook_time_minutes} min
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-4 pb-4">
                        <button
                          onClick={() => setSwapMeal(meal)}
                          className="flex-1 py-2.5 rounded-xl border border-p1-border bg-p1-card text-xs font-ui font-medium text-p1-dark active:opacity-70"
                        >
                          Swap
                        </button>
                        <button
                          onClick={() => handleRemove(meal)}
                          disabled={removingId === meal.id}
                          className="flex-1 py-2.5 rounded-xl border border-p1-border bg-p1-card text-xs font-ui font-medium text-p1-dark active:opacity-70 disabled:opacity-50"
                        >
                          {removingId === meal.id ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
