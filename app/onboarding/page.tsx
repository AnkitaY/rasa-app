'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const DIET_CHIPS = [
  'Vegetarian',
  'Halal',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'None',
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

export default function OnboardingDietPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const isNone = selected.includes('None')

  // Pre-fill from sessionStorage if user navigated back
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('rasa_ob')
      if (stored) {
        const ob = JSON.parse(stored)
        if (ob.dietary_rules !== undefined) {
          // Reconstruct chip selection from stored text
          if (ob.dietary_rules === 'None') {
            setSelected(['None'])
          } else if (ob.dietary_rules) {
            setFreeText(ob.dietary_rules)
          }
        }
      }
    } catch { /* ignore */ }
  }, [])

  function toggleChip(chip: string) {
    if (chip === 'None') {
      setSelected(['None'])
      setFreeText('')
      return
    }
    setSelected(prev => {
      const without = prev.filter(c => c !== 'None')
      return without.includes(chip)
        ? without.filter(c => c !== chip)
        : [...without, chip]
    })
  }

  function handleChipClick(chip: string) {
    if (chip === 'None') {
      toggleChip('None')
      return
    }
    // Append chip label to textarea
    toggleChip(chip)
    setFreeText(prev => {
      const label = chip
      if (selected.includes(chip)) {
        // Removing — strip from textarea
        return prev
          .replace(new RegExp(`,?\\s*${label}`, 'i'), '')
          .replace(new RegExp(`${label}\\s*,?\\s*`, 'i'), '')
          .trim()
          .replace(/^,|,$/, '')
          .trim()
      } else {
        // Adding
        return prev ? `${prev}, ${label}` : label
      }
    })
  }

  function handleNext() {
    let dietary_rules: string | null = null
    if (isNone) {
      dietary_rules = null
    } else if (freeText.trim()) {
      dietary_rules = freeText.trim()
    }

    try {
      const existing = JSON.parse(sessionStorage.getItem('rasa_ob') || '{}')
      sessionStorage.setItem('rasa_ob', JSON.stringify({ ...existing, dietary_rules }))
    } catch { /* ignore */ }

    router.push('/onboarding/who-for')
  }

  return (
    <main className="min-h-screen bg-p1-cream flex flex-col">
      <div className="flex-1 px-5 pt-14 pb-8 flex flex-col">
        {/* Progress */}
        <ProgressPips current={1} />

        {/* Heading */}
        <div className="mt-8 mb-8">
          <p className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-widest mb-2">
            Question 1 of 3
          </p>
          <h1 className="text-2xl font-ui font-bold text-p1-dark leading-snug">
            Anything we should never put on the menu?
          </h1>
          <p className="mt-2 text-sm text-p1-brown font-ui">
            Tap to add, or just type below.
          </p>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {DIET_CHIPS.map(chip => {
            const active = selected.includes(chip)
            return (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-ui font-medium border transition-all',
                  active
                    ? 'bg-p1-terra text-white border-p1-terra'
                    : 'bg-p1-card text-p1-dark border-p1-border'
                )}
              >
                {chip}
              </button>
            )
          })}
        </div>

        {/* Free-text */}
        <div className="space-y-1.5 mb-8">
          <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
            Or describe your rules
          </label>
          <textarea
            className={cn(
              'w-full min-h-[100px] rounded-xl border px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none transition-colors resize-none leading-relaxed',
              isNone
                ? 'bg-p1-surface/40 border-p1-border-lt text-p1-brown/50 cursor-not-allowed'
                : 'bg-p1-card border-p1-border focus:border-p1-terra'
            )}
            placeholder="e.g. No pork, low FODMAP, allergic to nuts…"
            value={isNone ? '' : freeText}
            onChange={e => {
              if (!isNone) setFreeText(e.target.value)
            }}
            disabled={isNone}
          />
          {isNone && (
            <p className="text-xs text-p1-brown/60 font-ui">
              Great — no restrictions. You can change this any time in your profile.
            </p>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide active:opacity-80 transition-opacity"
        >
          Next →
        </button>
      </div>
    </main>
  )
}
