'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
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

interface PrepAheadV2 {
  tonight: string
  tomorrow: string
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
  prep_ahead: PrepAheadV2 | PrepAheadItem[] | null
  assembly_time_mins: number | null
  is_complete_meal: boolean
  source_type: string
  source_url: string | null
  raw_text: string | null
}

// ── Prep ahead helpers ────────────────────────────────────────────────────────

function isPrepAheadV2(pa: unknown): pa is PrepAheadV2 {
  return typeof pa === 'object' && pa !== null && !Array.isArray(pa)
    && typeof (pa as PrepAheadV2).tonight === 'string'
}

function isSingleStep(text: string): boolean {
  return !text.includes('\n') && !/^\d+\./.test(text.trim())
}

// ── PrepAheadSection component ────────────────────────────────────────────────

function PrepAheadSection({ recipe }: { recipe: Recipe }) {
  if (!isPrepAheadV2(recipe.prep_ahead)) return null

  const pa = recipe.prep_ahead
  const assemblyMins = recipe.assembly_time_mins

  // Build intro line
  let introLine: string | null = null
  if (assemblyMins === null) {
    introLine = 'Do this tonight and tomorrow morning is easy.'
  } else if (assemblyMins > 0) {
    introLine = `Do this tonight and tomorrow morning takes ${assemblyMins} minutes.`
  }
  // assemblyMins === 0 → omit intro line entirely

  const tonightText = pa.tonight
  const single = isSingleStep(tonightText)

  // Parse multi-step lines
  const stepLines = single
    ? []
    : tonightText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => l.replace(/^\d+\.\s*/, ''))

  return (
    <>
      <hr className="border-p1-surface" />
      <section className="pt-5">
        <h2 className="text-base font-ui font-semibold text-p1-dark mb-2">
          Prep ahead
        </h2>

        {introLine && (
          <p className="text-sm font-ui text-p1-brown mb-3">
            {introLine}
          </p>
        )}

        {single ? (
          <p className="text-sm font-ui text-p1-dark leading-relaxed">
            {tonightText}
          </p>
        ) : (
          <ol className="space-y-2 mb-3">
            {stepLines.map((line, i) => (
              <li key={i} className="flex gap-2.5 text-sm font-ui text-p1-dark leading-relaxed">
                <span className="shrink-0 font-semibold text-p1-terra">{i + 1}.</span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        )}

        {assemblyMins !== null && assemblyMins > 0 && (
          <p className="text-xs font-ui text-p1-brown mt-3">
            Assembly time tomorrow: {assemblyMins} min
          </p>
        )}
      </section>
    </>
  )
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
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [toastVisible, setToastVisible] = useState(searchParams.get('toast') === 'saved')

  useEffect(() => {
    if (toastVisible) {
      router.replace(pathname)
      const t = setTimeout(() => setToastVisible(false), 4000)
      return () => clearTimeout(t)
    }
  }, [toastVisible, pathname, router])

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`)
        if (res.ok) {
          const { recipe: data } = await res.json()
          if (data) {
            setRecipe(data as Recipe)
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
      <main className="min-h-screen bg-p1-cream">
        <div className="h-52 bg-p1-dark animate-pulse" />
        <div className="px-5 pt-6 space-y-4">
          <div className="h-5 bg-p1-surface rounded w-3/4 animate-pulse" />
          <div className="h-32 bg-p1-surface rounded-xl animate-pulse" />
          <div className="h-48 bg-p1-surface rounded-xl animate-pulse" />
        </div>
      </main>
    )
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-p1-cream flex flex-col items-center justify-center gap-4 px-8 text-center pb-24">
        <p className="text-lg font-ui font-semibold text-p1-dark">Recipe not found</p>
        <p className="text-sm font-ui text-p1-brown">It may have been removed or the link is broken.</p>
        <button onClick={() => router.back()} className="text-sm font-ui text-p1-terra font-semibold">
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

  const tags = [
    recipe.cuisine_type,
    recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min` : null,
    `Serves ${recipe.servings}`,
    recipe.is_complete_meal ? 'Complete meal' : null,
  ].filter(Boolean) as string[]

  return (
    <main className="min-h-screen bg-p1-cream">

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
          onClick={() => router.push(`/cook/${recipe.id}`)}
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

      <div className="px-4 pb-24 pt-5">

        {/* ── Ingredients ─────────────────────────────────────────────────── */}
        {(recipe.ingredients ?? []).length > 0 && (
          <section className="mb-6">
            <h2 className="text-base font-ui font-bold text-p1-dark mb-3">
              Ingredients
            </h2>
            <div className="rounded-2xl bg-p1-card border border-p1-border-lt px-4">
              {(recipe.ingredients ?? []).map((ing, i) => (
                <IngredientRow
                  key={i}
                  ingredient={ing}
                  last={i === (recipe.ingredients ?? []).length - 1}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Prep ahead ──────────────────────────────────────────────────── */}
        <PrepAheadSection recipe={recipe} />

        {/* ── Method ──────────────────────────────────────────────────────── */}
        <section className="mt-6">
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
          ) : recipe.raw_text ? (
            <div className="rounded-2xl bg-p1-card border border-p1-border-lt px-4 py-4">
              <p className="text-sm font-ui text-p1-dark leading-relaxed whitespace-pre-wrap">
                {recipe.raw_text}
              </p>
            </div>
          ) : (
            <p className="text-sm font-ui text-p1-brown italic">
              No steps available for this recipe.
            </p>
          )}
        </section>

        {/* ── Source attribution ───────────────────────────────────────────── */}
        {recipe.source_url && (
          <p className="mt-6 text-xs font-ui text-p1-brown/60 text-center">
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

      {/* ── Save-success toast ───────────────────────────────────────────── */}
      {toastVisible && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-p1-dark text-white text-sm font-ui font-medium px-5 py-3 rounded-full shadow-lg whitespace-nowrap">
          Saved. It&apos;s in your bank and ready for your next plan.
        </div>
      )}

    </main>
  )
}
