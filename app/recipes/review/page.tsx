'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Trash2, BookmarkCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Recipe, Ingredient } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

export default function ReviewRecipePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('recipe_draft')
    if (!raw) {
      router.replace('/recipes/add/generate')
      return
    }
    try {
      setRecipe(JSON.parse(raw) as Recipe)
    } catch {
      router.replace('/recipes/add/generate')
    }
  }, [router])

  function updateField<K extends keyof Recipe>(field: K, value: Recipe[K]) {
    setRecipe((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setRecipe((prev) => {
      if (!prev) return prev
      const ingredients = [...prev.ingredients]
      ingredients[index] = { ...ingredients[index], [field]: value }
      return { ...prev, ingredients }
    })
  }

  function addIngredient() {
    setRecipe((prev) =>
      prev ? { ...prev, ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '' }] } : prev
    )
  }

  function removeIngredient(index: number) {
    setRecipe((prev) =>
      prev ? { ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) } : prev
    )
  }

  function updateStep(index: number, value: string) {
    setRecipe((prev) => {
      if (!prev) return prev
      const steps = [...prev.steps]
      steps[index] = value
      return { ...prev, steps }
    })
  }

  function addStep() {
    setRecipe((prev) => (prev ? { ...prev, steps: [...prev.steps, ''] } : prev))
  }

  function removeStep(index: number) {
    setRecipe((prev) =>
      prev ? { ...prev, steps: prev.steps.filter((_, i) => i !== index) } : prev
    )
  }

  function updateMacro(field: 'protein_g' | 'carbs_g' | 'fat_g', value: string) {
    setRecipe((prev) =>
      prev
        ? {
            ...prev,
            macros_per_serving: {
              protein_g: prev.macros_per_serving?.protein_g ?? 0,
              carbs_g: prev.macros_per_serving?.carbs_g ?? 0,
              fat_g: prev.macros_per_serving?.fat_g ?? 0,
              [field]: parseFloat(value) || 0,
            },
          }
        : prev
    )
  }

  async function handleSave() {
    if (!recipe) return
    setError('')

    startTransition(async () => {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, ...rest } = recipe
      const upsertData = id ? { id, ...rest } : rest

      const { error: dbError } = await supabase
        .from('recipes')
        .upsert(upsertData)
        .select()
        .single()

      if (dbError) {
        setError(dbError.message)
        return
      }

      sessionStorage.removeItem('recipe_draft')
      setSaved(true)
      setTimeout(() => router.push('/recipes'), 1200)
    })
  }

  if (!recipe) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading…</span>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/recipes/add/generate"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <Badge variant="secondary">{recipe.source_type?.replace('_', ' ')}</Badge>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <Label>Recipe Name</Label>
              <Input
                value={recipe.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cuisine Type</Label>
              <Input
                value={recipe.cuisine_type ?? ''}
                onChange={(e) => updateField('cuisine_type', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Meal Type</Label>
              <Input
                value={recipe.meal_type ?? ''}
                onChange={(e) => updateField('meal_type', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Servings</Label>
              <Input
                type="number"
                min={1}
                value={recipe.servings}
                onChange={(e) => updateField('servings', parseInt(e.target.value) || 2)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cook Time (minutes)</Label>
              <Input
                type="number"
                min={0}
                value={recipe.cook_time_minutes ?? ''}
                onChange={(e) => updateField('cook_time_minutes', parseInt(e.target.value) || null)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="batch"
                type="checkbox"
                checked={recipe.batch_cookable}
                onChange={(e) => updateField('batch_cookable', e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="batch">Batch cookable</Label>
            </div>
          </CardContent>
        </Card>

        {/* Macros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Macros per Serving</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Protein (g)</Label>
              <Input
                type="number"
                min={0}
                value={recipe.macros_per_serving?.protein_g ?? ''}
                onChange={(e) => updateMacro('protein_g', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Carbs (g)</Label>
              <Input
                type="number"
                min={0}
                value={recipe.macros_per_serving?.carbs_g ?? ''}
                onChange={(e) => updateMacro('carbs_g', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Fat (g)</Label>
              <Input
                type="number"
                min={0}
                value={recipe.macros_per_serving?.fat_g ?? ''}
                onChange={(e) => updateMacro('fat_g', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Ingredients</CardTitle>
            <Button variant="outline" size="sm" onClick={addIngredient}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input
                  placeholder="Name"
                  className="flex-1"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                />
                <Input
                  placeholder="Qty"
                  className="w-20"
                  value={String(ing.quantity)}
                  onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                />
                <Input
                  placeholder="Unit"
                  className="w-20"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeIngredient(i)}
                  disabled={recipe.ingredients.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Steps</CardTitle>
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-2.5 text-sm text-muted-foreground font-mono w-6 shrink-0">
                  {i + 1}.
                </span>
                <Textarea
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  rows={2}
                  className="flex-1 resize-none"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeStep(i)}
                  disabled={recipe.steps.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
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
