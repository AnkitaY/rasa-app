'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getAnonId } from '@/lib/anon'
import { UserPreferences } from '@/lib/types'

export default function PantryPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [pantryText, setPantryText] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const anonId = getAnonId()
    if (!anonId) return
    fetch(`/api/preferences/get?anon_id=${anonId}`)
      .then(r => r.json())
      .then(({ preferences }) => {
        setPrefs(preferences)
        if (preferences?.last_pantry_input) {
          setPantryText(preferences.last_pantry_input)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function handleSaveAndRegen() {
    startTransition(async () => {
      // Persist the updated pantry text to preferences before navigating
      const anonId = getAnonId()
      if (anonId && pantryText.trim()) {
        await fetch('/api/preferences/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anon_id: anonId, last_pantry_input: pantryText }),
        })
      }
      router.push('/planner/generate?prefill=1')
    })
  }

  function handleSave() {
    startTransition(async () => {
      const anonId = getAnonId()
      if (!anonId || !pantryText.trim()) return
      await fetch('/api/preferences/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anon_id: anonId, last_pantry_input: pantryText }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <main className="min-h-screen bg-p1-cream">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-ui font-bold text-p1-dark tracking-tight">
          What&apos;s in the kitchen?
        </h1>
        <p className="mt-1 text-sm text-p1-brown">
          A quick snapshot — no need for amounts. We&apos;ll use this when building your next plan.
        </p>
      </div>

      <div className="px-5 space-y-5">
        {/* Last snapshot banner — shown when prefs have previous input */}
        {!loading && prefs?.last_pantry_input && (
          <div className="rounded-xl border border-p1-border-lt bg-p1-card px-4 py-3">
            <p className="text-[11px] font-ui font-semibold text-p1-brown uppercase tracking-wider mb-1">
              Last snapshot
            </p>
            <p className="text-sm text-p1-dark/70 line-clamp-3 leading-relaxed">
              {prefs.last_pantry_input}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-p1-surface rounded w-1/3" />
            <div className="h-24 bg-p1-surface rounded-xl" />
          </div>
        )}

        {/* Pantry textarea */}
        {!loading && (
          <>
            <div className="space-y-2">
              <label className="text-[11px] font-ui font-semibold text-p1-brown uppercase tracking-wider">
                Update your pantry
              </label>
              <textarea
                className="w-full min-h-[180px] rounded-xl border border-p1-border bg-p1-card px-4 py-3 text-sm text-p1-dark placeholder:text-p1-brown/50 focus:outline-none focus:border-p1-terra transition-colors resize-none leading-relaxed font-ui"
                placeholder="Chicken thighs, basmati rice, onions, tomatoes, garlic, ginger, spinach, coconut milk, lentils…"
                value={pantryText}
                onChange={e => setPantryText(e.target.value)}
              />
              <p className="text-xs text-p1-brown/70 font-ui">
                Just list what you have — one line or a paragraph, whatever&apos;s easiest.
              </p>
            </div>

            {/* Primary CTA — regen plan */}
            <button
              onClick={handleSaveAndRegen}
              disabled={isPending || !pantryText.trim()}
              className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
            >
              {isPending ? 'One sec…' : 'Regenerate plan with this →'}
            </button>

            {/* Secondary — just save */}
            <button
              onClick={handleSave}
              disabled={isPending || !pantryText.trim()}
              className="w-full py-3 rounded-xl border border-p1-border bg-p1-card text-p1-dark text-sm font-ui font-medium disabled:opacity-40 transition-opacity active:opacity-80"
            >
              {saved ? '✓ Saved' : 'Save for later'}
            </button>
          </>
        )}

        {/* Empty state — no prefs, no prior input */}
        {!loading && !prefs && (
          <div className="text-center pt-4 pb-8">
            <p className="text-sm text-p1-brown font-ui">
              No pantry snapshot yet — type what you&apos;ve got above and we&apos;ll keep it handy.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
