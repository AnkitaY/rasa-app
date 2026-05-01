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
