'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KitchenSession } from '@/lib/types'
import { ChefHat, Clock, Sun, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function KitchenHomeCard() {
  const router = useRouter()
  const [session, setSession] = useState<KitchenSession | null>(null)
  const [loading, setLoading] = useState(true)
  const isAfter5pm = new Date().getHours() >= 17

  useEffect(() => {
    fetch('/api/kitchen/session')
      .then((r) => r.json())
      .then(({ session: s }) => { setSession(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null

  // ── Before 5pm: preview card ───────────────────────────────────────────────
  if (!isAfter5pm) {
    return (
      <div
        className="w-full flex items-center justify-between gap-3 rounded-lg border px-5 py-3 hover:bg-accent transition-colors cursor-pointer"
        onClick={() => router.push('/kitchen')}
      >
        <div className="flex items-center gap-3">
          <ChefHat className="w-5 h-5 text-primary shrink-0" />
          <div className="text-left">
            {session ? (
              <>
                <p className="text-sm font-medium">
                  Tonight: {session.dinner_recipe_name ?? 'Dinner'}
                  {session.brunch_recipe_name && (
                    <span className="text-muted-foreground font-normal"> + prep for {session.brunch_recipe_name}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.session_duration_minutes ? `~${session.session_duration_minutes} min kitchen time` : 'Session planned'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Tonight&apos;s Kitchen</p>
                <p className="text-xs text-muted-foreground">Plan tonight&apos;s dinner + tomorrow&apos;s prep</p>
              </>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    )
  }

  // ── After 5pm: full session card ───────────────────────────────────────────
  return (
    <div className="w-full rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-primary" />
          <span className="font-semibold">Tonight&apos;s Kitchen</span>
        </div>
        {session?.session_duration_minutes && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />{session.session_duration_minutes} min
          </span>
        )}
      </div>

      {session ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Dinner</p>
              <p className="text-sm font-medium leading-tight">{session.dinner_recipe_name ?? '—'}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <Sun className="w-3 h-3" /> Prep for
              </p>
              <p className="text-sm font-medium leading-tight">{session.brunch_recipe_name ?? '—'}</p>
            </div>
          </div>

          {(session.prep_tasks ?? []).filter((t) => t.task_type !== 'finish_only').length > 0 && (
            <p className="text-xs text-muted-foreground">
              {(session.prep_tasks ?? []).filter((t) => t.task_type !== 'finish_only').length} prep task{(session.prep_tasks ?? []).filter((t) => t.task_type !== 'finish_only').length !== 1 ? 's' : ''} ready to tick off
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No session planned yet for tonight.</p>
      )}

      <Button className="w-full" onClick={() => router.push('/kitchen')}>
        <ChefHat className="w-4 h-4 mr-2" />
        {session ? 'Open Kitchen' : 'Plan Tonight'}
      </Button>
    </div>
  )
}
