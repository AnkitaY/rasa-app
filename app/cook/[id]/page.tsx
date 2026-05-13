'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StepV2 {
  instruction: string
  tip_type?: 'TIMING' | 'DONENESS' | 'HEADS_UP' | 'CLEAN'
  tip_text?: string
}

interface Recipe {
  id: string
  name: string
  cook_time_minutes: number | null
  steps: string[]
  steps_v2: StepV2[] | null
}

// ── Tip config ────────────────────────────────────────────────────────────────

const TIP_CONFIG = {
  TIMING: {
    label: '⏱ TIMING',
    borderColor: '#D97706',
    bgColor: '#FFFBEB',
    textColor: '#92400E',
  },
  DONENESS: {
    label: '✓ DONENESS',
    borderColor: '#2D5B3F',
    bgColor: '#E2EDE6',
    textColor: '#2D5B3F',
  },
  HEADS_UP: {
    label: '⚠ HEADS UP',
    borderColor: '#DC2626',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
  },
  CLEAN: {
    label: '✦ CLEAN AS YOU GO',
    borderColor: '#9CA3AF',
    bgColor: '#F9FAFB',
    textColor: '#374151',
  },
} as const

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CookModePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`)
        if (res.ok) {
          const { recipe: data } = await res.json()
          if (data) setRecipe(data as Recipe)
        }
      } catch {
        /* not-found handled via recipe === null */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <main className="fixed inset-0 bg-p1-cream flex flex-col">
        <div className="px-5 pt-12 pb-4 flex items-center justify-between border-b border-p1-border-lt">
          <div className="h-5 w-40 bg-p1-surface rounded animate-pulse" />
          <div className="h-5 w-5 bg-p1-surface rounded animate-pulse" />
        </div>
        <div className="h-1 bg-p1-surface" />
        <div className="flex-1 px-5 pt-8 space-y-4">
          <div className="h-6 w-16 bg-p1-surface rounded-full animate-pulse" />
          <div className="h-36 bg-p1-surface rounded-2xl animate-pulse" />
        </div>
      </main>
    )
  }

  if (!recipe) {
    return (
      <main className="fixed inset-0 bg-p1-cream flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-lg font-ui font-semibold text-p1-dark">Recipe not found</p>
        <button
          onClick={() => router.back()}
          className="text-sm font-ui text-p1-terra font-semibold"
        >
          ← Go back
        </button>
      </main>
    )
  }

  const stepsV2: StepV2[] = Array.isArray(recipe.steps_v2) && recipe.steps_v2.length > 0
    ? recipe.steps_v2
    : []
  const legacySteps: string[] = Array.isArray(recipe.steps) ? recipe.steps : []
  const useV2 = stepsV2.length > 0
  const steps = useV2 ? stepsV2 : legacySteps.map(s => ({ instruction: s }))
  const totalSteps = steps.length

  if (totalSteps === 0) {
    return (
      <main className="fixed inset-0 bg-p1-cream flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-lg font-ui font-semibold text-p1-dark">No steps available</p>
        <p className="text-sm font-ui text-p1-brown">This recipe doesn&apos;t have step-by-step instructions yet.</p>
        <button
          onClick={() => router.back()}
          className="text-sm font-ui text-p1-terra font-semibold"
        >
          ← Go back
        </button>
      </main>
    )
  }

  const currentStep = steps[step]
  const isFirst = step === 0
  const isLast = step === totalSteps - 1
  const progress = ((step + 1) / totalSteps) * 100
  const tip = useV2 && (currentStep as StepV2).tip_type
    ? TIP_CONFIG[(currentStep as StepV2).tip_type!]
    : null
  const tipText = useV2 ? (currentStep as StepV2).tip_text : undefined

  const perStepMins = recipe.cook_time_minutes
    ? Math.round(recipe.cook_time_minutes / totalSteps)
    : null

  return (
    <main className="fixed inset-0 bg-p1-cream flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-p1-card border-b border-p1-border-lt shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🍳</span>
          <span className="text-sm font-ui font-bold text-p1-dark truncate">
            {recipe.name}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-ui text-p1-brown">
            {step + 1} / {totalSteps}
          </span>
          <button
            onClick={() => router.back()}
            className="text-p1-brown/60 text-lg leading-none active:opacity-70"
            aria-label="Exit cook mode"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div className="h-1 bg-p1-surface shrink-0">
        <div
          className="h-full bg-p1-terra transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Step content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-8">

        {/* Step number badge */}
        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-8 h-8 rounded-full bg-p1-terra text-white text-xs font-ui font-bold flex items-center justify-center shrink-0">
            {step + 1}
          </span>
          {perStepMins && (
            <span className="text-xs font-ui text-p1-brown">
              ~{perStepMins} min
            </span>
          )}
        </div>

        {/* Step card */}
        <div className="rounded-2xl bg-p1-card border border-p1-border-lt px-5 py-5 mb-5">
          <p className="text-base font-ui text-p1-dark leading-relaxed">
            {currentStep.instruction}
          </p>

          {/* Tip callout */}
          {tip && tipText && (
            <div
              className="mt-4 rounded-xl px-4 py-3"
              style={{
                borderLeft: `3px solid ${tip.borderColor}`,
                backgroundColor: tip.bgColor,
              }}
            >
              <p
                className="text-[10px] font-ui font-bold uppercase tracking-wider mb-1"
                style={{ color: tip.borderColor }}
              >
                {tip.label}
              </p>
              <p className="text-xs font-ui leading-relaxed" style={{ color: tip.textColor }}>
                {tipText}
              </p>
            </div>
          )}
        </div>

        {/* Done state */}
        {isLast && (
          <div className="rounded-2xl bg-p1-forest-lt border border-p1-forest/20 px-5 py-4 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-base font-ui font-bold text-p1-forest">All done!</p>
            <p className="text-sm font-ui text-p1-forest/80 mt-1">
              Enjoy your {recipe.name}.
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 bg-p1-card border-t border-p1-border-lt shrink-0 flex gap-3">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={isFirst}
          className={cn(
            'flex-1 py-3.5 rounded-xl border text-sm font-ui font-semibold transition-opacity',
            isFirst
              ? 'border-p1-border-lt text-p1-brown/30 cursor-not-allowed'
              : 'border-p1-border text-p1-dark active:opacity-70'
          )}
        >
          ← Previous
        </button>
        {isLast ? (
          <button
            onClick={() => router.back()}
            className="flex-1 py-3.5 rounded-xl bg-p1-forest text-white text-sm font-ui font-bold active:opacity-80"
          >
            Done cooking ✓
          </button>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 py-3.5 rounded-xl bg-p1-terra text-white text-sm font-ui font-bold active:opacity-80"
          >
            Next →
          </button>
        )}
      </div>
    </main>
  )
}
