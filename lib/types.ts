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
  // S02 additions
  raw_text: string | null
  source: 'ai_generated' | 'user_imported' | 'global_curated' | null // 'global_curated' added S03-000
  recipe_type: 'main' | 'side' | 'salad' | 'complete_meal' | null
  prep_friendly: boolean
  assembly_time_mins: number | null
  excluded_from_plans: boolean
}

export interface PlanSlot {
  day: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
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

export type PrepTaskType = 'passive_prep' | 'quick_prep' | 'cook_ahead' | 'finish_only'

export interface PrepTask {
  task_type: PrepTaskType
  description: string
  duration_minutes: number
  parallel_with: string
}

export interface KitchenBatchOpportunity {
  description: string
  extra_time_minutes: number
  saves_future_meal: string
}

export interface KitchenSession {
  id: string
  user_id: string | null
  week_plan_id: string | null
  session_date: string
  dinner_recipe_id: string | null
  dinner_recipe_name: string | null
  brunch_recipe_id: string | null
  brunch_recipe_name: string | null
  session_duration_minutes: number | null
  prep_tasks: PrepTask[]
  tomorrow_finish_steps: string[]
  batch_opportunities: KitchenBatchOpportunity[]
  brunch_done: boolean
  created_at: string
}

export interface GeneratedKitchenSession {
  session_duration_minutes: number
  prep_tasks: PrepTask[]
  tomorrow_finish_steps: string[]
  batch_opportunities: KitchenBatchOpportunity[]
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

// ─── Phase 1 types ────────────────────────────────────────────────────────────

/** Structured recipe step with optional inline tip callout */
export interface RecipeStep {
  instruction: string
  tip_type?: 'TIMING' | 'DONENESS' | 'HEADS_UP' | 'CLEAN'
  tip_text?: string
}

/** Prep-ahead item surfaced at top of recipe detail */
export interface PrepAheadItem {
  task: string
  time_sensitive: boolean
}

/** User preferences collected at onboarding + profile */
export interface UserPreferences {
  id: string
  anon_id: string
  dietary_rules: string | null
  who_cooking_for: 'just_me' | 'me_and_partner' | 'family_young_kids' | 'family_teens'
  primary_cuisine: string | null
  secondary_cuisines: string[]
  skill_level: 'finding_my_feet' | 'pretty_confident' | 'enjoy_challenge' | null
  weeknight_budget: 'under_30' | '30_to_45' | 'hour_is_fine' | null
  goals: string[]
  banned_ingredients: string | null
  cook_days_per_week: number
  last_pantry_input: string | null
  created_at: string
  // S02 additions
  meal_types_default: string[]
  meal_days_default: Record<string, number>
  meal_prefs: Record<string, { prep_ahead: boolean; max_assembly_mins?: number }>
  health_goals: string | null
}

/** A single planned meal in a week's plan */
export interface Meal {
  id: string
  week_plan_id: string
  day: string           // 'Mon'–'Sun'
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  recipe_name: string
  eating_out: boolean
  serve_with: string | null
  reasoning: string | null
  cooked: boolean
  cooked_at: string | null
  swapped_from: string | null
  verdict: 'loved' | 'ok' | 'skip' | null
  verdict_shown: boolean
  notes: string | null
  use_soon_priority: boolean
  created_at: string
}
