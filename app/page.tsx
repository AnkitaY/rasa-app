'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlanSlot, DailyTotal } from '@/lib/types'
import KitchenHomeCard from './components/KitchenHomeCard'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus, CalendarDays, Package } from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const PROTEIN_TARGET = 70
const CARBS_TARGET = 80
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── helpers ──────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

// ─── progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── skeleton ──────────────────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="h-4 bg-muted rounded w-32" />
      <div className="h-28 bg-muted rounded-xl" />
      <div className="h-24 bg-muted rounded-xl" />
      <div className="h-20 bg-muted rounded-xl" />
    </div>
  )
}

// ─── meal row ──────────────────────────────────────────────────────────────────

function MealRow({ label, slot }: { label: string; slot: PlanSlot | undefined }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-14 shrink-0">{label}</span>
        {slot ? (
          slot.eating_out ? (
            <span className="text-sm text-muted-foreground italic">Eating out</span>
          ) : (
            <span className="text-sm font-medium truncate">{slot.recipe_name}</span>
          )
        ) : (
          <span className="text-sm text-muted-foreground italic">Not planned</span>
        )}
      </div>
      {slot && !slot.eating_out && slot.protein_g > 0 && (
        <span className="text-xs text-orange-500 font-semibold shrink-0 ml-2">{slot.protein_g}g</span>
      )}
    </div>
  )
}

// ─── main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<PlanSlot[]>([])
  const [dailyTotal, setDailyTotal] = useState<DailyTotal | null>(null)

  useEffect(() => {
    const todayAbbr = DAY_ABBR[new Date().getDay()]

    createClient()
      .from('week_plans')
      .select('slots')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.slots) {
          const stored = data.slots as { slots: PlanSlot[]; daily_totals?: DailyTotal[] }
          const allSlots: PlanSlot[] = stored.slots ?? []
          const todaySlots = allSlots.filter((s) => s.day === todayAbbr)
          setSlots(todaySlots)

          const totals: DailyTotal[] = stored.daily_totals ?? []
          const todayTotal = totals.find((t) => t.day === todayAbbr) ?? null
          setDailyTotal(todayTotal)
        }
        setLoading(false)
      })
  }, [])

  const brunch = slots.find((s) => s.meal_type === 'brunch')
  const dinner = slots.find((s) => s.meal_type === 'dinner')
  const protein = dailyTotal?.total_protein ?? 0
  const carbs = dailyTotal?.total_carbs ?? 0
  const hasPlan = slots.length > 0

  return (
    <main className="min-h-screen bg-background px-4 pt-8 pb-4 max-w-2xl mx-auto">
      {loading ? (
        <HomeSkeleton />
      ) : (
        <div className="space-y-4">

          {/* ── Greeting ───────────────────────────────────────────────── */}
          <div>
            <h1 className="text-2xl font-bold">{greeting()} 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{todayLabel()}</p>
          </div>

          {/* ── Macro summary card ─────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Today&apos;s Macros
            </p>

            {hasPlan ? (
              <>
                {/* Protein */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium">Protein</span>
                    <span className={`text-sm font-bold ${protein >= PROTEIN_TARGET ? 'text-green-600' : protein >= PROTEIN_TARGET * 0.8 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {protein}g <span className="text-xs font-normal text-muted-foreground">/ {PROTEIN_TARGET}g</span>
                    </span>
                  </div>
                  <ProgressBar
                    value={protein}
                    max={PROTEIN_TARGET}
                    color={protein >= PROTEIN_TARGET ? 'bg-green-500' : protein >= PROTEIN_TARGET * 0.8 ? 'bg-yellow-400' : 'bg-red-400'}
                  />
                </div>

                {/* Carbs */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium">Carbs</span>
                    <span className="text-sm font-bold text-blue-600">
                      {carbs}g <span className="text-xs font-normal text-muted-foreground">/ {CARBS_TARGET}g</span>
                    </span>
                  </div>
                  <ProgressBar value={carbs} max={CARBS_TARGET} color="bg-blue-400" />
                </div>

                {dailyTotal?.target_met && (
                  <p className="text-xs text-green-600 font-medium">✓ Protein target met today</p>
                )}
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">No plan for this week yet.</p>
                <button
                  className="text-sm text-primary font-medium mt-1 hover:underline"
                  onClick={() => router.push('/planner')}
                >
                  Generate week plan →
                </button>
              </div>
            )}
          </div>

          {/* ── Today's meals card ─────────────────────────────────────── */}
          {hasPlan && (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Today&apos;s Meals
                </p>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => router.push('/planner')}
                >
                  Full plan →
                </button>
              </div>
              <div className="divide-y">
                <MealRow label="Brunch" slot={brunch} />
                <MealRow label="Dinner" slot={dinner} />
              </div>
            </div>
          )}

          {/* ── Tonight's Kitchen card ─────────────────────────────────── */}
          <KitchenHomeCard />

          {/* ── Quick actions ──────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Quick Actions
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex flex-col gap-1 h-auto py-3 text-xs"
                onClick={() => router.push('/inventory/update')}
              >
                <Package className="w-5 h-5" />
                Update Fridge
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-1 h-auto py-3 text-xs"
                onClick={() => router.push('/recipes/add/generate')}
              >
                <Plus className="w-5 h-5" />
                Add Recipe
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-1 h-auto py-3 text-xs"
                onClick={() => router.push('/planner')}
              >
                <CalendarDays className="w-5 h-5" />
                Week Plan
              </Button>
            </div>
          </div>

          {/* ── Regenerate shopping nudge ──────────────────────────────── */}
          {hasPlan && (
            <button
              className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              onClick={() => router.push('/shopping')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              View / regenerate shopping list
            </button>
          )}

        </div>
      )}
    </main>
  )
}
