'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Recipe } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, Sparkles, Link as LinkIcon, PenLine, Search, X } from 'lucide-react'

const CUISINE_FILTERS = ['All', 'Indian', 'Italian', 'Thai', 'Mexican', 'Mediterranean', 'Japanese', 'Chinese', 'Korean', 'Other']

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState('All')

  useEffect(() => {
    createClient()
      .from('recipes')
      .select('*')
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRecipes((data as Recipe[]) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      const q = search.toLowerCase()
      const matchesSearch = !q
        || r.name.toLowerCase().includes(q)
        || (r.cuisine_type ?? '').toLowerCase().includes(q)
      const matchesCuisine = cuisineFilter === 'All'
        || (r.cuisine_type ?? '').toLowerCase().includes(cuisineFilter.toLowerCase())
      return matchesSearch && matchesCuisine
    })
  }, [recipes, search, cuisineFilter])

  const hasFilter = cuisineFilter !== 'All' || search !== ''

  return (
    <main className="min-h-screen bg-p1-cream px-5 pt-12 pb-24">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-ui font-bold text-p1-dark">Recipe bank</h1>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'default' }),
              'font-ui font-semibold text-xs px-3 py-2 h-auto rounded-xl bg-p1-terra border-0 text-white'
            )}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add recipe
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/recipes/add/generate')} className="font-ui">
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/recipes/add/manual')} className="font-ui">
              <PenLine className="w-4 h-4" />
              Add manually
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/recipes/add/import')} className="font-ui">
              <LinkIcon className="w-4 h-4" />
              Import from URL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-p1-brown/50 pointer-events-none" />
        <input
          type="text"
          placeholder="Search recipes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-3 rounded-xl border border-p1-border bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-p1-brown/50"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Cuisine filter chips ─────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4 scrollbar-hide">
        {CUISINE_FILTERS.map(c => (
          <button
            key={c}
            onClick={() => setCuisineFilter(c)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
              cuisineFilter === c
                ? 'bg-p1-terra text-white border-p1-terra'
                : 'bg-p1-card text-p1-brown border-p1-border'
            )}
          >
            {c}
          </button>
        ))}
        {hasFilter && (
          <button
            onClick={() => { setSearch(''); setCuisineFilter('All') }}
            className="shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border border-p1-terra/40 text-p1-terra bg-p1-terra-lt"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Count ───────────────────────────────────────────────────────── */}
      {!loading && recipes.length > 0 && (
        <p className="text-xs font-ui text-p1-brown mb-3">
          {filtered.length} of {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          {hasFilter ? ' matched' : ''}
        </p>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-p1-surface animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty — no recipes at all ─────────────────────────────────── */}
      {!loading && recipes.length === 0 && (
        <div className="flex flex-col items-center text-center pt-16 gap-4">
          <span className="text-5xl">📖</span>
          <div>
            <p className="text-base font-ui font-semibold text-p1-dark">
              Your recipe bank is empty
            </p>
            <p className="text-sm font-ui text-p1-brown mt-1 max-w-xs">
              Your bank fills up the moment you plan your first week — or add a recipe now.
            </p>
          </div>
          <button
            onClick={() => router.push('/planner/generate')}
            className="px-5 py-3 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold active:opacity-80"
          >
            Plan my first week →
          </button>
        </div>
      )}

      {/* ── Empty — filter matched nothing ───────────────────────────── */}
      {!loading && recipes.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center text-center pt-12 gap-3">
          <span className="text-4xl">🔍</span>
          <p className="text-base font-ui font-semibold text-p1-dark">Nothing matched that</p>
          <p className="text-sm font-ui text-p1-brown">Try tweaking the search or filters.</p>
          <button
            onClick={() => { setSearch(''); setCuisineFilter('All') }}
            className="text-sm font-ui font-semibold text-p1-terra"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Recipe grid ─────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(recipe => (
            <button
              key={recipe.id}
              onClick={() => router.push(`/recipes/${recipe.id}`)}
              className="w-full text-left rounded-2xl border border-p1-border bg-p1-card px-4 py-4 active:opacity-80 transition-opacity"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-ui font-bold text-p1-dark leading-snug flex-1">
                  {recipe.name}
                </h3>
                {recipe.cook_time_minutes && (
                  <span className="text-xs font-ui text-p1-brown shrink-0 mt-0.5">
                    {recipe.cook_time_minutes} min
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {recipe.cuisine_type && (
                  <span className="text-[10px] font-ui font-semibold px-2.5 py-1 rounded-full bg-p1-surface text-p1-brown">
                    {recipe.cuisine_type.replace('_', ' ')}
                  </span>
                )}
                {recipe.meal_type && (
                  <span className="text-[10px] font-ui font-semibold px-2.5 py-1 rounded-full bg-p1-surface text-p1-brown capitalize">
                    {recipe.meal_type}
                  </span>
                )}
                {(recipe as Recipe & { is_complete_meal?: boolean }).is_complete_meal && (
                  <span className="text-[10px] font-ui font-semibold px-2.5 py-1 rounded-full bg-p1-forest-lt text-p1-forest">
                    Complete meal
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
