'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Ingredient {
  name: string
  quantity: number | string
  unit: string
}

interface StepV2 {
  instruction: string
  tip_type?: 'TIMING' | 'DONENESS' | 'HEADS_UP' | 'CLEAN'
  tip_text?: string
}

interface PrepAheadItem {
  task: string
  time_sensitive: boolean
}

interface Recipe {
  id: string
  name: string
  cuisine_type: string | null
  meal_type: string | null
  cook_time_minutes: number | null
  servings: number
  ingredients: Ingredient[]
  steps: string[]
  steps_v2: StepV2[] | null
  prep_ahead: PrepAheadItem[] | null
  is_complete_meal: boolean
  source_type: string
  source_url: string | null
}

// ── Tip config ────────────────────────────────────────────────────────────────

const TIP_CONFIG = {
  TIMING: {
    label: '⏱ TIMING REALITY CHECK',
    borderColor: '#D97706',   // amber-600
    bgColor: '#FFFBEB',
    textColor: '#92400E',
  },
  DONENESS: {
    label: '✓ DONENESS SIGNAL',
    borderColor: '#2D5B3F',   // p1-forest
    bgColor: '#E2EDE6',
    textColor: '#2D5B3F',
  },
  HEADS_UP: {
    label: '⚠ HEADS UP',
    borderColor: '#DC2626',   // red-600
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
  },
  CLEAN: {
    label: '✦ CLEAN AS YOU GO',
    borderColor: '#9CA3AF',   // neutral
    bgColor: '#F9FAFB',
    textColor: '#374151',
  },
} as const

