'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Recipe } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChefHat, Plus, Sparkles, Link as LinkIcon, PenLine, Search, X } from 'lucide-react'

const CUISINE_FILTERS = ['All', 'Indian', 'North Indian', 'South Indian', 'Continental', 'Chinese', 'Mediterranean', 'Other']
const MEAL_FILTERS = ['All meals', 'Brunch', 'Dinner']

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState('All')
  const [mealFilter, setMealFilter] = useState('All meals')

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

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const q = search.toLowerCase()
      const matchesSearch = !q || r.name.toLowerCase().includes(q) || (r.cuisine_type ?? '').toLowerCase().includes(q)
      const matchesCuisine = cuisineFilter === 'All' || (r.cuisine_type ?? '').toLowerCase().replace('_', ' ') === cuisineFilter.toLowerCase()
      const matchesMeal = mealFilter === 'All meals' || (r.meal_type ?? '').toLowerCase() === mealFilter.toLowerCase()
      return matchesSearch && matchesCuisine && matchesMeal
    })
  }, [recipes, search, cuisineFilter, mealFilter])

  const hasActiveFilter = cuisineFilter !== 'All' || mealFilter !== 'All meals' || search !== ''

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-rasa-slate" />
          <h1 className="font-serif text-2xl font-bold text-rasa-ink">Recipe Bank</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'default' }), 'font-display font-semibold')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Recipe
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-rasa-oat border-rasa-stone">
            <DropdownMenuItem onClick={() => router.push('/recipes/add/generate')} className="font-display">
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/recipes/add/import')} className="font-display">
              <LinkIcon className="w-4 h-4" />
              Import from URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/recipes/add/manual')} className="font-display">
              <PenLine className="w-4 h-4" />
              Add Manually
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Search input ───────────────────────────────────────────── */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-rasa-stone bg-rasa-oat text-sm font-display text-rasa-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rasa-slate/30 focus:border-rasa-slate transition"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-rasa-ink">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Filter chips ───────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-5">
        {/* Cuisine chips */}
        {['All', 'Indian', 'North Indian', 'South Indian', 'Continental', 'Chinese'].map((c) => (
          <button
            key={c}
            onClick={() => setCuisineFilter(c)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold border transition-all',
              cuisineFilter === c
                ? 'bg-rasa-slate text-white border-rasa-slate'
                : 'bg-rasa-mist text-muted-foreground border-rasa-stone hover:border-rasa-slate/50'
            )}
          >
            {c}
          </button>
        ))}
        <div className="w-px h-6 bg-rasa-stone self-center mx-1 shrink-0" />
        {/* Meal type chips */}
        {MEAL_FILTERS.map((m) => (
          <button
            key={m}
            onClick={() => setMealFilter(m)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold border transition-all',
              mealFilter === m
                ? 'bg-rasa-fern text-white border-rasa-fern'
                : 'bg-rasa-mist text-muted-foreground border-rasa-stone hover:border-rasa-fern/50'
            )}
          >
            {m}
          </button>
        ))}
        {hasActiveFilter && (
          <button
            onClick={() => { setSearch(''); setCuisineFilter('All'); setMealFilter('All meals') }}
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold border border-rasa-terra/50 text-rasa-terra bg-orange-50 hover:bg-orange-100 flex items-center gap-1 transition-all"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Results count ─────────────────────────────────────────── */}
      {!loading && recipes.length > 0 && (
        <p className="text-xs font-display text-muted-foreground mb-3">
          {filtered.length} of {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          {hasActiveFilter ? ' matched' : ''}
        </p>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-rasa-stone bg-rasa-mist h-24" />
          ))}
        </div>
      ) : recipes.length === 0 ? (

        /* ── Empty state (no recipes at all) ───────────────────────── */
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rasa-mist flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-xl font-bold text-rasa-ink">No recipes yet</h2>
          <p className="font-display text-sm text-muted-foreground max-w-xs">
            Generate your first recipe with AI to get started.
          </p>
          <button
            onClick={() => router.push('/recipes/add/generate')}
            className={cn(buttonVariants({ variant: 'default' }), 'font-display font-semibold')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Recipe
          </button>
        </div>
      ) : filtered.length === 0 ? (

        /* ── Empty state (filter returns nothing) ─────────────────── */
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Search className="w-10 h-10 text-muted-foreground" />
          <h2 className="font-serif text-lg font-bold text-rasa-ink">No matches</h2>
          <p className="font-display text-sm text-muted-foreground">Try a different search or filter.</p>
          <button
            onClick={() => { setSearch(''); setCuisineFilter('All'); setMealFilter('All meals') }}
            className="text-sm font-display font-bold text-rasa-slate hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (

        /* ── Recipe grid ───────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => router.push(`/recipes/${recipe.id}`)}
              className="text-left rounded-2xl border border-rasa-stone bg-rasa-oat hover:border-rasa-slate/40 hover:shadow-sm transition-all px-4 py-3.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-sm text-rasa-ink leading-snug flex-1">{recipe.name}</h3>
                {recipe.batch_cookable && (
                  <Badge className="text-[10px] bg-rasa-sprout text-rasa-fern border-0 shrink-0 font-display">
                    Batch
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {recipe.cuisine_type && (
                  <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-rasa-mist border border-rasa-stone text-muted-foreground">
                    {recipe.cuisine_type.replace('_', ' ')}
                  </span>
                )}
                {recipe.meal_type && (
                  <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-rasa-mist border border-rasa-stone text-muted-foreground capitalize">
                    {recipe.meal_type}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-code">
                {recipe.macros_per_serving?.protein_g != null && (
                  <span className="font-bold text-rasa-fern">
                    {recipe.macros_per_serving.protein_g}g protein
                  </span>
                )}
                {recipe.macros_per_serving?.carbs_g != null && (
                  <span className="text-muted-foreground">{recipe.macros_per_serving.carbs_g}g carbs</span>
                )}
                {recipe.cook_time_minutes && (
                  <span className="text-muted-foreground ml-auto">{recipe.cook_time_minutes} min</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Cuisine filter chips reference used below — satisfy TS */}
      <div className="hidden">{CUISINE_FILTERS.join('')}</div>
    </main>
  )
}
