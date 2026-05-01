'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KitchenSession, PrepTask, KitchenBatchOpportunity } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  ChefHat,
  Clock,
  Sparkles,
  Sun,
  Layers,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'

const TASK_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  passive_prep:  { label: 'Passive',    color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  quick_prep:    { label: 'Quick prep', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  cook_ahead:    { label: 'Cook ahead', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  finish_only:   { label: 'Morning',    color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
}

function PrepTaskRow({
  task,
  checked,
  onToggle,
}: {
  task: PrepTask
  checked: boolean
  onToggle: () => void
}) {
  const meta = TASK_TYPE_META[task.task_type] ?? TASK_TYPE_META.quick_prep
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border', meta.bg, checked && 'opacity-50')}>
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', meta.color)}>{meta.label}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="w-3 h-3" />{task.duration_minutes} min
          </span>
        </div>
        <p className={cn('text-sm', checked && 'line-through text-muted-foreground')}>{task.description}</p>
        {task.parallel_with && (
          <p className="text-[11px] text-muted-foreground mt-0.5 italic">↳ {task.parallel_with}</p>
        )}
      </div>
    </div>
  )
}

function BatchCard({
  opp,
  onAccept,
  onDecline,
  decided,
}: {
  opp: KitchenBatchOpportunity
  onAccept: () => void
  onDecline: () => void
  decided: 'yes' | 'no' | null
}) {
  if (decided === 'no') return null
  if (decided === 'yes') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Added to tonight&apos;s plan — saves {opp.saves_future_meal}!</span>
      </div>
    )
  }
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Layers className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">{opp.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            +{opp.extra_time_minutes} min · saves <span className="font-medium">{opp.saves_future_meal}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept}>Yes, I&apos;ll do it</Button>
        <Button size="sm" variant="ghost" onClick={onDecline}>No thanks</Button>
      </div>
    </div>
  )
}

export default function KitchenPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [session, setSession] = useState<KitchenSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({})
  const [batchDecisions, setBatchDecisions] = useState<Record<number, 'yes' | 'no'>>({})

  useEffect(() => {
    fetch('/api/kitchen/session')
      .then((r) => r.json())
      .then(({ session: s }) => {
        setSession(s)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleGenerate() {
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/kitchen/session', { method: 'POST' })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to generate session'); return }
        setSession(data.session)
        setCheckedTasks({})
        setBatchDecisions({})
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  const prepTasks = session?.prep_tasks ?? []
  const finishSteps = session?.tomorrow_finish_steps ?? []
  const batchOpps = session?.batch_opportunities ?? []

  const tonightTasks = prepTasks.filter((t) => t.task_type !== 'finish_only')
  const checkedCount = tonightTasks.filter((_, i) => checkedTasks[i]).length
  const allDone = tonightTasks.length > 0 && checkedCount === tonightTasks.length

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Tonight&apos;s Kitchen</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={isPending}>
          {isPending ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Planning…</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />{session ? 'Replan' : 'Plan Tonight'}</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !session && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <ChefHat className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No session yet</h2>
          <p className="text-muted-foreground max-w-xs">
            Hit &ldquo;Plan Tonight&rdquo; to get tonight&apos;s dinner and tomorrow&apos;s prep mapped out.
          </p>
        </div>
      )}

      {session && (
        <div className="space-y-6">

          {/* ── DINNER TONIGHT ────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Dinner Tonight</h2>
            </div>
            {session.dinner_recipe_name ? (
              <div className="border rounded-lg px-4 py-3 bg-card">
                <p className="font-semibold">{session.dinner_recipe_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Cook time from your recipe card
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No dinner planned — eating out tonight.</p>
            )}
          </section>

          <Separator />

          {/* ── PREP FOR TOMORROW ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wide">Prep for Tomorrow</h2>
              </div>
              {session.brunch_recipe_name && (
                <span className="text-xs text-muted-foreground">{session.brunch_recipe_name}</span>
              )}
            </div>

            {session.session_duration_minutes && (
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <Clock className="w-3 h-3" /> ~{session.session_duration_minutes} min total kitchen time tonight
              </p>
            )}

            {tonightTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No prep needed — everything&apos;s quick in the morning.</p>
            ) : (
              <div className="space-y-2">
                {tonightTasks.map((task, i) => (
                  <PrepTaskRow
                    key={i}
                    task={task}
                    checked={checkedTasks[i] ?? false}
                    onToggle={() => setCheckedTasks((p) => ({ ...p, [i]: !p[i] }))}
                  />
                ))}
              </div>
            )}

            {/* Progress */}
            {tonightTasks.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{checkedCount} of {tonightTasks.length} tasks done</span>
                  {allDone && <span className="text-green-600 font-medium">All done!</span>}
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${tonightTasks.length ? (checkedCount / tonightTasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tomorrow's finish steps */}
            {finishSteps.length > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5" /> Tomorrow morning — just {finishSteps.length} step{finishSteps.length !== 1 ? 's' : ''}
                </p>
                <ol className="space-y-1">
                  {finishSteps.map((step, i) => (
                    <li key={i} className="text-sm text-green-800 flex gap-2">
                      <span className="text-green-500 shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* ── BATCH OPPORTUNITIES ───────────────────────────────────── */}
          {batchOpps.length > 0 && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide">Batch Opportunity</h2>
                </div>
                <div className="space-y-3">
                  {batchOpps.map((opp, i) => (
                    <BatchCard
                      key={i}
                      opp={opp}
                      decided={batchDecisions[i] ?? null}
                      onAccept={() => setBatchDecisions((p) => ({ ...p, [i]: 'yes' }))}
                      onDecline={() => setBatchDecisions((p) => ({ ...p, [i]: 'no' }))}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── MORNING CTA ───────────────────────────────────────────── */}
          {session.brunch_recipe_name && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">See tomorrow&apos;s morning view</p>
                  <p className="text-xs text-muted-foreground">Just the finish steps, macros, and a done button</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/kitchen/morning')}>
                  Morning View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </>
          )}

        </div>
      )}
    </main>
  )
}
