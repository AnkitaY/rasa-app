'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserPreferences } from '@/lib/types'

type WhoFor = UserPreferences['who_cooking_for']

const WHO_OPTIONS: { value: WhoFor; label: string; emoji: string; sub: string }[] = [
  {
    value: 'just_me',
    label: 'Just me',
    emoji: '🧑',
    sub: 'Solo portions, quick wins',
  },
  {
    value: 'me_and_partner',
    label: 'Me + partner',
    emoji: '👫',
    sub: 'Two adults, varied tastes',
  },
  {
    value: 'family_young_kids',
    label: 'Family, young kids',
    emoji: '👨‍👩‍👧',
    sub: 'Mild, familiar, kid-approved',
  },
  {
    value: 'family_teens',
    label: 'Family, teens',
    emoji: '👨‍👩‍👦',
    sub: 'Bigger portions, bolder flavours',
  },
]

function ProgressPips({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            n === current ? 'w-6 bg-p1-terra' : 'w-1.5 bg-p1-border'
          )}
        />
      ))}
    </div>
  )
}

export default function WhoForPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<WhoFor | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('rasa_ob')
      if (stored) {
        const ob = JSON.parse(stored)
        if (ob.who_cooking_for) setSelected(ob.who_cooking_for)
      }
    } catch { /* ignore */ }
  }, [])

  function handleNext() {
    if (!selected) return
    try {
      const existing = JSON.parse(sessionStorage.getItem('rasa_ob') || '{}')
      sessionStorage.setItem('rasa_ob', JSON.stringify({ ...existing, who_cooking_for: selected }))
    } catch { /* ignore */ }
    router.push('/onboarding/cuisine')
  }

  return (
    <main className="min-h-screen bg-p1-cream flex flex-col">
      <div className="flex-1 px-5 pt-14 pb-8 flex flex-col">
        {/* Progress */}
        <ProgressPips current={2} />

        {/* Heading */}
        <div className="mt-8 mb-8">
          <p className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-widest mb-2">
            Question 2 of 3
          </p>
          <h1 className="text-2xl font-ui font-bold text-p1-dark leading-snug">
            Who are you cooking for?
          </h1>
          <p className="mt-2 text-sm text-p1-brown font-ui">
            This shapes portion sizes and how adventurous the meals get.
          </p>
        </div>

        {/* 2×2 card grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {WHO_OPTIONS.map(({ value, label, emoji, sub }) => {
            const active = selected === value
            return (
              <button
                key={value}
                onClick={() => setSelected(value)}
                className={cn(
                  'flex flex-col items-start text-left px-4 py-4 rounded-2xl border-2 transition-all',
                  active
                    ? 'border-p1-terra bg-p1-terra-lt'
                    : 'border-p1-border bg-p1-card'
                )}
              >
                <span className="text-2xl mb-2">{emoji}</span>
                <span className={cn(
                  'text-sm font-ui font-semibold leading-tight',
                  active ? 'text-p1-terra' : 'text-p1-dark'
                )}>
                  {label}
                </span>
                <span className="text-xs font-ui text-p1-brown mt-1 leading-snug">
                  {sub}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Navigation */}
        <div className="space-y-3">
          <button
            onClick={handleNext}
            disabled={!selected}
            className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
          >
            Next →
          </button>
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full py-3 text-sm font-ui text-p1-brown text-center"
          >
            ← Back
          </button>
        </div>
      </div>
    </main>
  )
}
