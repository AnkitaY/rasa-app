'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Recipe, WeekPlan, PlanSlot, DailyTotal } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  CalendarDays,
  RefreshCw,
  Lock,
  Unlock,
  UtensilsCrossed,
  AlertCircle,
  Flame,
} from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEAL_TYPES: Array<'brunch' | 'dinner'> = ['brunch', 'dinner']

// ─── helpers ──────────────────────────────────────────────────────────────────

function proteinColor(protein: number): string {
  if (protein >= 70) return 'text-rasa-fern'
  if (protein >= 55) return 'text-yellow-600'
  return 'text-rasa-terra'
}

function proteinBg(protein: number): string {
  if (protein >= 70) return 'bg-rasa-sprout border-rasa-fern/30'
  if (protein >= 55) return 'bg-yellow-50 border-yellow-200'
  return 'bg-orange-50 border-orange-200'
}

function getSlot(slots: PlanSlot[], day: string, meal: 'brunch' | 'dinner'): PlanSlot | undefined {
  return slots.find((s) => s.day === day && s.meal_type === meal)
}

function getDailyTotal(totals: DailyTotal[], day: string): DailyTotal | undefined {
  return totals.find((t) => t.day === day)
}

// Today's day abbreviation
function todayAbbr(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
}

// ─── swap modal ───────────────────────────────────────────────────────────────

interface SwapModalProps {
  open: boolean
  slot: PlanSlot | null
  recipes: Recipe[]
  onClose: () => void
  onSwap: (slot: PlanSlot, recipeId: string | null, recipeName: string, protein: number, carbs: number) => void
  onLock: (slot: PlanSlot) => void
  onEatingOut: (slot: PlanSlot) => void
}

