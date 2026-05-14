'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Trash2, BookmarkCheck, AlertCircle, PenLine } from 'lucide-react'
import Link from 'next/link'
import { Ingredient, MacrosPerServing } from '@/lib/types'
import { getAnonId } from '@/lib/anon'

// ─── constants ────────────────────────────────────────────────────────────────

const CUISINE_OPTIONS = [
  '', 'North Indian', 'South Indian', 'Bengali', 'Gujarati', 'Punjabi',
  'Continental', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Other',
]

const MEAL_OPTIONS = ['', 'breakfast', 'lunch', 'dinner', 'snack']

// ─── types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string
  ingredients?: string
  steps?: string
}

// ─── sub-components ───────────────────────────────────────────────────────────

function IngredientRow({
  ingredient,
  index,
  onChange,
  onRemove,
  disableRemove,
}: {
  ingredient: Ingredient
  index: number
  onChange: (index: number, field: keyof Ingredient, value: string) => void
  onRemove: (index: number) => void
  disableRemove: boolean
}) {
  return (
    <div className="flex gap-2 items-start">
      <Input
        placeholder="Ingredient name"
        className="flex-1 min-w-0"
        value={ingredient.name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
        aria-label={`Ingredient ${index + 1} name`}
      />
      <Input
        placeholder="Qty"
        className="w-20 shrink-0"
        value={String(ingredient.quantity)}
        onChange={(e) => onChange(index, 'quantity', e.target.value)}
        aria-label={`Ingredient ${index + 1} quantity`}
      />
      <Input
        placeholder="Unit"
        className="w-20 shrink-0"
        value={ingredient.unit}
        onChange={(e) => onChange(index, 'unit', e.target.value)}
        aria-label={`Ingredient ${index + 1} unit`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
        disabled={disableRemove}
        aria-label={`Remove ingredient ${index + 1}`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}

function StepRow({
  step,
  index,
  onChange,
  onRemove,
  disableRemove,
}: {
  step: string
  index: number
  onChange: (index: number, value: string) => void
  onRemove: (index: number) => void
  disableRemove: boolean
}) {
  return (
    <div className="flex gap-2 items-start">
      <span className="mt-2.5 text-sm font-mono text-muted-foreground w-6 shrink-0">
        {index + 1}.
      </span>
      <Textarea
        value={step}
        onChange={(e) => onChange(index, e.target.value)}
        rows={2}
        className="flex-1 resize-none"
        placeholder={`Step ${index + 1}`}
        aria-label={`Step ${index + 1}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
        disabled={disableRemove}
        aria-label={`Remove step ${index + 1}`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function ManualRecipePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Basic info
  const [name, setName] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [mealType, setMealType] = useState('')
  const [servings, setServings] = useState(2)
  const [cookTime, setCookTime] = useState<number | ''>('')
  const [batchCookable, setBatchCookable] = useState(false)

  // Macros
  const [macros, setMacros] = useState<MacrosPerServing>({ protein_g: 0, carbs_g: 0, fat_g: 0 })

  // Dynamic lists
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '', unit: '' },
  ])
  const [steps, setSteps] = useState<string[]>([''])

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState('')
  const [saved, setSaved] = useState(false)

  // ── ingredient handlers ────────────────────────────────────────────────────

  function handleIngredientChange(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }])
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  // ── step handlers ──────────────────────────────────────────────────────────

  function handleStepChange(index: number, value: string) {
    setSteps((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function addStep() {
    setSteps((prev) => [...prev, ''])
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // ── macro handler ──────────────────────────────────────────────────────────

  function handleMacroChange(field: keyof MacrosPerServing, value: string) {
    setMacros((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }))
  }

  // ── validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Recipe name is required.'
    }

    const filledIngredients = ingredients.filter((ing) => ing.name.trim() !== '')
    if (filledIngredients.length === 0) {
      newErrors.ingredients = 'Add at least one ingredient.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  function handleSave() {
    setApiError('')
    if (!validate()) return

    const filledIngredients = ingredients.filter((ing) => ing.name.trim() !== '')

    startTransition(async () => {
      try {
        const res = await fetch('/api/recipes/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anon_id: getAnonId(),
            name: name.trim(),
            cuisine_type: cuisineType || null,
            meal_type: mealType || null,
            servings,
            cook_time_minutes: cookTime !== '' ? cookTime : null,
            ingredients: filledIngredients,
            steps,
            macros_per_serving: macros,
            batch_cookable: batchCookable,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setApiError(data.error ?? 'Failed to save recipe.')
          return
        }

        setSaved(true)
        setTimeout(() => router.push(`/recipes/${data.recipe.id}`), 800)
      } catch {
        setApiError('Network error. Please try again.')
      }
    })
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-3xl mx-auto pb-24">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipes
        </Link>
      </div>

      {/* Page heading */}
      <div className="flex items-center gap-2 mb-6">
        <PenLine className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Add Recipe Manually</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter a family recipe or one you know by heart.
          </p>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Name — full width */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="recipe-name">
                Recipe Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipe-name"
                placeholder="e.g. Maa ki Dal, Palak Paneer, Egg Bhurji"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                }}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Cuisine Type */}
            <div className="space-y-1.5">
              <Label htmlFor="cuisine-type">Cuisine Type</Label>
              <select
                id="cuisine-type"
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CUISINE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || 'Select cuisine…'}
                  </option>
                ))}
              </select>
            </div>

            {/* Meal Type */}
            <div className="space-y-1.5">
              <Label htmlFor="meal-type">Meal Type</Label>
              <select
                id="meal-type"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {MEAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || 'Select meal…'}
                  </option>
                ))}
              </select>
            </div>

            {/* Servings */}
            <div className="space-y-1.5">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 2)}
              />
            </div>

            {/* Cook Time */}
            <div className="space-y-1.5">
              <Label htmlFor="cook-time">Cook Time (minutes)</Label>
              <Input
                id="cook-time"
                type="number"
                min={0}
                placeholder="e.g. 30"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Batch cookable */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="batch-cookable"
                type="checkbox"
                checked={batchCookable}
                onChange={(e) => setBatchCookable(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <Label htmlFor="batch-cookable" className="cursor-pointer font-normal">
                Batch cookable (good for meal prep)
              </Label>
            </div>

          </CardContent>
        </Card>

        {/* ── Macros ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Macros per Serving</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                min={0}
                placeholder="0"
                value={macros.protein_g || ''}
                onChange={(e) => handleMacroChange('protein_g', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                min={0}
                placeholder="0"
                value={macros.carbs_g || ''}
                onChange={(e) => handleMacroChange('carbs_g', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                min={0}
                placeholder="0"
                value={macros.fat_g || ''}
                onChange={(e) => handleMacroChange('fat_g', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Ingredients ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Ingredients</CardTitle>
              {errors.ingredients && (
                <p className="text-xs text-red-500 mt-0.5">{errors.ingredients}</p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Column headers */}
            <div className="flex gap-2 text-xs text-muted-foreground px-0 mb-1">
              <span className="flex-1">Name</span>
              <span className="w-20">Quantity</span>
              <span className="w-20">Unit</span>
              <span className="w-9" />
            </div>
            {ingredients.map((ing, i) => (
              <IngredientRow
                key={i}
                ingredient={ing}
                index={i}
                onChange={(idx, field, value) => {
                  handleIngredientChange(idx, field, value)
                  if (errors.ingredients) setErrors((prev) => ({ ...prev, ingredients: undefined }))
                }}
                onRemove={removeIngredient}
                disableRemove={ingredients.length <= 1}
              />
            ))}
          </CardContent>
        </Card>

        {/* ── Steps ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Steps</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                index={i}
                onChange={handleStepChange}
                onRemove={removeStep}
                disableRemove={steps.length <= 1}
              />
            ))}
          </CardContent>
        </Card>

        {/* ── API error ──────────────────────────────────────────────────── */}
        {apiError && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* ── Save button ────────────────────────────────────────────────── */}
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={handleSave}
          disabled={isPending || saved}
        >
          {saved ? (
            <>
              <BookmarkCheck className="w-4 h-4 mr-2" />
              Saved! Redirecting…
            </>
          ) : isPending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving…
            </>
          ) : (
            <>
              <BookmarkCheck className="w-4 h-4 mr-2" />
              Save to Recipe Bank
            </>
          )}
        </Button>

      </div>
    </main>
  )
}
