'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Chip {
  label: string
  value: string
}

const DIET_CHIPS: Chip[] = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Halal', value: 'halal' },
  { label: 'Gluten-free', value: 'gluten_free' },
  { label: 'Dairy-free', value: 'dairy_free' },
  { label: 'Nut-free', value: 'nut_free' },
  { label: 'No red meat', value: 'no_red_meat' },
  { label: 'No raw fish', value: 'no_raw_fish' },
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

function getAnonId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('rasa_anon_id')
}

export default function OnboardingDietPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [saving, setSaving] = useState(false)

  // Pre-fill from saved preferences on mount
  useEffect(() => {
    const anonId = getAnonId()
    if (!anonId) return

    fetch(`/api/preferences/get?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ preferences }) => {
        if (!preferences) return
        if (Array.isArray(preferences.dietary_flags) && preferences.dietary_flags.length > 0) {
          setSelected(preferences.dietary_flags as string[])
        }
        if (typeof preferences.dietary_other === 'string' && preferences.dietary_other) {
          setFreeText(preferences.dietary_other)
        }
      })
      .catch(() => { /* ignore */ })
  }, [])

  function toggleChip(value: string) {
    setSelected(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  async function handleNext() {
    setSaving(true)
    const anonId = getAnonId()

    if (anonId) {
      try {
        await fetch('/api/preferences/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anon_id: anonId,
            dietary_flags: selected,
            dietary_other: freeText.trim() || null,
          }),
        })
      } catch { /* ignore save errors — proceed to next page */ }
    }

    // Also persist to sessionStorage for downstream onboarding steps
    try {
      const existing = JSON.parse(sessionStorage.getItem('rasa_ob') || '{}')
      sessionStorage.setItem('rasa_ob', JSON.stringify({
        ...existing,
        dietary_flags: selected,
        dietary_other: freeText.trim() || null,
      }))
    } catch { /* ignore */ }

    setSaving(false)
    router.push('/onboarding/who-for')
  }

  return (
    <main className="min-h-screen bg-p1-cream flex flex-col">
      <div className="flex-1 px-5 pt-14 pb-8 flex flex-col">
        {/* Progress */}
        <ProgressPips current={1} />

        {/* Heading */}
        <div className="mt-8 mb-8">
          <h1 className="text-2xl font-serif-display font-bold text-p1-dark leading-snug">
            Any dietary rules we should always follow?
          </h1>
          <p className="mt-2 text-sm font-ui text-p1-brown">
            Pick everything that applies &mdash; or skip if you eat everything.
          </p>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {DIET_CHIPS.map(chip => {
            const active = selected.includes(chip.value)
            return (
              <button
                key={chip.value}
                onClick={() => toggleChip(chip.value)}
                className={cn(
                  'px-4 py-2 rounded-4xl text-sm font-ui font-medium transition-all',
                  active
                    ? 'bg-p1-terra text-white'
                    : 'bg-p1-surface text-p1-dark'
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* "Anything else?" textarea */}
        <div className="space-y-1.5 mb-8">
          <label className="text-sm font-ui font-medium text-p1-dark">
            Anything else?
          </label>
          <textarea
            className={cn(
              'w-full min-h-[64px] rounded-lg border border-p1-border px-2.5 py-2 text-sm font-ui text-p1-dark',
              'placeholder:text-p1-brown/50 focus:outline-none focus:ring-3 focus:ring-p1-terra/50',
              'resize-none leading-relaxed bg-white'
            )}
            placeholder="e.g. no shellfish, low-sodium for a family member"
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Next button — always enabled */}
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full h-10 rounded-lg bg-p1-terra text-white text-sm font-ui font-semibold active:opacity-80 disabled:opacity-60"
        >
          Next &rarr;
        </button>

        {/* Skip for now */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleNext}
            disabled={saving}
            className="text-sm font-ui text-p1-brown underline disabled:opacity-60"
          >
            Skip for now
          </button>
        </div>
      </div>
    </main>
  )
}