function SwapModal({ open, slot, recipes, onClose, onSwap, onLock, onEatingOut }: SwapModalProps) {
  if (!slot) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col bg-rasa-oat">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-rasa-ink">
            Swap {slot.day} {slot.meal_type}
          </DialogTitle>
          <p className="text-sm font-display text-muted-foreground">
            Currently: <span className="font-semibold text-rasa-ink">{slot.eating_out ? 'Eating Out' : (slot.recipe_name || 'Empty')}</span>
          </p>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap pt-1">
          <Button
            variant={slot.locked ? 'default' : 'outline'}
            size="sm"
            className="font-display font-semibold"
            onClick={() => { onLock(slot); onClose() }}
          >
            {slot.locked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
            {slot.locked ? 'Locked' : 'Lock slot'}
          </Button>
          <Button
            variant={slot.eating_out ? 'default' : 'outline'}
            size="sm"
            className="font-display font-semibold"
            onClick={() => { onEatingOut(slot); onClose() }}
          >
            <UtensilsCrossed className="w-3 h-3 mr-1" />
            Eating out
          </Button>
        </div>

        <div className="border-t border-rasa-stone pt-3 -mx-4 px-4 overflow-y-auto flex-1 space-y-1">
          <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Recipe Bank
          </p>
          {recipes.length === 0 && (
            <p className="text-sm font-display text-muted-foreground py-4 text-center">No recipes yet.</p>
          )}
          {recipes.map((r) => {
            const protein = r.macros_per_serving?.protein_g ?? 0
            const carbs = r.macros_per_serving?.carbs_g ?? 0
            const isActive = r.id === slot.recipe_id
            return (
              <button
                key={r.id}
                onClick={() => { onSwap(slot, r.id, r.name, protein, carbs); onClose() }}
                className={cn(
                  'w-full text-left rounded-xl px-3 py-2.5 transition-colors hover:bg-rasa-mist flex items-center justify-between gap-3',
                  isActive && 'bg-rasa-mist border border-rasa-stone'
                )}
              >
                <div>
                  <p className="text-sm font-display font-semibold leading-tight text-rasa-ink">{r.name}</p>
                  <p className="text-xs font-display text-muted-foreground mt-0.5">
                    {r.cuisine_type?.replace('_', ' ')} · {r.meal_type}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-xs font-code font-semibold', proteinColor(protein))}>{protein}g P</p>
                  <p className="text-xs font-code text-muted-foreground">{carbs}g C</p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const [isPending, startTransition] = useTransition()
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [slots, setSlots] = useState<PlanSlot[]>([])
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([])
  const [batchNotes, setBatchNotes] = useState<string[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [swapSlot, setSwapSlot] = useState<PlanSlot | null>(null)
  const [error, setError] = useState('')
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [activeDay, setActiveDay] = useState<string>(todayAbbr())

  // Load recipes and latest plan on mount
  useEffect(() => {
    const supabase = createClient()

    Promise.all([
      supabase.from('recipes').select('*').order('created_at', { ascending: false }),
      supabase
        .from('week_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([recipesRes, planRes]) => {
      setRecipes((recipesRes.data as Recipe[]) ?? [])

      if (planRes.data) {
        const wp = planRes.data as WeekPlan
        setPlan(wp)
        const stored = wp.slots as unknown as { slots: PlanSlot[]; daily_totals: DailyTotal[]; batch_opportunities: Array<{ description: string }> }
        setSlots(stored.slots ?? [])
        setDailyTotals(stored.daily_totals ?? [])
        setBatchNotes((stored.batch_opportunities ?? []).map((b) => b.description))
      }
      setLoadingPlan(false)
    })
  }, [])

  function recomputeDailyTotals(updatedSlots: PlanSlot[]) {
    return DAYS.map((day) => {
      const daySlots = updatedSlots.filter((s) => s.day === day && !s.eating_out)
      const total_protein = daySlots.reduce((sum, s) => sum + (s.protein_g ?? 0), 0)
      const total_carbs = daySlots.reduce((sum, s) => sum + (s.carbs_g ?? 0), 0)
      return { day, total_protein, total_carbs, target_met: total_protein >= 70 }
    })
  }

  async function handleGenerate() {
    setError('')
    const lockedSlots = slots
      .filter((s) => s.locked || s.eating_out)
      .map((s) => ({ day: s.day, meal_type: s.meal_type }))

    startTransition(async () => {
      try {
        const res = await fetch('/api/plans/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locked_slots: lockedSlots }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to generate plan'); return }

        const wp = data.plan as WeekPlan
        setPlan(wp)
        const stored = wp.slots as unknown as { slots: PlanSlot[]; daily_totals: DailyTotal[]; batch_opportunities: Array<{ description: string }> }
        const newSlots = stored.slots ?? []
        setSlots(newSlots)
        setDailyTotals(stored.daily_totals ?? recomputeDailyTotals(newSlots))
        setBatchNotes((stored.batch_opportunities ?? []).map((b) => b.description))
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  async function persistSlots(updatedSlots: PlanSlot[], updatedTotals: DailyTotal[]) {
    if (!plan) return
    try {
      await fetch('/api/plans/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          slots: updatedSlots,
          daily_totals: updatedTotals,
          batch_opportunities: batchNotes.map((d) => ({ description: d })),
        }),
      })
    } catch {
      // Non-blocking — UI already updated; silent fail is acceptable
    }
  }

  function handleSwap(slot: PlanSlot, recipeId: string | null, recipeName: string, protein: number, carbs: number) {
    const updated = slots.map((s) =>
      s.day === slot.day && s.meal_type === slot.meal_type
        ? { ...s, recipe_id: recipeId, recipe_name: recipeName, protein_g: protein, carbs_g: carbs, eating_out: false }
        : s
    )
    const updatedTotals = recomputeDailyTotals(updated)
    setSlots(updated)
    setDailyTotals(updatedTotals)
    persistSlots(updated, updatedTotals)
  }

  function handleLock(slot: PlanSlot) {
    const updated = slots.map((s) =>
      s.day === slot.day && s.meal_type === slot.meal_type ? { ...s, locked: !s.locked } : s
    )
    const updatedTotals = recomputeDailyTotals(updated)
    setSlots(updated)
    setDailyTotals(updatedTotals)
    persistSlots(updated, updatedTotals)
  }

  function handleEatingOut(slot: PlanSlot) {
    const updated = slots.map((s) =>
      s.day === slot.day && s.meal_type === slot.meal_type
        ? { ...s, eating_out: !s.eating_out, recipe_id: null, recipe_name: 'Eating Out', protein_g: 0, carbs_g: 0 }
        : s
    )
    const updatedTotals = recomputeDailyTotals(updated)
    setSlots(updated)
    setDailyTotals(updatedTotals)
    persistSlots(updated, updatedTotals)
  }

  const hasLockedSlots = slots.some((s) => s.locked || s.eating_out)
  const today = todayAbbr()
  const activeDayTotal = getDailyTotal(dailyTotals, activeDay)

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-rasa-slate" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-rasa-ink">Weekly Planner</h1>
            {plan && (
              <p className="text-xs font-display text-muted-foreground">
                Week of {new Date(plan.week_start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={isPending} className="font-display font-semibold">
          {isPending ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Planning…</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />{plan ? (hasLockedSlots ? 'Regenerate (keeping locks)' : 'Regenerate Plan') : 'Generate Week Plan'}</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Skeleton / empty state */}
      {loadingPlan ? (
        <div className="space-y-3 animate-pulse">
          <div className="flex gap-2">
            {DAYS.map((d) => <div key={d} className="flex-1 h-10 bg-rasa-stone rounded-full" />)}
          </div>
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-16 bg-rasa-stone rounded-xl" />
            ))}
          </div>
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <CalendarDays className="w-14 h-14 text-muted-foreground" />
          <h2 className="font-serif text-xl font-bold text-rasa-ink">No plan yet</h2>
          <p className="font-display text-sm text-muted-foreground max-w-xs">
            {recipes.length === 0
              ? 'Add recipes to your recipe bank first, then generate a plan.'
              : 'Hit Generate to build your 7-day meal plan.'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Day-strip pills ───────────────────────────────────────── */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {DAYS.map((day) => {
              const total = getDailyTotal(dailyTotals, day)
              const protein = total?.total_protein ?? 0
              const isActive = day === activeDay
              const isToday = day === today
              const dotColor = protein >= 70
                ? 'bg-rasa-fern'
                : protein >= 55
                ? 'bg-yellow-400'
                : slots.some((s) => s.day === day)
                ? 'bg-rasa-terra'
                : 'bg-rasa-stone'

              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all min-w-[3rem] shrink-0',
                    isActive
                      ? 'bg-rasa-slate text-white'
                      : 'bg-rasa-mist text-muted-foreground hover:bg-rasa-stone'
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-display font-bold uppercase tracking-wide',
                    isToday && !isActive && 'text-rasa-fern'
                  )}>
                    {day}
                  </span>
                  <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-white/60' : dotColor)} />
                </button>
              )
            })}
          </div>

          {/* ── Active day protein summary ─────────────────────────────── */}
          {activeDayTotal && (
            <div className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2 mb-4 text-sm font-display',
              proteinBg(activeDayTotal.total_protein)
            )}>
              <Flame className={cn('w-4 h-4', proteinColor(activeDayTotal.total_protein))} />
              <span className={cn('font-bold', proteinColor(activeDayTotal.total_protein))}>
                {activeDayTotal.total_protein}g protein
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{activeDayTotal.total_carbs}g carbs</span>
              {activeDayTotal.target_met && (
                <span className="ml-auto text-xs text-rasa-fern font-semibold">✓ target met</span>
              )}
            </div>
          )}

          {/* ── Meal slots for active day ─────────────────────────────── */}
          <div className="space-y-2 mb-6">
            {MEAL_TYPES.map((meal) => {
              const slot = getSlot(slots, activeDay, meal)
              const isEmpty = !slot
              const isEatingOut = slot?.eating_out
              const isLocked = slot?.locked

              return (
                <button
                  key={meal}
                  onClick={() => setSwapSlot(slot ?? { day: activeDay, meal_type: meal, recipe_id: null, recipe_name: '', protein_g: 0, carbs_g: 0 })}
                  className={cn(
                    'w-full text-left rounded-2xl border px-4 py-3.5 transition-all hover:shadow-sm',
                    isEmpty && 'border-dashed border-rasa-stone bg-rasa-mist/50',
                    isEatingOut && 'bg-orange-50 border-orange-200',
                    !isEmpty && !isEatingOut && 'bg-rasa-oat border-rasa-stone hover:border-rasa-slate/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground mb-1 capitalize">
                        {meal}
                      </p>
                      {isEmpty ? (
                        <p className="text-sm font-display text-muted-foreground/60">Tap to add a meal</p>
                      ) : isEatingOut ? (
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-display font-semibold text-orange-700">Eating Out</span>
                        </div>
                      ) : (
                        <p className="text-sm font-display font-semibold text-rasa-ink leading-snug">{slot?.recipe_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                      {slot && !slot.eating_out && (
                        <>
                          <span className={cn('text-xs font-code font-bold', proteinColor(slot.protein_g ?? 0))}>
                            {slot.protein_g ?? 0}g P
                          </span>
                          <span className="text-[10px] font-code text-muted-foreground">
                            {slot.carbs_g ?? 0}g C
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Full week overview (compact grid) ─────────────────────── */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-display font-bold text-muted-foreground uppercase tracking-widest mb-3 select-none list-none flex items-center gap-2">
              <span className="group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
              Full week overview
            </summary>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[560px]">
                {/* Day headers */}
                <div className="grid grid-cols-8 gap-1.5 mb-1.5">
                  <div />
                  {DAYS.map((day) => (
                    <div key={day} className={cn(
                      'text-center text-[10px] font-display font-bold uppercase tracking-wide py-1 rounded-md',
                      day === today ? 'text-rasa-fern' : 'text-muted-foreground'
                    )}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Meal rows */}
                {MEAL_TYPES.map((meal) => (
                  <div key={meal} className="grid grid-cols-8 gap-1.5 mb-1.5">
                    <div className="flex items-center justify-end pr-2">
                      <span className="text-[10px] font-display font-semibold text-muted-foreground capitalize">{meal}</span>
                    </div>
                    {DAYS.map((day) => {
                      const slot = getSlot(slots, day, meal)
                      const isEmpty = !slot
                      const isEatingOut = slot?.eating_out
                      return (
                        <button
                          key={day}
                          onClick={() => { setActiveDay(day); setSwapSlot(slot ?? { day, meal_type: meal, recipe_id: null, recipe_name: '', protein_g: 0, carbs_g: 0 }) }}
                          className={cn(
                            'relative rounded-lg border px-1.5 py-2 text-left transition-all hover:shadow-sm min-h-[60px] w-full',
                            isEmpty && 'border-dashed border-rasa-stone/60 bg-rasa-mist/30',
                            isEatingOut && 'bg-orange-50 border-orange-200',
                            !isEmpty && !isEatingOut && 'bg-rasa-oat border-rasa-stone',
                            day === activeDay && 'ring-1 ring-rasa-slate'
                          )}
                        >
                          {slot?.locked && <Lock className="absolute top-1 right-1 w-2.5 h-2.5 text-muted-foreground" />}
                          {isEmpty ? null : isEatingOut ? (
                            <UtensilsCrossed className="w-3 h-3 text-orange-500" />
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[9px] font-display font-semibold leading-tight line-clamp-2 text-rasa-ink">{slot?.recipe_name}</p>
                              <span className={cn('text-[9px] font-code font-bold', proteinColor(slot?.protein_g ?? 0))}>
                                {slot?.protein_g ?? 0}P
                              </span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}

                {/* Daily protein totals row */}
                <div className="grid grid-cols-8 gap-1.5 mt-1">
                  <div className="flex items-center justify-end pr-2">
                    <Flame className="w-3 h-3 text-muted-foreground" />
                  </div>
                  {DAYS.map((day) => {
                    const total = getDailyTotal(dailyTotals, day)
                    const protein = total?.total_protein ?? 0
                    return (
                      <div key={day} className={cn('rounded-lg border px-1 py-1 text-center', proteinBg(protein))}>
                        <p className={cn('text-[9px] font-code font-bold', proteinColor(protein))}>{protein}P</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs font-display text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rasa-fern inline-block" />≥70g protein</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />55–69g</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rasa-terra inline-block" />&lt;55g</span>
            </div>
          </details>

          {/* Batch cook opportunities */}
          {batchNotes.length > 0 && (
            <Card className="mt-6 bg-rasa-mist border-rasa-stone">
              <CardContent className="pt-4">
                <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-3">Batch Cook Opportunities</p>
                <ul className="space-y-1.5">
                  {batchNotes.map((note, i) => (
                    <li key={i} className="text-sm font-display text-rasa-ink flex items-start gap-2">
                      <span className="text-rasa-fern mt-0.5">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Swap Modal */}
      <SwapModal
        open={swapSlot !== null}
        slot={swapSlot}
        recipes={recipes}
        onClose={() => setSwapSlot(null)}
        onSwap={handleSwap}
        onLock={handleLock}
        onEatingOut={handleEatingOut}
      />
    </main>
  )
}
