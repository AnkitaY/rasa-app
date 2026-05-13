'use client'

import { useState, useEffect } from 'react'
import { getAnonId } from '@/lib/anon'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

type RecipeType = 'main' | 'side' | 'salad' | 'complete_meal'
type MealOccasion = 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'any'

const RECIPE_TYPES: { value: RecipeType; label: string }[] = [
  { value: 'main', label: 'Main' },
  { value: 'side', label: 'Side' },
  { value: 'salad', label: 'Salad' },
  { value: 'complete_meal', label: 'Complete meal' },
]

const MEAL_OCCASIONS: { value: MealOccasion; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'any', label: 'Any' },
]

export interface ImportedRecipe {
  id: string
  name: string
  recipe_type: string | null
  meal_type: string | null
  source: string
  source_url: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (recipe: ImportedRecipe) => void
}

export default function ImportRecipeModal({ open, onOpenChange, onImported }: Props) {
  const [name, setName] = useState('')
  const [recipeType, setRecipeType] = useState<RecipeType | null>(null)
  const [mealOccasions, setMealOccasions] = useState<MealOccasion[]>(['any'])
  const [sourceUrl, setSourceUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [nameError, setNameError] = useState('')
  const [typeError, setTypeError] = useState('')
  const [textError, setTextError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const canSave = name.trim().length > 0 && recipeType !== null && rawText.trim().length > 0

  useEffect(() => {
    if (!open) {
      setName('')
      setRecipeType(null)
      setMealOccasions(['any'])
      setSourceUrl('')
      setRawText('')
      setNameError('')
      setTypeError('')
      setTextError('')
      setSaveError('')
    }
  }, [open])

  function toggleMealOccasion(occasion: MealOccasion) {
    if (occasion === 'any') {
      setMealOccasions(['any'])
      return
    }
    setMealOccasions(prev => {
      const withoutAny = prev.filter(o => o !== 'any')
      if (withoutAny.includes(occasion)) {
        const next = withoutAny.filter(o => o !== occasion)
        return next.length === 0 ? ['any'] : next
      }
      return [...withoutAny, occasion]
    })
  }

  async function handleSave() {
    let valid = true
    if (!name.trim()) {
      setNameError('Give this one a name so you can find it later.')
      valid = false
    } else {
      setNameError('')
    }
    if (!recipeType) {
      setTypeError('Pick a type — it helps Rasa build a balanced plan.')
      valid = false
    } else {
      setTypeError('')
    }
    if (!rawText.trim()) {
      setTextError('Rasa needs something to read — paste the recipe text here.')
      valid = false
    } else {
      setTextError('')
    }
    if (!valid) return

    setSaving(true)
    setSaveError('')
    try {
      const anonId = getAnonId()
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id: anonId,
          name: name.trim(),
          raw_text: rawText.trim(),
          recipe_type: recipeType,
          meal_type: mealOccasions,
          source_url: sourceUrl.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveError(json.error || 'Something went wrong.')
        return
      }
      if (!json.recipe?.id || typeof json.recipe?.name !== 'string') {
        setSaveError('Recipe saved but something went wrong loading it. Reload to see it.')
        return
      }
      onImported({
        ...json.recipe,
        source_url: sourceUrl.trim() || null,
      })
      onOpenChange(false)
    } catch {
      setSaveError('Hmm, something went wrong. Give it one more try?')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-p1-card border-0 px-5 py-6 overflow-y-auto max-h-[90dvh]"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-ui font-bold text-p1-dark">
            Add a recipe
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Recipe name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-ui font-semibold text-p1-dark">
              Recipe name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => {
                if (!name.trim()) setNameError('Give this one a name so you can find it later.')
                else setNameError('')
              }}
              placeholder="e.g. Saag paneer, Saturday shakshuka"
              className="w-full px-3.5 py-3 rounded-xl border border-p1-border bg-p1-cream text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors"
            />
            {nameError && (
              <p className="text-xs font-ui text-red-600">{nameError}</p>
            )}
          </div>

          {/* Recipe type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-ui font-semibold text-p1-dark">
              What kind of dish is this?
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Recipe type">
              {RECIPE_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setRecipeType(recipeType === t.value ? null : t.value)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-ui font-semibold border transition-all min-h-[44px]',
                    recipeType === t.value
                      ? 'bg-p1-terra text-white border-p1-terra'
                      : 'bg-p1-surface text-p1-brown border-transparent'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {typeError && (
              <p className="text-xs font-ui text-red-600">{typeError}</p>
            )}
          </div>

          {/* Meal occasion */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-ui font-semibold text-p1-dark">
              When do you eat this?
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Meal occasion">
              {MEAL_OCCASIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggleMealOccasion(o.value)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-ui font-semibold border transition-all min-h-[44px]',
                    mealOccasions.includes(o.value)
                      ? 'bg-p1-terra text-white border-p1-terra'
                      : 'bg-p1-surface text-p1-brown border-transparent'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-ui font-semibold text-p1-dark">
              Where&apos;s this from?{' '}
              <span className="font-normal text-p1-brown">(optional)</span>
            </label>
            <input
              type="text"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="Paste a link — Instagram, YouTube, anywhere"
              className="w-full px-3.5 py-3 rounded-xl border border-p1-border bg-p1-cream text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors"
            />
          </div>

          {/* Recipe text */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-ui font-semibold text-p1-dark">
              Paste the recipe
            </label>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Paste anything — a OneNote note, an Instagram caption, a YouTube description. Rasa reads this when building your plan."
              rows={6}
              className="w-full px-3.5 py-3 rounded-xl border border-p1-border bg-p1-cream text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors resize-none"
            />
            {textError && (
              <p className="text-xs font-ui text-red-600">{textError}</p>
            )}
          </div>

          {saveError && (
            <div className="px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
              <p className="text-sm font-ui text-p1-brown">{saveError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <DialogClose className="text-sm font-ui font-medium text-p1-brown px-2 py-2">
              Cancel
            </DialogClose>
            <button
              type="button"
              onClick={handleSave}
              aria-disabled={!canSave || saving}
              className={cn(
                'px-5 py-3 rounded-xl text-sm font-ui font-semibold transition-colors',
                canSave && !saving
                  ? 'bg-p1-terra text-white active:opacity-80'
                  : 'bg-p1-surface text-p1-brown cursor-not-allowed'
              )}
            >
              {saving ? 'Saving…' : 'Add to bank'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
