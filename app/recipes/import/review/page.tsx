'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { getAnonId } from '@/lib/anon'
import DuplicateNameSheet from '@/app/components/DuplicateNameSheet'

interface ParsedDraft {
  parsed: {
    name: string | null
    meal_type: 'breakfast' | 'lunch' | 'dinner' | null
    cook_time_minutes: number | null
    servings: number | null
    cuisine_type: string | null
    ingredients: { name: string; quantity: string; unit: string }[]
    steps_v2: { instruction: string }[]
  }
  rawText: string
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export default function ImportReviewPage() {
  const router = useRouter()
  const nameRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<ParsedDraft | null>(null)
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showDuplicateSheet, setShowDuplicateSheet] = useState(false)
  const [suggestedName, setSuggestedName] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('import_draft')
    if (!raw) {
      router.replace('/recipes/add/import')
      return
    }
    try {
      const parsed = JSON.parse(raw) as ParsedDraft
      setDraft(parsed)
      setName(parsed.parsed.name ?? '')
      setMealType(parsed.parsed.meal_type)
      setTimeout(() => nameRef.current?.focus(), 100)
    } catch {
      router.replace('/recipes/add/import')
    }
  }, [router])

  async function attemptSave(nameToSave: string) {
    if (!draft || saving) return
    setSaving(true)
    setSaveError(null)

    const anon_id = getAnonId()
    if (!anon_id) {
      setSaveError('Something went wrong. Give it one more try?')
      setSaving(false)
      return
    }

    const payload = {
      anon_id,
      name: nameToSave.trim(),
      meal_type: mealType,
      cook_time_minutes: draft.parsed.cook_time_minutes,
      servings: draft.parsed.servings,
      cuisine_type: draft.parsed.cuisine_type,
      ingredients: draft.parsed.ingredients,
      steps_v2: draft.parsed.steps_v2,
      raw_text: draft.rawText,
    }

    try {
      const res = await fetch('/api/recipes/import-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as
        | { recipe: { id: string; name: string } }
        | { error: string; code: string; suggestedName?: string }

      if (!res.ok || 'error' in data) {
        const errData = data as { error: string; code: string; suggestedName?: string }
        if (errData.code === 'DUPLICATE_NAME') {
          setSuggestedName(errData.suggestedName ?? `${nameToSave.trim()} — v2`)
          setShowDuplicateSheet(true)
          setSaving(false)
          return
        }
        setSaveError(errData.error)
        setSaving(false)
        return
      }

      const { recipe } = data as { recipe: { id: string; name: string } }
      sessionStorage.removeItem('import_draft')
      router.push(`/recipes/${recipe.id}?toast=saved`)
      setSaving(false)
    } catch {
      setSaveError('Something went wrong while saving. Give it one more try?')
      setSaving(false)
    }
  }

  function handleDuplicateSave(confirmedName: string) {
    setShowDuplicateSheet(false)
    attemptSave(confirmedName)
  }

  if (!draft) {
    return (
      <main className="min-h-screen bg-p1-cream flex items-center justify-center">
        <p className="text-sm font-ui text-p1-brown">Loading…</p>
      </main>
    )
  }

  const { parsed } = draft
  const showMealTypeChips = parsed.meal_type === null
  const ingredientCount = parsed.ingredients.length
  const stepCount = parsed.steps_v2.length

  return (
    <>
      <main className="min-h-screen bg-p1-cream pb-32">
        <div className="px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-p1-brown active:opacity-60 min-w-[44px] min-h-[44px] flex items-center"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-ui font-bold text-p1-dark">Review Recipe</h1>
        </div>

        <div className="px-5 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="recipe-name" className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
              Recipe Name
            </label>
            <input
              id="recipe-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-p1-border bg-p1-card text-base font-ui font-semibold text-p1-dark focus:outline-none focus:border-p1-terra transition-colors"
              placeholder="Recipe name"
            />
          </div>

          {showMealTypeChips && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
                Meal Type
              </legend>
              <div className="flex gap-2 flex-wrap">
                {(['breakfast', 'lunch', 'dinner'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMealType(type === mealType ? null : type)}
                    className={[
                      'px-4 py-2 rounded-full text-sm font-ui font-medium transition-colors min-h-[44px]',
                      mealType === type
                        ? 'bg-p1-terra text-white'
                        : 'bg-p1-card border border-p1-border text-p1-brown',
                    ].join(' ')}
                  >
                    {MEAL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {parsed.cook_time_minutes !== null && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-p1-card border border-p1-border-lt">
              <span className="text-sm font-ui text-p1-brown">Cook time</span>
              <span className="ml-auto text-sm font-ui font-semibold text-p1-dark">
                {parsed.cook_time_minutes} min
              </span>
            </div>
          )}

          <div className="rounded-xl border border-p1-border-lt bg-p1-card overflow-hidden">
            <button
              onClick={() => setIngredientsOpen((o) => !o)}
              aria-expanded={ingredientsOpen}
              className="w-full flex items-center justify-between px-4 py-3.5 min-h-[44px]"
            >
              <span className="text-sm font-ui font-semibold text-p1-dark">
                {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
              </span>
              {ingredientsOpen ? <ChevronUp className="w-4 h-4 text-p1-brown" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-p1-brown" aria-hidden="true" />}
            </button>
            {ingredientsOpen && (
              <ul className="px-4 pb-4 space-y-1.5 border-t border-p1-border-lt">
                {parsed.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm font-ui text-p1-dark">
                    {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-p1-border-lt bg-p1-card overflow-hidden">
            <button
              onClick={() => setStepsOpen((o) => !o)}
              aria-expanded={stepsOpen}
              className="w-full flex items-center justify-between px-4 py-3.5 min-h-[44px]"
            >
              <span className="text-sm font-ui font-semibold text-p1-dark">
                {stepCount} step{stepCount !== 1 ? 's' : ''}
              </span>
              {stepsOpen ? <ChevronUp className="w-4 h-4 text-p1-brown" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-p1-brown" aria-hidden="true" />}
            </button>
            {stepsOpen && (
              <ol className="px-4 pb-4 space-y-2 border-t border-p1-border-lt">
                {parsed.steps_v2.map((step, i) => (
                  <li key={i} className="text-sm font-ui text-p1-dark">
                    <span className="font-semibold text-p1-brown mr-2">{i + 1}.</span>
                    {step.instruction}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {saveError && (
            <div role="alert" className="px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
              <p className="text-sm font-ui text-p1-brown">{saveError}</p>
            </div>
          )}
        </div>
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 bg-p1-cream border-t border-p1-border-lt px-5 pt-4"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => attemptSave(name)}
          disabled={!name.trim() || saving}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80 min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save Recipe'}
        </button>
      </div>

      <DuplicateNameSheet
        open={showDuplicateSheet}
        originalName={name}
        suggestedName={suggestedName}
        onSave={handleDuplicateSave}
        onCancel={() => setShowDuplicateSheet(false)}
      />
    </>
  )
}
