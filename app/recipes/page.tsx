'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getAnonId } from '@/lib/anon'
import { Recipe } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Plus, ExternalLink, X, Search } from 'lucide-react'
import ImportRecipeModal from '@/components/ImportRecipeModal'

const TYPE_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'main', label: 'Main' },
  { value: 'side', label: 'Side' },
  { value: 'salad', label: 'Salad' },
  { value: 'complete_meal', label: 'Complete meal' },
]

const MEAL_FILTERS = [
  { value: 'any', label: 'Any' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
]

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [mealFilter, setMealFilter] = useState('any')
  const [importModalOpen, setImportModalOpen] = useState(false)

  useEffect(() => {
    const anonId = getAnonId()
    fetch(`/api/recipes/list?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ recipes: data }) => {
        setRecipes((data as Recipe[]) ?? [])
      })
      .catch(() => {/* show empty state */})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      const q = search.toLowerCase()
      const matchesSearch = !q || (r.name ?? '').toLowerCase().includes(q)
      const matchesType = typeFilter === 'All' || r.recipe_type === typeFilter
      const matchesMeal =
        mealFilter === 'any' || r.meal_type === mealFilter || r.meal_type === 'any'
      return matchesSearch && matchesType && matchesMeal
    })
  }, [recipes, search, typeFilter, mealFilter])

  const hasFilter = typeFilter !== 'All' || mealFilter !== 'any' || search !== ''

  function clearFilters() {
    setSearch('')
    setTypeFilter('All')
    setMealFilter('any')
  }

  return (
    <main className="min-h-screen bg-p1-cream px-5 pt-12 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-ui font-bold text-p1-dark">Recipe bank</h1>
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-p1-terra text-white text-xs font-ui font-semibold active:opacity-80"
        >
          <Plus className="w-3.5 h-3.5" />
          Add recipe
        </button>
      </div>

      {/* Search */}
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

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-2 scrollbar-hide">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
              typeFilter === f.value
                ? 'bg-p1-terra text-white border-p1-terra'
                : 'bg-p1-card text-p1-brown border-p1-border'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Meal filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4 scrollbar-hide">
        {MEAL_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setMealFilter(f.value)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
              mealFilter === f.value
                ? 'bg-p1-terra text-white border-p1-terra'
                : 'bg-p1-card text-p1-brown border-p1-border'
            )}
          >
            {f.label}
          </button>
        ))}
        {hasFilter && (
          <button
            onClick={clearFilters}
            className="shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border border-p1-terra/40 text-p1-terra bg-p1-terra-lt"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Count */}
      {!loading && recipes.length > 0 && (
        <p className="text-xs font-ui text-p1-brown mb-3">
          {filtered.length} of {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          {hasFilter ? ' matched' : ''}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-p1-surface animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty — no recipes at all */}
      {!loading && recipes.length === 0 && (
        <div className="flex flex-col items-center text-center pt-16 gap-4">
          <div>
            <p className="text-base font-ui font-bold text-p1-dark">
              Your recipe bank is empty.
            </p>
            <p className="text-sm font-ui text-p1-brown mt-1 max-w-xs">
              Add a recipe you love and Rasa will plan around it.
            </p>
          </div>
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-5 py-3 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold active:opacity-80"
          >
            Add your first recipe →
          </button>
        </div>
      )}

      {/* Empty — filter matched nothing */}
      {!loading && recipes.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center text-center pt-12 gap-3">
          <span className="text-4xl">🔍</span>
          <p className="text-base font-ui font-semibold text-p1-dark">Nothing matched that</p>
          <p className="text-sm font-ui text-p1-brown">Try tweaking the search or filters.</p>
          <button
            onClick={clearFilters}
            className="text-sm font-ui font-semibold text-p1-terra"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Recipe grid */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(recipe => (
            <div
              key={recipe.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/recipes/${recipe.id}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/recipes/${recipe.id}`) }}
              className="relative rounded-2xl border border-p1-border bg-p1-card px-4 py-4 cursor-pointer active:opacity-80 transition-opacity"
            >
              {/* "Yours" label — user-imported cards only */}
              {recipe.source === 'user_imported' && (
                <p className="text-[10px] font-ui text-p1-brown mb-1">Yours</p>
              )}

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

              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {recipe.cuisine_type && (
                    <span className="text-[10px] font-ui font-semibold px-2.5 py-1 rounded-full bg-p1-surface text-p1-brown">
                      {recipe.cuisine_type.replace('_', ' ')}
                    </span>
                  )}
                  {recipe.meal_type && recipe.meal_type !== 'any' && (
                    <span className="text-[10px] font-ui font-semibold px-2.5 py-1 rounded-full bg-p1-surface text-p1-brown capitalize">
                      {recipe.meal_type}
                    </span>
                  )}
                  {(recipe.recipe_type === 'side' || recipe.recipe_type === 'salad') && (
                    <span className="text-[10px] font-ui font-semibold px-2.5 py-1 rounded-full bg-p1-surface text-p1-brown capitalize">
                      {recipe.recipe_type}
                    </span>
                  )}
                </div>

                {/* Source URL icon */}
                {recipe.source_url && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View source"
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 flex items-center justify-center w-11 h-11 -mr-2 -mb-2 text-p1-brown"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ImportRecipeModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </main>
  )
}
