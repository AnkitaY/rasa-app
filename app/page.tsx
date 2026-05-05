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

function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="h-1.5 bg-rasa-stone rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── skeleton ──────────────────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-rasa-stone rounded-lg w-52" />
      <div className="h-4 bg-rasa-stone rounded w-36" />
      <div className="h-7 bg-rasa-stone rounded-full w-full" />
      <div className="h-28 bg-rasa-stone rounded-2xl" />
      <div className="h-24 bg-rasa-stone rounded-2xl" />
    </div>
  )
}

// ─── week day strip ────────────────────────────────────────────────────────────

function WeekStrip() {
  const today = new Date().getDay() // 0=Sun
  // Mon–Sun order
  const ordered = [1, 2, 3, 4, 5, 6, 0]
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="flex gap-1.5">
      {ordered.map((dayNum, i) => {
        const isToday = dayNum === today
        const isPast = dayNum !== today && (
          today === 0
            ? dayNum !== 0
            : dayNum < today && dayNum !== 0
        )
        return (
          <div
            key={i}
            className={`flex-1 flex flex-col items-center gap-1`}
          >
            <span className={`text-[10px] font-display font-semibold uppercase tracking-wide ${isToday ? 'text-rasa-slate' : 'text-muted-foreground'}`}>
              {labels[i]}
            </span>
            <div
              className={`h-1.5 w-full rounded-full transition-all ${
                isToday
                  ? 'bg-rasa-slate'
                  : isPast
                  ? 'bg-rasa-fern/60'
                  : 'bg-rasa-stone'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── meal row ──────────────────────────────────────────────────────────────────

function MealRow({ label, slot }: { label: string; slot: PlanSlot | undefined }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-widest w-14 shrink-0">{label}</span>
        {slot ? (
          slot.eating_out ? (
            <span className="text-sm text-muted-foreground italic font-display">Eating out</span>
          ) : (
            <span className="text-sm font-display font-semibold truncate text-rasa-ink">{slot.recipe_name}</span>
          )
        ) : (
          <span className="text-sm text-muted-foreground italic font-display">Not planned</span>
        )}
      </div>
      {slot && !slot.eating_out && slot.protein_g > 0 && (
        <span className="text-xs text-rasa-fern font-bold shrink-0 ml-2 font-code">{slot.protein_g}g</span>
      )}
    </div>
  )
}

// ─── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, colorClass }: { label: string; value: number; unit: string; colorClass: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-rasa-mist border border-rasa-stone px-3 py-3 space-y-1">
      <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-xl font-serif font-bold leading-none ${colorClass}`}>
        {value}<span className="text-xs font-display font-normal text-muted-foreground ml-0.5">{unit}</span>
      </p>
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

  const proteinColorClass = protein >= PROTEIN_TARGET
    ? 'text-rasa-fern'
    : protein >= PROTEIN_TARGET * 0.8
    ? 'text-yellow-600'
    : 'text-rasa-terra'

  const proteinBarClass = protein >= PROTEIN_TARGET
    ? 'bg-rasa-fern'
    : protein >= PROTEIN_TARGET * 0.8
    ? 'bg-yellow-400'
    : 'bg-rasa-terra'

  return (
    <main className="min-h-screen bg-background px-4 pt-10 pb-4 max-w-2xl mx-auto">
      {loading ? (
        <HomeSkeleton />
      ) : (
        <div className="space-y-5">

          {/* ── Greeting ───────────────────────────────────────────────── */}
          <div>
            <h1 className="font-serif text-3xl font-bold text-rasa-ink leading-tight">
              {greeting()} 👋
            </h1>
            <p className="text-sm font-display text-muted-foreground mt-1">{todayLabel()}</p>
          </div>

          {/* ── Week progress strip ────────────────────────────────────── */}
          <WeekStrip />

          {/* ── Macro summary card ─────────────────────────────────────── */}
          {hasPlan ? (
            <>
              {/* Stat cards row */}
              <div className="flex gap-3">
                <StatCard
                  label="Protein"
                  value={protein}
                  unit={`/ ${PROTEIN_TARGET}g`}
                  colorClass={proteinColorClass}
                />
                <StatCard
                  label="Carbs"
                  value={carbs}
                  unit={`/ ${CARBS_TARGET}g`}
                  colorClass="text-rasa-slate"
                />
              </div>

              {/* Macro progress bars */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-display font-semibold text-muted-foreground">Protein</span>
                    <span className={`text-xs font-code font-semibold ${proteinColorClass}`}>
                      {protein}g <span className="font-normal text-muted-foreground">/ {PROTEIN_TARGET}g</span>
                    </span>
                  </div>
                  <ProgressBar value={protein} max={PROTEIN_TARGET} colorClass={proteinBarClass} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-display font-semibold text-muted-foreground">Carbs</span>
                    <span className="text-xs font-code font-semibold text-rasa-slate">
                      {carbs}g <span className="font-normal text-muted-foreground">/ {CARBS_TARGET}g</span>
                    </span>
                  </div>
                  <ProgressBar value={carbs} max={CARBS_TARGET} colorClass="bg-rasa-slate/60" />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-rasa-stone bg-rasa-mist px-4 py-5 text-center space-y-2">
              <p className="text-sm font-display font-semibold text-rasa-ink">No plan for this week yet</p>
              <button
                className="text-sm font-display font-bold text-rasa-slate hover:underline"
                onClick={() => router.push('/planner')}
              >
                Generate week plan →
              </button>
            </div>
          )}

          {/* ── Tonight card ───────────────────────────────────────────── */}
          {hasPlan && (
            <div className="rounded-2xl border border-rasa-stone bg-rasa-oat overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
                  Tonight
                </p>
                <button
                  className="text-xs font-display font-bold text-rasa-slate hover:underline"
                  onClick={() => router.push('/planner')}
                >
                  Full plan →
                </button>
              </div>
              <div className="divide-y divide-rasa-stone px-4 pb-3">
                <MealRow label="Brunch" slot={brunch} />
                <MealRow label="Dinner" slot={dinner} />
              </div>
            </div>
          )}

          {/* ── Kitchen card ───────────────────────────────────────────── */}
          <KitchenHomeCard />

          {/* ── Quick actions ──────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Quick Actions
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex flex-col gap-1 h-auto py-3 text-xs font-display font-semibold border-rasa-stone hover:border-rasa-slate hover:bg-rasa-mist"
                onClick={() => router.push('/inventory/update')}
              >
                <Package className="w-5 h-5" />
                Update Fridge
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-1 h-auto py-3 text-xs font-display font-semibold border-rasa-stone hover:border-rasa-slate hover:bg-rasa-mist"
                onClick={() => router.push('/recipes/add/generate')}
              >
                <Plus className="w-5 h-5" />
                Add Recipe
              </Button>
              <Button
                variant="outline"
                className="flex flex-col gap-1 h-auto py-3 text-xs font-display font-semibold border-rasa-stone hover:border-rasa-slate hover:bg-rasa-mist"
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
              className="w-full flex items-center justify-center gap-2 text-xs font-display text-muted-foreground hover:text-rasa-slate py-2 transition-colors"
              onClick={() => router.push('/shopping')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              View / regenerate shopping list
            </button>
          )}

          {/* ── Empty state CTA ────────────────────────────────────────── */}
          {!hasPlan && (
            <div className="text-center py-4">
              <p className="text-xs font-display text-muted-foreground">
                Start by adding recipes to your bank, then generate a week plan.
              </p>
            </div>
          )}

        </div>
      )}
    </main>
  )
}
