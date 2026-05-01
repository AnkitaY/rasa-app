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
  if (protein >= 70) return 'text-green-600'
  if (protein >= 55) return 'text-yellow-600'
  return 'text-red-500'
}

function proteinBg(protein: number): string {
  if (protein >= 70) return 'bg-green-50 border-green-200'
  if (protein >= 55) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function getSlot(slots: PlanSlot[], day: string, meal: 'brunch' | 'dinner'): PlanSlot | undefined {
  return slots.find((s) => s.day === day && s.meal_type === meal)
}

function getDailyTotal(totals: DailyTotal[], day: string): DailyTotal | undefined {
  return totals.find((t) => t.day === day)
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
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Swap {slot.day} {slot.meal_type}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Currently: <span className="font-medium text-foreground">{slot.eating_out ? 'Eating Out' : (slot.recipe_name || 'Empty')}</span>
          </p>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap pt-1">
          <Button
            variant={slot.locked ? 'default' : 'outline'}
            size="sm"
            onClick={() => { onLock(slot); onClose() }}
          >
            {slot.locked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
            {slot.locked ? 'Locked' : 'Lock slot'}
          </Button>
          <Button
            variant={slot.eating_out ? 'default' : 'outline'}
            size="sm"
            onClick={() => { onEatingOut(slot); onClose() }}
          >
            <UtensilsCrossed className="w-3 h-3 mr-1" />
            Eating out
          </Button>
        </div>

        <div className="border-t pt-3 -mx-4 px-4 overflow-y-auto flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Recipe Bank
          </p>
          {recipes.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No recipes yet.</p>
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
                  'w-full text-left rounded-lg px-3 py-2.5 transition-colors hover:bg-accent flex items-center justify-between gap-3 group',
                  isActive && 'bg-accent'
                )}
              >
                <div>
                  <p className="text-sm font-medium leading-tight">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.cuisine_type?.replace('_', ' ')} · {r.meal_type}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-xs font-semibold', proteinColor(protein))}>{protein}g P</p>
                  <p className="text-xs text-muted-foreground">{carbs}g C</p>
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

  function handleSwap(slot: PlanSlot, recipeId: string | null, recipeName: string, protein: number, carbs: number) {
    const updated = slots.map((s) =>
      s.day === slot.day && s.meal_type === slot.meal_type
        ? { ...s, recipe_id: recipeId, recipe_name: recipeName, protein_g: protein, carbs_g: carbs, eating_out: false }
        : s
    )
    setSlots(updated)
    setDailyTotals(recomputeDailyTotals(updated))
  }

  function handleLock(slot: PlanSlot) {
    setSlots((prev) =>
      prev.map((s) =>
        s.day === slot.day && s.meal_type === slot.meal_type ? { ...s, locked: !s.locked } : s
      )
    )
  }

  function handleEatingOut(slot: PlanSlot) {
    const updated = slots.map((s) =>
      s.day === slot.day && s.meal_type === slot.meal_type
        ? { ...s, eating_out: !s.eating_out, recipe_id: null, recipe_name: 'Eating Out', protein_g: 0, carbs_g: 0 }
        : s
    )
    setSlots(updated)
    setDailyTotals(recomputeDailyTotals(updated))
  }

  const hasLockedSlots = slots.some((s) => s.locked || s.eating_out)

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Weekly Planner</h1>
            {plan && (
              <p className="text-xs text-muted-foreground">
                Week of {new Date(plan.week_start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={isPending}>
          {isPending ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Planning…</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />{plan ? (hasLockedSlots ? 'Regenerate (keeping locks)' : 'Regenerate Plan') : 'Generate Week Plan'}</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Skeleton / empty state */}
      {loadingPlan ? (
        <div className="grid grid-cols-8 gap-2 animate-pulse">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <CalendarDays className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No plan yet</h2>
          <p className="text-muted-foreground max-w-xs">
            {recipes.length === 0
              ? 'Add recipes to your recipe bank first, then generate a plan.'
              : 'Hit Generate to build your 7-day meal plan.'}
          </p>
        </div>
      ) : (
        <>
          {/* 7-day grid — scrollable on mobile */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="min-w-[640px]">
              {/* Day headers */}
              <div className="grid grid-cols-8 gap-1.5 mb-1.5">
                <div /> {/* row label spacer */}
                {DAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Meal rows */}
              {MEAL_TYPES.map((meal) => (
                <div key={meal} className="grid grid-cols-8 gap-1.5 mb-1.5">
                  {/* Row label */}
                  <div className="flex items-center justify-end pr-2">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{meal}</span>
                  </div>

                  {/* Cells */}
                  {DAYS.map((day) => {
                    const slot = getSlot(slots, day, meal)
                    const isEmpty = !slot
                    const isEatingOut = slot?.eating_out
                    const isLocked = slot?.locked

                    return (
                      <button
                        key={day}
                        onClick={() => setSwapSlot(slot ?? { day, meal_type: meal, recipe_id: null, recipe_name: '', protein_g: 0, carbs_g: 0 })}
                        className={cn(
                          'relative rounded-lg border px-2 py-2 text-left transition-all hover:shadow-sm hover:border-primary/40 min-h-[72px] w-full',
                          isEmpty && 'border-dashed border-muted-foreground/30 bg-muted/30',
                          isEatingOut && 'bg-orange-50 border-orange-200',
                          !isEmpty && !isEatingOut && 'bg-card border-border',
                        )}
                      >
                        {isLocked && (
                          <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-muted-foreground" />
                        )}
                        {isEmpty ? (
                          <span className="text-xs text-muted-foreground/50">Empty</span>
                        ) : isEatingOut ? (
                          <div className="flex flex-col gap-0.5">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500 mb-0.5" />
                            <span className="text-xs font-medium text-orange-700 leading-tight">Eating Out</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-medium leading-tight line-clamp-2">{slot?.recipe_name}</p>
                            <div className="flex gap-1.5 mt-auto pt-1">
                              <span className={cn('text-[10px] font-semibold', proteinColor(slot?.protein_g ?? 0))}>
                                {slot?.protein_g ?? 0}P
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {slot?.carbs_g ?? 0}C
                              </span>
                            </div>
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
                  <Flame className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                {DAYS.map((day) => {
                  const total = getDailyTotal(dailyTotals, day)
                  const protein = total?.total_protein ?? 0
                  const carbs = total?.total_carbs ?? 0
                  return (
                    <div key={day} className={cn('rounded-lg border px-2 py-1.5 text-center', proteinBg(protein))}>
                      <p className={cn('text-xs font-bold', proteinColor(protein))}>{protein}g P</p>
                      <p className="text-[10px] text-muted-foreground">{carbs}g C</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />≥70g protein</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />55–69g protein</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />&lt;55g protein</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Locked slot</span>
          </div>

          {/* Batch cook opportunities */}
          {batchNotes.length > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-2">Batch Cook Opportunities</p>
                <ul className="space-y-1">
                  {batchNotes.map((note, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
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
