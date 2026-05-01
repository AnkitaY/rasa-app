'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KitchenSession } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Sun,
  Clock,
  CheckCircle2,
  Flame,
  AlertCircle,
  ChefHat,
  ArrowLeft,
} from 'lucide-react'


export default function MorningPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [session, setSession] = useState<KitchenSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/kitchen/session')
      .then((r) => r.json())
      .then(({ session: s }) => {
        setSession(s)
        if (s?.brunch_done) setDone(true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleMarkDone() {
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/kitchen/session', { method: 'PATCH' })
        if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
        setDone(true)
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  const finishSteps = session?.tomorrow_finish_steps ?? []

  // Estimate finish time — sum of finish_only tasks (or flat 10 min default)
  const finishOnlyTasks = (session?.prep_tasks ?? []).filter((t) => t.task_type === 'finish_only')
  const finishMinutes = finishOnlyTasks.reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0) || 10

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (done) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto flex flex-col items-center justify-center gap-5">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-bold">Brunch done!</h2>
        {session?.brunch_recipe_name && (
          <p className="text-muted-foreground">{session.brunch_recipe_name} logged.</p>
        )}
        <p className="text-sm text-muted-foreground">You&apos;re on track for today.</p>
        <Button onClick={() => router.push('/')}>Back to Home</Button>
      </main>
    )
  }

  // ── No session ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto flex flex-col items-center justify-center gap-4">
        <ChefHat className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No kitchen session for today</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Open Tonight&apos;s Kitchen in the evening to plan your session first.
        </p>
        <Button variant="outline" onClick={() => router.push('/kitchen')}>Go to Kitchen</Button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">

      {/* Back */}
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        onClick={() => router.push('/kitchen')}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Kitchen
      </button>

      {/* Good Morning header */}
      <div className="flex items-center gap-3 mb-6">
        <Sun className="w-8 h-8 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold">Good Morning!</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      {/* Brunch hero */}
      <div className="border rounded-xl p-5 bg-card mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Today&apos;s Brunch</p>
            <h2 className="text-xl font-bold">{session.brunch_recipe_name ?? 'Brunch'}</h2>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-primary bg-primary/10 rounded-lg px-3 py-1.5 shrink-0">
            <Clock className="w-4 h-4" />
            {finishMinutes} min
          </div>
        </div>

        {/* On-track indicator */}
        <div className="flex items-center gap-2 mt-3 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
          <Flame className="w-4 h-4 shrink-0" />
          <span>Prep done last night — you&apos;re on track!</span>
        </div>
      </div>

      {/* Finish steps */}
      {finishSteps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Just {finishSteps.length} step{finishSteps.length !== 1 ? 's' : ''} to finish
          </h3>
          <ol className="space-y-2">
            {finishSteps.map((step, i) => (
              <li
                key={i}
                className={cn(
                  'flex gap-3 text-sm border rounded-lg px-4 py-3 bg-card',
                )}
              >
                <span className="text-primary font-semibold shrink-0 w-5">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Finish-only tasks from prep (if any) */}
      {finishOnlyTasks.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-700 mb-2">Quick tasks</p>
          <div className="space-y-1.5">
            {finishOnlyTasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-green-800">
                <span className="text-green-500 shrink-0">•</span>
                <span>{task.description}</span>
                <span className="text-xs text-green-600 ml-auto shrink-0">{task.duration_minutes} min</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mark done */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleMarkDone}
        disabled={isPending}
      >
        {isPending ? (
          <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Marking…</>
        ) : (
          <><CheckCircle2 className="w-5 h-5 mr-2" />Mark Brunch Done</>
        )}
      </Button>

    </main>
  )
}
