'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KitchenSession, PrepTask, KitchenBatchOpportunity, Recipe } from '@/lib/types'
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
  ArrowLeft,
  Play,
  X,
  Flame,
  Users,
} from 'lucide-react'

// ─── task type meta ────────────────────────────────────────────────────────────

const TASK_META: Record<string, { label: string; color: string; bg: string }> = {
  passive_prep: { label: 'Passive',    color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  quick_prep:   { label: 'Quick prep', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  cook_ahead:   { label: 'Cook ahead', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  finish_only:  { label: 'Morning',    color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
}

// ─── cook mode — step-by-step ──────────────────────────────────────────────────

function CookMode({
  recipe,
  prepTasks,
  checkedTasks,
  onToggleTask,
  onExit,
}: {
  recipe: Recipe
  prepTasks: PrepTask[]
  checkedTasks: Record<number, boolean>
  onToggleTask: (i: number) => void
  onExit: () => void
}) {
  const [step, setStep] = useState(0)
  const steps = (recipe.steps ?? []) as string[]
  const tonightTasks = prepTasks.filter((t) => t.task_type !== 'finish_only')
  const totalSteps = steps.length
  const isLast = step === totalSteps - 1
  const isFirst = step === 0

  // Tasks relevant to this step — fuzzy keyword match on parallel_with vs step text
  const stepText = steps[step]?.toLowerCase() ?? ''
  const relevantTasks = tonightTasks.filter((t) => {
    if (!t.parallel_with) return false
    const pw = t.parallel_with.toLowerCase()
    // share at least one meaningful word (>4 chars)
    const words = pw.split(/\s+/).filter((w) => w.length > 4)
    return words.some((w) => stepText.includes(w))
  })
  // Tasks with no match show from step 1 onwards (contextual)
  const unmatchedTasks = tonightTasks.filter((t) => {
    if (!t.parallel_with) return true
    const pw = t.parallel_with.toLowerCase()
    const words = pw.split(/\s+/).filter((w) => w.length > 4)
    return !words.some((w) => stepText.includes(w))
  })

  const sideTasks = relevantTasks.length > 0 ? relevantTasks : (step >= 1 ? unmatchedTasks.slice(0, 2) : [])

  const checkedCount = tonightTasks.filter((_, i) => checkedTasks[i]).length

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ChefHat className="w-5 h-5 text-primary shrink-0" />
          <span className="font-semibold text-sm truncate">{recipe.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {totalSteps}
          </span>
          <button onClick={onExit} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Step card */}
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
              {step + 1}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              {recipe.cook_time_minutes
                ? `~${Math.round(recipe.cook_time_minutes / totalSteps)} min this step`
                : 'Next step'}
            </span>
          </div>
          <p className="text-base leading-relaxed">{steps[step]}</p>
        </div>

        {/* Parallel prep tasks for this step */}
        {sideTasks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              While this cooks — prep for tomorrow
            </p>
            <div className="space-y-2">
              {sideTasks.map((task, idx) => {
                // find global index in tonightTasks
                const globalIdx = tonightTasks.indexOf(task)
                const meta = TASK_META[task.task_type] ?? TASK_META.quick_prep
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      meta.bg,
                      checkedTasks[globalIdx] && 'opacity-40'
                    )}
                  >
                    <Checkbox
                      checked={checkedTasks[globalIdx] ?? false}
                      onCheckedChange={() => onToggleTask(globalIdx)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={cn('text-[10px] font-semibold uppercase tracking-wide', meta.color)}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{task.duration_minutes} min
                        </span>
                      </div>
                      <p className={cn('text-sm', checkedTasks[globalIdx] && 'line-through')}>{task.description}</p>
                      {task.parallel_with && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">↳ {task.parallel_with}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Last step: show all unchecked prep tasks */}
        {isLast && tonightTasks.filter((_, i) => !checkedTasks[i]).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">
              Remaining prep tasks before you&apos;re done
            </p>
            <div className="space-y-2">
              {tonightTasks.map((task, i) => {
                if (checkedTasks[i]) return null
                const meta = TASK_META[task.task_type] ?? TASK_META.quick_prep
                return (
                  <div key={i} className={cn('flex items-start gap-3 p-2.5 rounded-lg border', meta.bg)}>
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => onToggleTask(i)}
                      className="mt-0.5"
                    />
                    <p className="text-sm">{task.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Prep summary on last step */}
        {isLast && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-800">Dinner done!</p>
            <p className="text-sm text-green-600 mt-0.5">
              {checkedCount} of {tonightTasks.length} prep tasks completed
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 py-4 border-t bg-card shrink-0 flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          disabled={isFirst}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        {isLast ? (
          <Button className="flex-1" onClick={onExit}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Done cooking
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── prep task row ─────────────────────────────────────────────────────────────

function PrepTaskRow({ task, checked, onToggle }: {
  task: PrepTask
  checked: boolean
  onToggle: () => void
}) {
  const meta = TASK_META[task.task_type] ?? TASK_META.quick_prep
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

// ─── batch opportunity card ────────────────────────────────────────────────────

function BatchCard({ opp, decided, onAccept, onDecline }: {
  opp: KitchenBatchOpportunity
  decided: 'yes' | 'no' | null
  onAccept: () => void
  onDecline: () => void
}) {
  if (decided === 'no') return null
  if (decided === 'yes') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Added — saves {opp.saves_future_meal}!</span>
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

// ─── main page ─────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [session, setSession] = useState<KitchenSession | null>(null)
  const [dinnerRecipe, setDinnerRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cookMode, setCookMode] = useState(false)
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({})
  const [batchDecisions, setBatchDecisions] = useState<Record<number, 'yes' | 'no'>>({})

  useEffect(() => {
    fetch('/api/kitchen/session')
      .then((r) => r.json())
      .then(({ session: s }) => {
        setSession(s)
        setLoading(false)
        if (s?.dinner_recipe_id) {
          createClient()
            .from('recipes')
            .select('*')
            .eq('id', s.dinner_recipe_id)
            .single()
            .then(({ data }) => setDinnerRecipe(data as Recipe))
        }
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
        const s = data.session as KitchenSession
        setSession(s)
        setCheckedTasks({})
        setBatchDecisions({})
        if (s.dinner_recipe_id) {
          createClient()
            .from('recipes')
            .select('*')
            .eq('id', s.dinner_recipe_id)
            .single()
            .then(({ data: r }) => setDinnerRecipe(r as Recipe))
        }
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

  // ── Cook mode overlay ────────────────────────────────────────────────────────
  if (cookMode && dinnerRecipe) {
    return (
      <CookMode
        recipe={dinnerRecipe}
        prepTasks={prepTasks}
        checkedTasks={checkedTasks}
        onToggleTask={(i) => setCheckedTasks((p) => ({ ...p, [i]: !p[i] }))}
        onExit={() => setCookMode(false)}
      />
    )
  }

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

          {/* ── DINNER TONIGHT ──────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">Dinner Tonight</h2>
            </div>

            {session.dinner_recipe_name ? (
              <div className="border rounded-xl p-4 bg-card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-base">{session.dinner_recipe_name}</p>
                    {dinnerRecipe && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {dinnerRecipe.cook_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{dinnerRecipe.cook_time_minutes} min
                          </span>
                        )}
                        {dinnerRecipe.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />{dinnerRecipe.servings} servings
                          </span>
                        )}
                        {dinnerRecipe.macros_per_serving?.protein_g != null && (
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            {dinnerRecipe.macros_per_serving.protein_g}g protein
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* View recipe link */}
                  {session.dinner_recipe_id && (
                    <button
                      className="text-xs text-primary hover:underline shrink-0"
                      onClick={() => router.push(`/recipes/${session.dinner_recipe_id}`)}
                    >
                      View recipe
                    </button>
                  )}
                </div>

                {/* Ingredients preview */}
                {dinnerRecipe?.ingredients && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{dinnerRecipe.ingredients.length} ingredients: </span>
                    {(dinnerRecipe.ingredients as Array<{ name: string }>)
                      .slice(0, 5)
                      .map((i) => i.name)
                      .join(', ')}
                    {dinnerRecipe.ingredients.length > 5 && ` +${dinnerRecipe.ingredients.length - 5} more`}
                  </div>
                )}

                {/* Start cooking button */}
                {dinnerRecipe && (
                  <Button className="w-full mt-1" onClick={() => setCookMode(true)}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Cooking — Step by Step
                  </Button>
                )}

                {!dinnerRecipe && (
                  <p className="text-xs text-muted-foreground animate-pulse">Loading recipe…</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No dinner planned — eating out tonight.</p>
            )}
          </section>

          <Separator />

          {/* ── PREP FOR TOMORROW ────────────────────────────────────────── */}
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
              <p className="text-sm text-muted-foreground italic">
                No prep needed — everything&apos;s quick in the morning.
              </p>
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

            {tonightTasks.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{checkedCount} of {tonightTasks.length} tasks done</span>
                  {checkedCount === tonightTasks.length && (
                    <span className="text-green-600 font-medium">All done!</span>
                  )}
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${tonightTasks.length ? (checkedCount / tonightTasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tomorrow finish steps */}
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

          {/* ── BATCH OPPORTUNITIES ──────────────────────────────────────── */}
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

          {/* ── MORNING CTA ──────────────────────────────────────────────── */}
          {session.brunch_recipe_name && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">See tomorrow&apos;s morning view</p>
                  <p className="text-xs text-muted-foreground">Just the finish steps + a done button</p>
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
