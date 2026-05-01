'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Recipe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { ChefHat, Plus, Sparkles, Link as LinkIcon, PenLine } from 'lucide-react'

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRecipes((data as Recipe[]) ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Recipe Bank</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: 'default' })}>
            <Plus className="w-4 h-4 mr-2" />
            Add Recipe
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/recipes/add/generate')}>
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/recipes/add/import')}>
              <LinkIcon className="w-4 h-4" />
              Import from URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/recipes/add/manual')}>
              <PenLine className="w-4 h-4" />
              Add Manually
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <ChefHat className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No recipes yet</h2>
          <p className="text-muted-foreground">
            Generate your first recipe with AI to get started.
          </p>
          <Button onClick={() => router.push('/recipes/add/generate')}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Recipe
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-snug">{recipe.name}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                  {recipe.cuisine_type && (
                    <Badge variant="secondary" className="text-xs">
                      {recipe.cuisine_type.replace('_', ' ')}
                    </Badge>
                  )}
                  {recipe.meal_type && (
                    <Badge variant="outline" className="text-xs">
                      {recipe.meal_type}
                    </Badge>
                  )}
                  {recipe.batch_cookable && (
                    <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                      Batch
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {recipe.macros_per_serving?.protein_g != null && (
                    <span className="font-medium text-foreground">
                      {recipe.macros_per_serving.protein_g}g protein
                    </span>
                  )}
                  {recipe.macros_per_serving?.carbs_g != null && (
                    <span>{recipe.macros_per_serving.carbs_g}g carbs</span>
                  )}
                  {recipe.cook_time_minutes && (
                    <span>{recipe.cook_time_minutes} min</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
