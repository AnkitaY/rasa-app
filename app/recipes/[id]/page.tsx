'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Recipe } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Clock,
  Users,
  Flame,
  Zap,
  Droplets,
  Layers,
  ChefHat,
} from 'lucide-react'

function MacroChip({ icon, label, value, unit, color }: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
  color: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-xl px-4 py-3 flex-1', color)}>
      <div className="mb-1">{icon}</div>
      <span className="text-lg font-bold">{Math.round(value)}{unit}</span>
      <span className="text-[11px] opacity-70">{label}</span>
    </div>
  )
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setRecipe(data as Recipe)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
        <div className="space-y-3 animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </main>
    )
  }

  if (!recipe) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto flex flex-col items-center justify-center gap-3">
        <ChefHat className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Recipe not found.</p>
      </main>
    )
  }

  const macros = recipe.macros_per_serving
  const ingredients = recipe.ingredients ?? []
  const steps = (recipe.steps ?? []) as string[]

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      {/* Back */}
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Title + badges */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold leading-tight mb-2">{recipe.name}</h1>
        <div className="flex flex-wrap gap-2">
          {recipe.cuisine_type && (
            <Badge variant="secondary">{recipe.cuisine_type.replace('_', ' ')}</Badge>
          )}
          {recipe.meal_type && (
            <Badge variant="outline">{recipe.meal_type}</Badge>
          )}
          {recipe.batch_cookable && (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              <Layers className="w-3 h-3 mr-1" />Batch
            </Badge>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
        {recipe.cook_time_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" /> {recipe.cook_time_minutes} min
          </span>
        )}
        {recipe.servings && (
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" /> {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Macros */}
      {macros && (
        <div className="flex gap-2 mb-6">
          <MacroChip
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            label="Protein"
            value={macros.protein_g}
            unit="g"
            color="bg-orange-50"
          />
          <MacroChip
            icon={<Zap className="w-4 h-4 text-yellow-500" />}
            label="Carbs"
            value={macros.carbs_g}
            unit="g"
            color="bg-yellow-50"
          />
          <MacroChip
            icon={<Droplets className="w-4 h-4 text-blue-500" />}
            label="Fat"
            value={macros.fat_g}
            unit="g"
            color="bg-blue-50"
          />
        </div>
      )}

      <Separator className="mb-6" />

      {/* Ingredients */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">
          Ingredients ({ingredients.length})
        </h2>
        <ul className="space-y-2">
          {ingredients.map((ing, i) => (
            <li key={i} className="flex items-baseline gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
              <span className="font-medium">{ing.name}</span>
              {(ing.quantity || ing.unit) && (
                <span className="text-muted-foreground ml-auto shrink-0">
                  {ing.quantity}{ing.unit ? ' ' + ing.unit : ''}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Separator className="mb-6" />

      {/* Steps */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">
          Method ({steps.length} steps)
        </h2>
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed pt-1">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
