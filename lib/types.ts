export interface Ingredient {
  name: string
  quantity: number | string
  unit: string
}

export interface MacrosPerServing {
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  cuisine_type: string | null
  meal_type: string | null
  servings: number
  cook_time_minutes: number | null
  ingredients: Ingredient[]
  steps: string[]
  macros_per_serving: MacrosPerServing | null
  batch_cookable: boolean
  source_type: string
  source_url: string | null
  source_raw_text: string | null
  user_rating: number | null
  last_cooked_date: string | null
  created_at: string
}

export interface PlanSlot {
  day: string
  meal_type: 'brunch' | 'dinner'
  recipe_id: string | null
  recipe_name: string
  protein_g: number
  carbs_g: number
  locked?: boolean
  eating_out?: boolean
}

export interface DailyTotal {
  day: string
  total_protein: number
  total_carbs: number
  target_met: boolean
}

export interface BatchOpportunity {
  description: string
}

export interface GeneratedPlan {
  slots: PlanSlot[]
  daily_totals: DailyTotal[]
  batch_opportunities: BatchOpportunity[]
}

export interface WeekPlan {
  id: string
  user_id: string | null
  week_start_date: string
  slots: PlanSlot[]
  daily_totals?: DailyTotal[]
  batch_opportunities?: BatchOpportunity[]
  created_at: string
}

export interface InventoryItem {
  id: string
  user_id: string | null
  name: string
  quantity: number | null
  unit: string | null
  location: 'fridge' | 'freezer' | 'pantry'
  use_soon: boolean
  low_stock: boolean
  updated_at: string
}

export interface ParsedInventoryItem {
  name: string
  quantity: number | null
  unit: string | null
  location: 'fridge' | 'freezer' | 'pantry'
  use_soon: boolean
  low_stock: boolean
  checked: boolean
}

export interface ShoppingListItem {
  name: string
  quantity_needed: number | null
  quantity_have: number | null
  unit: string | null
  category: string
  checked: boolean
  manually_added?: boolean
}

export interface GeneratedRecipe {
  name: string
  cuisine_type: string
  meal_type: string
  servings: number
  cook_time_minutes: number
  ingredients: Ingredient[]
  steps: string[]
  macros_per_serving: MacrosPerServing
  batch_cookable: boolean
  source_type: 'ai_generated'
}