// ── Sub-components ────────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: StepV2; index: number }) {
  const tip = step.tip_type ? TIP_CONFIG[step.tip_type] : null
  return (
    <div className="flex gap-3">
      {/* Step number */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-p1-surface flex items-center justify-center mt-0.5">
        <span className="text-xs font-ui font-bold text-p1-brown">{index + 1}</span>
      </div>

      <div className="flex-1 pb-5">
        {/* Instruction */}
        <p className="text-sm font-ui text-p1-dark leading-relaxed">
          {step.instruction}
        </p>

        {/* Tip callout */}
        {tip && step.tip_text && (
          <div
            className="mt-2 rounded-xl px-3 py-2.5"
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
              {step.tip_text}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function IngredientRow({ ingredient, last }: { ingredient: Ingredient; last: boolean }) {
  const qty = typeof ingredient.quantity === 'number'
    ? ingredient.quantity % 1 === 0
      ? ingredient.quantity.toString()
      : ingredient.quantity.toFixed(1)
    : ingredient.quantity

  return (
    <div className={cn(
      'flex items-baseline justify-between py-3 gap-4',
      !last && 'border-b border-p1-border-lt'
    )}>
      <span className="text-sm font-ui text-p1-dark">{ingredient.name}</span>
      <span className="text-sm font-ui text-p1-brown shrink-0 tabular-nums">
        {qty} {ingredient.unit}
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [prepExpanded, setPrepExpanded] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`)
        if (res.ok) {
          const { recipe: data } = await res.json()
          if (data) {
            setRecipe(data as Recipe)
            // Auto-expand prep ahead if any item is time_sensitive
            const prepItems = (data.prep_ahead ?? []) as PrepAheadItem[]
            if (prepItems.some(p => p.time_sensitive)) {
              setPrepExpanded(true)
            }
          }
        }
      } catch {
        /* ignore — not-found handled via recipe === null */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-p1-cream">
        <div className="h-52 bg-p1-dark animate-pulse" />
        <div className="px-5 pt-6 space-y-4">
          <div className="h-5 bg-p1-surface rounded w-3/4 animate-pulse" />
          <div className="h-32 bg-p1-surface rounded-xl animate-pulse" />
          <div className="h-48 bg-p1-surface rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-p1-cream flex flex-col items-center justify-center gap-4 px-8 text-center pb-24">
        <p className="text-lg font-ui font-semibold text-p1-dark">Recipe not found</p>
        <p className="text-sm font-ui text-p1-brown">It may have been removed or the link is broken.</p>
        <button onClick={() => router.back()} className="text-sm font-ui text-p1-terra font-semibold">
          ← Go back
        </button>
      </div>
    )
  }

  const stepsV2: StepV2[] = Array.isArray(recipe.steps_v2) && recipe.steps_v2.length > 0
    ? recipe.steps_v2
    : []
  const legacySteps: string[] = Array.isArray(recipe.steps) ? recipe.steps : []
  const useV2 = stepsV2.length > 0

  const prepItems: PrepAheadItem[] = Array.isArray(recipe.prep_ahead) ? recipe.prep_ahead : []
  const hasPrepAhead = prepItems.length > 0

  const tags = [
    recipe.cuisine_type,
    recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min` : null,
    `Serves ${recipe.servings}`,
    recipe.is_complete_meal ? 'Complete meal' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-p1-cream">

      {/* ── Dark header ─────────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-12 pb-7"
        style={{ backgroundColor: '#2B1C12' }}
      >
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/60 text-sm font-ui mb-5 active:opacity-70"
        >
          <span className="text-base leading-none">←</span>
          <span>Back</span>
        </button>

        {/* Title */}
        <h1 className="text-xl font-ui font-bold text-white leading-snug">
          {recipe.name}
        </h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map(tag => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-[11px] font-ui font-semibold text-white/70"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Action row ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex gap-3 border-b border-p1-border-lt bg-p1-card">
        <button
          onClick={() => router.push('/planner')}
          className="flex-1 py-3 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold active:opacity-80"
        >
          Let&apos;s cook
        </button>
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl border border-p1-border bg-p1-card text-p1-dark text-sm font-ui font-medium active:opacity-70"
        >
          ← Back to plan
        </button>
      </div>

      <div className="px-5 pb-16 space-y-6 pt-5">

        {/* ── Prep ahead ──────────────────────────────────────────────────── */}
        {hasPrepAhead && (
          <section className="rounded-2xl bg-p1-card border border-p1-border-lt overflow-hidden">
            <button
              onClick={() => setPrepExpanded(e => !e)}
              className="w-full flex items-center justify-between px-4 py-4"
            >
              <span className="text-sm font-ui font-bold text-p1-dark">
                ⏰ Prep ahead
              </span>
              <span className="text-p1-brown text-sm">{prepExpanded ? '▲' : '▼'}</span>
            </button>

            {prepExpanded && (
              <div className="px-4 pb-4 space-y-2 border-t border-p1-border-lt pt-3">
                {prepItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={cn(
                      'shrink-0 w-4 h-4 rounded-full mt-0.5 flex items-center justify-center text-[9px]',
                      item.time_sensitive
                        ? 'bg-p1-terra text-white'
                        : 'bg-p1-surface text-p1-brown'
                    )}>
                      {item.time_sensitive ? '!' : '·'}
                    </span>
                    <p className="text-sm font-ui text-p1-dark leading-relaxed">
                      {item.task}
                      {item.time_sensitive && (
                        <span className="ml-1.5 text-[10px] font-semibold text-p1-terra uppercase tracking-wide">
                          time-sensitive
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Ingredients ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-ui font-bold text-p1-dark mb-3">
            Ingredients
          </h2>
          <div className="rounded-2xl bg-p1-card border border-p1-border-lt px-4">
            {recipe.ingredients.map((ing, i) => (
              <IngredientRow
                key={i}
                ingredient={ing}
                last={i === recipe.ingredients.length - 1}
              />
            ))}
          </div>
        </section>

        {/* ── Method ──────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-ui font-bold text-p1-dark mb-4">
            Method
          </h2>

          {useV2 ? (
            <div>
              {stepsV2.map((step, i) => (
                <StepCard key={i} step={step} index={i} />
              ))}
            </div>
          ) : legacySteps.length > 0 ? (
            <div className="space-y-4">
              {legacySteps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-p1-surface flex items-center justify-center mt-0.5">
                    <span className="text-xs font-ui font-bold text-p1-brown">{i + 1}</span>
                  </div>
                  <p className="text-sm font-ui text-p1-dark leading-relaxed pt-1">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-ui text-p1-brown italic">
              No steps available for this recipe.
            </p>
          )}
        </section>

        {/* ── Source attribution ───────────────────────────────────────────── */}
        {recipe.source_url && (
          <p className="text-xs font-ui text-p1-brown/60 text-center">
            Imported from{' '}
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {new URL(recipe.source_url).hostname}
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
