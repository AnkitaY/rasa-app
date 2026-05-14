'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAnonId } from '@/lib/anon'
import SwapSheet from '@/app/components/SwapSheet'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']

// ── Types ─────────────────────────────────────────────────────────────────────

interface MealWithRecipe {
  id: string
  day: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
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

// Slot key = "Mon-dinner"
type SlotKey = string

interface GeneratingSlot {
  loading: boolean
  error: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

function slotKey(day: string, mealType: string): SlotKey {
  return `${day}-${mealType}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Day header status ─────────────────────────────────────────────────────────

function dayHeaderRight(dayMeals: MealWithRecipe[]): string | null {
  const active = dayMeals.filter(m => !m.removed)
  if (active.length === 0) return null
  const cooked = active.filter(m => m.cooked)
  if (cooked.length === active.length) return 'All done ✓'
  if (cooked.length > 0) return `${cooked.length} of ${active.length} cooked`
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const router = useRouter()
  const [meals, setMeals] = useState<MealWithRecipe[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlanMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [swapMeal, setSwapMeal] = useState<MealWithRecipe | null>(null)
  const [generatingSlots, setGeneratingSlots] = useState<Record<SlotKey, GeneratingSlot>>({})

  useEffect(() => {
    async function load() {
      try {
        const anonId = getAnonId()
        const res = await fetch(`/api/meals/current?anon_id=${encodeURIComponent(anonId)}`)
        const { week_plan, meals: raw } = await res.json()
        setWeekPlan(week_plan ?? null)
        setMeals(raw ?? [])
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

  async function handleMarkCooked(meal: MealWithRecipe) {
    try {
      const res = await fetch('/api/meals/cooked', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: meal.id }),
      })
      if (!res.ok) throw new Error()
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, cooked: true, cooked_at: new Date().toISOString() } : m))
    } catch {
      showToast('Couldn&apos;t mark as cooked. Try again?')
    }
  }

  async function handleGenerateSingle(day: string, mealType: string) {
    if (!weekPlan) return
    const key = slotKey(day, mealType)
    setGeneratingSlots(prev => ({ ...prev, [key]: { loading: true, error: false } }))
    try {
      const anonId = getAnonId()
      const res = await fetch('/api/meals/generate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id: anonId,
          week_plan_id: weekPlan.id,
          day,
          meal_type: mealType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const newMeal: MealWithRecipe = data.meal
      setMeals(prev => [...prev, newMeal])
      setGeneratingSlots(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch {
      setGeneratingSlots(prev => ({ ...prev, [key]: { loading: false, error: true } }))
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
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="h-9 bg-p1-terra/40 animate-pulse mb-3" />
              <div className="px-4 space-y-3">
                <div className="h-28 bg-p1-surface rounded-xl animate-pulse" />
                <div className="h-28 bg-p1-surface rounded-xl animate-pulse" />
              </div>
            </div>
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

  // ── Compute which days/slots to show ─────────────────────────────────────

  // Build a set of [day × meal_type] slots that had at least one meal
  const knownSlots = new Set<SlotKey>()
  for (const m of meals) {
    knownSlots.add(slotKey(m.day, m.meal_type))
  }

  // Days that have at least one known slot
  const activeDays = ALL_DAYS.filter(day =>
    MEAL_TYPE_ORDER.some(mt => knownSlots.has(slotKey(day, mt)))
  )

  // Index meals by slot key
  const mealBySlot: Record<SlotKey, MealWithRecipe[]> = {}
  for (const m of meals) {
    const key = slotKey(m.day, m.meal_type)
    if (!mealBySlot[key]) mealBySlot[key] = []
    mealBySlot[key].push(m)
  }

  // ── Main view ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-p1-cream pb-12">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-p1-dark text-white text-sm font-ui font-medium px-5 py-3 rounded-2xl shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Page header */}
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
          isPrepAhead={false}
          isToday={false}
          onSwapped={newName => {
            setMeals(prev =>
              prev.map(m => m.id === swapMeal.id ? { ...m, recipe_name: newName } : m)
            )
            setSwapMeal(null)
            showToast('Plan updated.')
          }}
        />
      )}

      {/* Day sections */}
      <div>
        {activeDays.map(day => {
          const dayMeals = meals.filter(m => m.day === day && !m.removed)
          const rightLabel = dayHeaderRight(dayMeals)
          const slotsForDay = MEAL_TYPE_ORDER.filter(mt => knownSlots.has(slotKey(day, mt)))

          return (
            <div key={day} className="mb-4">
              {/* Full-bleed day header */}
              <div className="bg-p1-terra flex items-center justify-between px-4 py-2 mb-3">
                <span className="text-base font-ui font-bold text-white">
                  {DAY_LABELS[day]}
                </span>
                {rightLabel && (
                  <span className="text-xs text-white font-ui">{rightLabel}</span>
                )}
              </div>

              {/* Cards */}
              <div className="px-4 space-y-3">
                {slotsForDay.map(mealType => {
                  const key = slotKey(day, mealType)
                  const slotMeals = mealBySlot[key] ?? []
                  const activeMeal = slotMeals.find(m => !m.removed)
                  const genState = generatingSlots[key]

                  // ── In-place generation in progress ─────────────────────
                  if (genState?.loading) {
                    return (
                      <div
                        key={key}
                        className="rounded-xl bg-p1-surface border border-p1-border px-4 py-4 min-h-[80px]"
                      >
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-p1-surface border border-p1-border mb-2">
                          <span className="text-xs text-p1-brown font-ui">{capitalize(mealType)}</span>
                        </div>
                        <p className="text-sm text-p1-brown font-ui mb-3">
                          Finding something for {DAY_LABELS[day]} {capitalize(mealType)}…
                        </p>
                        <div className="space-y-2">
                          <div className="h-3 bg-p1-surface rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-p1-surface rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    )
                  }

                  // ── Generation error ─────────────────────────────────────
                  if (genState?.error) {
                    return (
                      <div
                        key={key}
                        className="rounded-xl bg-p1-surface border border-dashed border-p1-border px-4 py-4 min-h-[80px]"
                      >
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-p1-surface border border-p1-border mb-2">
                          <span className="text-xs text-p1-brown font-ui">{capitalize(mealType)}</span>
                        </div>
                        <p className="text-sm text-p1-brown font-ui">
                          Couldn&apos;t find something — try again?{' '}
                          <button
                            onClick={() => handleGenerateSingle(day, mealType)}
                            className="text-p1-terra underline"
                          >
                            Try again
                          </button>
                        </p>
                      </div>
                    )
                  }

                  // ── Empty slot ───────────────────────────────────────────
                  if (!activeMeal) {
                    return (
                      <button
                        key={key}
                        onClick={() => handleGenerateSingle(day, mealType)}
                        className="w-full text-left rounded-xl bg-p1-surface border border-dashed border-p1-border px-4 py-4 min-h-[80px] flex flex-col"
                      >
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-p1-surface border border-p1-border mb-2 self-start">
                          <span className="text-xs text-p1-brown font-ui">{capitalize(mealType)}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-sm text-p1-brown font-ui">+ Add a meal</span>
                        </div>
                      </button>
                    )
                  }

                  // ── Cooked card ──────────────────────────────────────────
                  if (activeMeal.cooked) {
                    return (
                      <div
                        key={key}
                        className="rounded-xl px-4 py-4"
                        style={{ backgroundColor: '#E2EDE6' }}
                      >
                        {/* Meta row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/50">
                            <span className="text-xs text-p1-brown font-ui">{capitalize(mealType)}</span>
                          </div>
                          {activeMeal.cook_time_minutes && (
                            <span className="text-xs text-p1-brown font-ui">{activeMeal.cook_time_minutes} min</span>
                          )}
                        </div>

                        <p className="font-serif-display text-base font-semibold text-p1-forest leading-snug mb-1">
                          {activeMeal.recipe_name}
                        </p>

                        <span className="text-xs text-p1-forest font-ui">✓ Cooked</span>
                      </div>
                    )
                  }

                  // ── Active (uncooked) card ────────────────────────────────
                  return (
                    <div
                      key={key}
                      className="relative rounded-xl bg-p1-card ring-1 ring-foreground/10 px-4 py-4 cursor-pointer active:opacity-90"
                      onClick={() => {
                        if (activeMeal.recipe_id) {
                          router.push(`/recipes/${activeMeal.recipe_id}`)
                        }
                      }}
                    >
                      {/* ✕ Skip button */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleRemove(activeMeal)
                        }}
                        disabled={removingId === activeMeal.id}
                        aria-label="Skip this meal"
                        className="absolute top-3 right-3 w-[26px] h-[26px] rounded-full bg-p1-cream flex items-center justify-center text-p1-brown disabled:opacity-50"
                      >
                        <span className="text-xs leading-none">✕</span>
                      </button>

                      {/* Meta row: chip + time */}
                      <div className="flex items-center justify-between mb-2 pr-8">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-p1-surface">
                          <span className="text-xs text-p1-brown font-ui">{capitalize(mealType)}</span>
                        </div>
                        {activeMeal.cook_time_minutes && (
                          <span className="text-xs text-p1-brown font-ui">{activeMeal.cook_time_minutes} min</span>
                        )}
                      </div>

                      {/* Recipe name */}
                      <p className="font-serif-display text-xl font-bold text-p1-dark leading-snug mb-1">
                        {activeMeal.recipe_name}
                      </p>

                      {/* Subtitle / reasoning */}
                      {activeMeal.reasoning && (
                        <p className="text-sm text-p1-brown font-ui mb-3 leading-relaxed">
                          {activeMeal.reasoning}
                        </p>
                      )}

                      {/* Action row */}
                      <div className="flex items-center gap-2 mt-3">
                        {/* Start Cooking */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (activeMeal.recipe_id) {
                              router.push(`/cook/${activeMeal.recipe_id}`)
                            }
                          }}
                          className="flex-1 h-[38px] rounded-lg bg-p1-terra text-white text-sm font-ui font-semibold"
                        >
                          Start Cooking
                        </button>

                        {/* Swap */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setSwapMeal(activeMeal)
                          }}
                          aria-label="Swap recipe"
                          className="w-[38px] h-[38px] rounded-lg border border-p1-border bg-p1-card flex items-center justify-center text-p1-brown text-base shrink-0"
                        >
                          ⇄
                        </button>
                      </div>

                      {/* Checkbox row */}
                      <div className="flex flex-col items-start mt-3">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleMarkCooked(activeMeal)
                          }}
                          className="flex flex-col items-center gap-0.5"
                          aria-label="Mark as cooked"
                        >
                          <div className="w-7 h-7 rounded-md border border-p1-border bg-p1-card flex items-center justify-center">
                            {/* empty checkbox */}
                          </div>
                          <span className="text-xs text-p1-brown font-ui">Cooked</span>
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
