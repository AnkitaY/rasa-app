'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Recipe } from '@/lib/types'
import { getAnonId } from '@/lib/anon'

export default function GenerateRecipePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dishName, setDishName] = useState('')
  const [modifier, setModifier] = useState('')
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

  function validateAndWarn(value: string): boolean {
    const trimmed = value.trim()
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount === 1 && trimmed.length > 0) {
      setWarning(
        `"${trimmed}" is a single word. Add details like cooking method, style, or spice level for a better recipe (e.g. "chicken tikka masala" or "grilled chicken low-carb").`
      )
      return false
    }
    setWarning('')
    return true
  }

  function handleDishNameChange(value: string) {
    setDishName(value)
    if (warning) validateAndWarn(value)
  }

  async function handleGenerate() {
    setError('')
    const isSpecific = validateAndWarn(dishName)
    if (!dishName.trim()) {
      setError('Please enter a dish name.')
      return
    }
    if (!isSpecific) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/recipes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dish_name: dishName, modifier: modifier || undefined, anon_id: getAnonId() }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? 'Failed to generate recipe.')
          return
        }

        const recipe: Recipe = data.recipe
        sessionStorage.setItem('recipe_draft', JSON.stringify(recipe))
        router.push('/recipes/review')
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipes
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>Generate Recipe with AI</CardTitle>
          </div>
          <CardDescription>
            Describe a dish and our AI will create a full home-cook-friendly recipe optimised for
            your household.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="dish-name">Dish name *</Label>
            <Input
              id="dish-name"
              placeholder="e.g. dal makhani, paneer tikka masala, egg bhurji"
              value={dishName}
              onChange={(e) => handleDishNameChange(e.target.value)}
              onBlur={() => validateAndWarn(dishName)}
              disabled={isPending}
            />
            {warning && (
              <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modifier">
              Modifier{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="modifier"
              placeholder="e.g. high protein, no dairy, extra spicy, quick 20-min version"
              value={modifier}
              onChange={(e) => setModifier(e.target.value)}
              rows={2}
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isPending || !dishName.trim()}
          >
            {isPending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating recipe…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Recipe
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
