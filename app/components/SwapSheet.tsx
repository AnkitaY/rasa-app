'use client'

import { useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Alternative {
  name: string
  reasoning: string
  cuisine_type: string
  cook_time_minutes: number
  servings: number
  ingredients: unknown[]
  steps_v2: unknown[]
  prep_ahead: unknown[]
}

type ReasonKey = 'missing_ingredient' | 'no_time' | 'something_else'

type Step = 'reason' | 'loading' | 'alternatives' | 'custom'

interface SwapSheetProps {
  meal: { id: string; recipe_name: string }
  open: boolean
  onClose: () => void
  onSwapped: (newName: string) => void
}

// ── Reason options ────────────────────────────────────────────────────────────

const REASONS: { key: ReasonKey; emoji: string; label: string }[] = [
  { key: 'missing_ingredient', emoji: '🧅', label: 'Missing an ingredient' },
  { key: 'no_time',            emoji: '⏱',  label: 'No time tonight' },
  { key: 'something_else',     emoji: '✏️', label: 'Something else' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function SwapSheet({ meal, open, onClose, onSwapped }: SwapSheetProps) {
  const [step, setStep] = useState<Step>('reason')
  const [reason, setReason] = useState<ReasonKey | null>(null)
  const [ingredient, setIngredient] = useState('')
  const [freeText, setFreeText] = useState('')
  const [customRequest, setCustomRequest] = useState('')
  const [alternatives, setAlternatives] = useState<Alternative[]>([])
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null)
  const [error, setError] = useState('')

  function reset() {
    setStep('reason')
    setReason(null)
    setIngredient('')
    setFreeText('')
    setCustomRequest('')
    setAlternatives([])
    setApplyingIdx(null)
    setError('')
  }

  function handleClose() {
    onClose()
    setTimeout(reset, 320)
  }

  async function fetchAlternatives(customText?: string) {
    if (!reason) return
    setStep('loading')
    setError('')

    try {
      const res = await fetch('/api/meals/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_id: meal.id,
          reason,
          ingredient: ingredient.trim() || undefined,
          free_text: customText ?? (freeText.trim() || undefined),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAlternatives(data.alternatives ?? [])
      setStep('alternatives')
    } catch {
      setError("Hmm, couldn't find alternatives. Give it one more try?")
      setStep('reason')
    }
  }

  async function applyAlternative(alt: Alternative, idx: number) {
    setApplyingIdx(idx)
    try {
      const res = await fetch('/api/meals/swap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_id: meal.id, chosen: alt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSwapped(alt.name)
      handleClose()
    } catch {
      setApplyingIdx(null)
      setError("Couldn't apply that swap. Give it one more try?")
    }
  }

  const canProceed = !!reason && (
    reason !== 'missing_ingredient' || true // ingredient is optional
  )

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={isOpen => { if (!isOpen) handleClose() }}
    >
      <DialogPrimitive.Portal>
        {/* Scrim */}
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        />

        {/* Bottom sheet */}
        <DialogPrimitive.Popup
          className="fixed bottom-0 left-0 right-0 z-50 bg-p1-card rounded-t-3xl px-5 pt-4 pb-10 max-h-[88vh] overflow-y-auto outline-none"
          style={{ animation: 'swapSlideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)' }}
        >
          <style>{`
            @keyframes swapSlideUp {
              from { transform: translateY(100%); }
              to   { transform: translateY(0); }
            }
          `}</style>

          {/* Drag handle */}
          <div className="flex justify-center mb-5">
            <div className="w-10 h-1 rounded-full bg-p1-border" />
          </div>

          {/* ── Step 1: Reason ──────────────────────────────────────────── */}
          {step === 'reason' && (
            <div>
              <DialogPrimitive.Title className="text-lg font-ui font-bold text-p1-dark mb-1">
                Swap {meal.recipe_name}?
              </DialogPrimitive.Title>
              <p className="text-sm text-p1-brown font-ui mb-6">
                What&apos;s not working tonight?
              </p>

              <div className="space-y-2.5 mb-5">
                {REASONS.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setReason(r.key)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all',
                      reason === r.key
                        ? 'border-p1-terra bg-p1-terra-lt'
                        : 'border-p1-border bg-p1-card'
                    )}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <span className={cn(
                      'text-sm font-ui font-semibold',
                      reason === r.key ? 'text-p1-terra' : 'text-p1-dark'
                    )}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Conditional input: missing ingredient */}
              {reason === 'missing_ingredient' && (
                <div className="mb-5 space-y-1.5">
                  <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
                    Which ingredient?{' '}
                    <span className="font-normal normal-case text-p1-brown/60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-p1-border bg-p1-card px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors"
                    placeholder="e.g. coconut milk, paneer…"
                    value={ingredient}
                    onChange={e => setIngredient(e.target.value)}
                  />
                </div>
              )}

              {/* Conditional input: something else */}
              {reason === 'something_else' && (
                <div className="mb-5 space-y-1.5">
                  <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
                    Tell us more
                  </label>
                  <textarea
                    className="w-full min-h-[80px] rounded-xl border border-p1-border bg-p1-card px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors resize-none"
                    placeholder="Not feeling it tonight, want something lighter…"
                    value={freeText}
                    onChange={e => setFreeText(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 font-ui mb-4">{error}</p>
              )}

              <button
                onClick={() => fetchAlternatives()}
                disabled={!canProceed}
                className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
              >
                Find alternatives →
              </button>

              <button
                onClick={handleClose}
                className="w-full mt-3 py-3 text-sm font-ui text-p1-brown text-center"
              >
                Keep it as is
              </button>
            </div>
          )}

          {/* ── Step 2: Loading ─────────────────────────────────────────── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-p1-terra"
                    style={{
                      animation: 'swapBounce 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-sm font-ui text-p1-brown text-center">
                Finding alternatives that work with your pantry…
              </p>
              <style>{`
                @keyframes swapBounce {
                  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                  40% { transform: translateY(-8px); opacity: 1; }
                }
              `}</style>
            </div>
          )}

          {/* ── Step 3: Alternatives ────────────────────────────────────── */}
          {step === 'alternatives' && (
            <div>
              <DialogPrimitive.Title className="text-lg font-ui font-bold text-p1-dark mb-1">
                3 alternatives for tonight
              </DialogPrimitive.Title>
              <p className="text-sm text-p1-brown font-ui mb-6">
                All work with what you have — no extra shopping.
              </p>

              <div className="space-y-3 mb-5">
                {alternatives.map((alt, idx) => {
                  const isApplying = applyingIdx === idx
                  return (
                    <button
                      key={idx}
                      onClick={() => applyAlternative(alt, idx)}
                      disabled={applyingIdx !== null}
                      className="w-full text-left px-4 py-4 rounded-2xl bg-p1-card border-2 border-p1-border disabled:opacity-60 active:opacity-80 transition-opacity"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-ui font-bold text-p1-dark leading-snug">
                          {alt.name}
                        </p>
                        <span className="text-[11px] font-ui text-p1-brown whitespace-nowrap shrink-0 mt-0.5">
                          {alt.cook_time_minutes} min
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-ui text-p1-brown italic leading-relaxed">
                        {isApplying ? 'Swapping…' : alt.reasoning}
                      </p>
                    </button>
                  )
                })}
              </div>

              {error && (
                <p className="text-sm text-red-600 font-ui mb-4">{error}</p>
              )}

              {/* Custom request */}
              {step === 'alternatives' && (
                <button
                  onClick={() => setStep('custom')}
                  className="w-full py-3.5 rounded-2xl font-ui text-sm font-medium text-p1-terra text-center"
                  style={{ border: '1.5px dashed #C4522A' }}
                >
                  None of these work — let me type a request
                </button>
              )}

              <button
                onClick={() => setStep('reason')}
                className="w-full mt-3 py-3 text-sm font-ui text-p1-brown text-center"
              >
                ← Change reason
              </button>
            </div>
          )}

          {/* ── Step 4: Custom request ──────────────────────────────────── */}
          {step === 'custom' && (
            <div>
              <DialogPrimitive.Title className="text-lg font-ui font-bold text-p1-dark mb-1">
                What are you after?
              </DialogPrimitive.Title>
              <p className="text-sm text-p1-brown font-ui mb-5">
                Be as specific as you like.
              </p>

              <textarea
                className="w-full min-h-[100px] rounded-xl border border-p1-terra bg-p1-card px-4 py-3 text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none resize-none leading-relaxed mb-5"
                placeholder="Something with lentils, or a one-pot dish, or really quick…"
                value={customRequest}
                onChange={e => setCustomRequest(e.target.value)}
                autoFocus
              />

              <button
                onClick={() => fetchAlternatives(customRequest)}
                disabled={!customRequest.trim()}
                className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
              >
                Find these alternatives →
              </button>

              <button
                onClick={() => setStep('alternatives')}
                className="w-full mt-3 py-3 text-sm font-ui text-p1-brown text-center"
              >
                ← Back to alternatives
              </button>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
