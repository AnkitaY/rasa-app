'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getAnonId } from '@/lib/anon'

const CUISINES = [
  'Indian',
  'Italian',
  'Thai',
  'Mexican',
  'Mediterranean',
  'Japanese',
  'Chinese',
  'Middle Eastern',
  'Korean',
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

export default function CuisinePage() {
  const router = useRouter()
  const [primary, setPrimary] = useState<string | null>(null)
  const [secondary, setSecondary] = useState<string[]>([])
  const [otherPrimary, setOtherPrimary] = useState('')
  const [otherSecondary, setOtherSecondary] = useState('')
  const [showOtherPrimary, setShowOtherPrimary] = useState(false)
  const [showOtherSecondary, setShowOtherSecondary] = useState(false)
  const otherPrimaryRef = useRef<HTMLInputElement>(null)
  const otherSecondaryRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('rasa_ob')
      if (stored) {
        const ob = JSON.parse(stored)
        if (ob.primary_cuisine) {
          if (CUISINES.includes(ob.primary_cuisine)) {
            setPrimary(ob.primary_cuisine)
          } else {
            setShowOtherPrimary(true)
            setOtherPrimary(ob.primary_cuisine)
            setPrimary('__other__')
          }
        }
        if (ob.secondary_cuisines?.length) {
          const known = ob.secondary_cuisines.filter((c: string) => CUISINES.includes(c))
          const unknown = ob.secondary_cuisines.filter((c: string) => !CUISINES.includes(c))
          setSecondary(known)
          if (unknown.length) {
            setShowOtherSecondary(true)
            setOtherSecondary(unknown.join(', '))
          }
        }
      }
    } catch { /* ignore */ }
  }, [])

  function selectPrimary(cuisine: string) {
    if (cuisine === '__other__') {
      setPrimary('__other__')
      setShowOtherPrimary(true)
      setTimeout(() => otherPrimaryRef.current?.focus(), 50)
    } else {
      setPrimary(cuisine)
      setShowOtherPrimary(false)
      setOtherPrimary('')
    }
    // Clear from secondary if it was there
    setSecondary(prev => prev.filter(c => c !== cuisine))
  }

  function toggleSecondary(cuisine: string) {
    if (cuisine === '__other__') {
      setShowOtherSecondary(prev => !prev)
      if (!showOtherSecondary) {
        setTimeout(() => otherSecondaryRef.current?.focus(), 50)
      }
      return
    }
    setSecondary(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    )
  }

  const effectivePrimary =
    primary === '__other__' ? otherPrimary.trim() : primary

  const effectiveSecondary = [
    ...secondary,
    ...(showOtherSecondary && otherSecondary.trim()
      ? otherSecondary.split(',').map(s => s.trim()).filter(Boolean)
      : []),
  ]

  function handleFinish() {
    if (!effectivePrimary) return
    setError('')

    startTransition(async () => {
      try {
        const stored = sessionStorage.getItem('rasa_ob') || '{}'
        const ob = JSON.parse(stored)
        const payload = {
          ...ob,
          primary_cuisine: effectivePrimary,
          secondary_cuisines: effectiveSecondary,
        }

        const anonId = getAnonId()
        const res = await fetch('/api/preferences/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anon_id: anonId, ...payload }),
        })

        if (!res.ok) {
          setError("Hmm, couldn’t save your preferences. Give it one more try?")
          return
        }

        // Clear onboarding session storage
        sessionStorage.removeItem('rasa_ob')
        router.push('/planner/generate')
      } catch {
        setError("Hmm, something went wrong. Give it one more try?")
      }
    })
  }

  const hasPrimary = !!effectivePrimary

  return (
    <main className="min-h-screen bg-p1-cream flex flex-col">
      <div className="flex-1 px-5 pt-14 pb-8 flex flex-col">
        {/* Progress */}
        <ProgressPips current={3} />

        {/* Heading */}
        <div className="mt-8 mb-8">
          <p className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-widest mb-2">
            Question 3 of 3
          </p>
          <h1 className="text-2xl font-ui font-bold text-p1-dark leading-snug">
            What feels like home cooking to you?
          </h1>
          <p className="mt-2 text-sm text-p1-brown font-ui">
            Your go-to cuisine shapes most of the week.
          </p>
        </div>

        {/* Primary cuisine */}
        <div className="mb-6">
          <p className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider mb-3">
            Your primary cuisine
          </p>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map(cuisine => {
              const active = primary === cuisine
              return (
                <button
                  key={cuisine}
                  onClick={() => selectPrimary(cuisine)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-ui font-medium border transition-all',
                    active
                      ? 'bg-p1-terra text-white border-p1-terra'
                      : 'bg-p1-card text-p1-dark border-p1-border'
                  )}
                >
                  {cuisine}
                </button>
              )
            })}
            <button
              onClick={() => selectPrimary('__other__')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-ui font-medium border transition-all',
                primary === '__other__'
                  ? 'bg-p1-terra text-white border-p1-terra'
                  : 'bg-p1-card text-p1-dark border-p1-border'
              )}
            >
              Other ✏
            </button>
          </div>

          {showOtherPrimary && (
            <input
              ref={otherPrimaryRef}
              type="text"
              className="mt-3 w-full rounded-xl border border-p1-terra bg-p1-card px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none"
              placeholder="e.g. Sri Lankan, Ethiopian…"
              value={otherPrimary}
              onChange={e => setOtherPrimary(e.target.value)}
            />
          )}
        </div>

        {/* Secondary cuisines — appear after primary selected */}
        {hasPrimary && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider mb-1">
              Also enjoy{' '}
              <span className="font-normal normal-case text-p1-brown/60">(optional)</span>
            </p>
            <p className="text-xs text-p1-brown/60 font-ui mb-3">
              We&apos;ll weave these in for variety.
            </p>
            <div className="flex flex-wrap gap-2">
              {CUISINES.filter(c => c !== (primary === '__other__' ? null : primary)).map(cuisine => {
                const active = secondary.includes(cuisine)
                return (
                  <button
                    key={cuisine}
                    onClick={() => toggleSecondary(cuisine)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-ui font-medium border-2 transition-all',
                      active
                        ? 'bg-p1-forest-lt text-p1-forest border-p1-forest'
                        : 'bg-p1-card text-p1-dark border-p1-border'
                    )}
                  >
                    {cuisine}
                  </button>
                )
              })}
              <button
                onClick={() => toggleSecondary('__other__')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-ui font-medium border-2 transition-all',
                  showOtherSecondary
                    ? 'bg-p1-forest-lt text-p1-forest border-p1-forest'
                    : 'bg-p1-card text-p1-dark border-p1-border'
                )}
              >
                Other ✏
              </button>
            </div>

            {showOtherSecondary && (
              <input
                ref={otherSecondaryRef}
                type="text"
                className="mt-3 w-full rounded-xl border border-p1-forest bg-p1-card px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none"
                placeholder="e.g. Persian, Vietnamese… (comma-separated)"
                value={otherSecondary}
                onChange={e => setOtherSecondary(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 font-ui mb-4">{error}</p>
        )}

        <div className="flex-1" />

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={handleFinish}
            disabled={!hasPrimary || isPending}
            className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
          >
            {isPending ? 'Saving…' : "Let’s build your first plan →"}
          </button>
          <button
            onClick={() => router.push('/onboarding/who-for')}
            className="w-full py-3 text-sm font-ui text-p1-brown text-center"
          >
            ← Back
          </button>
        </div>
      </div>
    </main>
  )
}
