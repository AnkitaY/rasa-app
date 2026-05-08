import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ShoppingListItem } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null
  const u = unit.toLowerCase().trim()
  const map: Record<string, string> = {
    gram: 'g', grams: 'g',
    tablespoon: 'tbsp', tablespoons: 'tbsp',
    teaspoon: 'tsp', teaspoons: 'tsp',
    piece: 'pcs', pieces: 'pcs', pc: 'pcs',
    medium: 'pcs', large: 'pcs', small: 'pcs',
    milliliter: 'ml', milliliters: 'ml', millilitre: 'ml',
    liter: 'l', liters: 'l', litre: 'l',
    clove: 'cloves',
  }
  return map[u] ?? u
}

function categorize(name: string): string {
  const n = name.toLowerCase()
  if (/chicken|mutton|lamb|beef|pork|fish|prawn|shrimp|egg|tofu|soya/.test(n)) return 'Protein'
  if (/dal|lentil|bean|chana|rajma|moong|masoor|urad|chickpea/.test(n)) return 'Protein'
  if (/paneer|milk|yogurt|curd|cream|butter|ghee|cheese|cottage/.test(n)) return 'Dairy'
  if (/onion|tomato|garlic|ginger|spinach|capsicum|pepper|chilli|coriander|mint|lemon|lime|potato|pea|carrot|cucumber|bell pepper|mushroom|cabbage|broccoli|zucchini|eggplant|aubergine|okra|beans|pumpkin|squash|leek|celery|fennel|beetroot/.test(n)) return 'Produce'
  if (/masala|powder|turmeric|cumin|garam|paprika|cinnamon|cardamom|bay|saffron|clove|nutmeg|coriander powder|chilli powder|spice|seasoning|seeds|star anise|fenugreek|mustard/.test(n)) return 'Spices'
  if (/rice|flour|bread|tortilla|oil|salt|sugar|pasta|noodle|sauce|puree|canned|can|tin|stock|broth|coconut milk|vinegar|soy sauce|fish sauce|oyster sauce|tahini|honey|maple|jam|cornflour|cornstarch|baking/.test(n)) return 'Pantry'
  return 'Other'
}

const CATEGORY_ORDER = ['Produce', 'Protein', 'Dairy', 'Spices', 'Pantry', 'Other']

/** Fuzzy check: is this ingredient name covered by the free-text pantry snapshot? */
function isInPantry(ingredientName: string, pantryText: string): boolean {
  if (!pantryText) return false
  const name = ingredientName.toLowerCase().trim()
  const pantryLower = pantryText.toLowerCase()

  // Direct substring match first
  if (pantryLower.includes(name)) return true

  // Split pantry into items and check each
  const pantryItems = pantryLower
    .split(/[,\n;]/)
    .map(s => s.trim())
    .filter(Boolean)

  for (const item of pantryItems) {
    // "chicken thighs" covers "chicken"; "onions" covers "onion"
    if (item.includes(name) || name.includes(item)) return true
  }
  return false
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/shopping/generate
 * Body: { anon_id: string }
 *
 * Phase 1 flow:
 * 1. Latest week_plan for anon_id
 * 2. All uncooked meals for that plan
 * 3. Recipes by name
 * 4. Aggregate + subtract pantry_snapshot
 * 5. Group and return
 *
 * Falls back to slots-based flow if no meals rows exist (legacy plans).
 */
export async function POST(request: NextRequest) {
  let body: { anon_id?: string } = {}
  try { body = await request.json() } catch { /* ignore */ }

  const { anon_id } = body
  if (!anon_id) {
    return NextResponse.json({ error: 'anon_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Latest week plan
  const { data: weekPlan } = await admin
    .from('week_plans')
    .select('id, pantry_snapshot, slots')
    .eq('anon_id', anon_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!weekPlan) {
    return NextResponse.json(
      { error: 'Generate your week plan first and the shopping list builds itself.' },
      { status: 400 }
    )
  }

  const pantryText: string = weekPlan.pantry_snapshot ?? ''

  // 2. Try meals table first (Phase 1)
  const { data: meals } = await admin
    .from('meals')
    .select('recipe_name, cooked')
    .eq('week_plan_id', weekPlan.id)

  let recipeIngredients: { ingredients: unknown }[] = []

  if (meals && meals.length > 0) {
    // Phase 1 path: get recipes by name for uncooked meals
    const names = meals
      .filter((m: { cooked: boolean }) => !m.cooked)
      .map((m: { recipe_name: string }) => m.recipe_name)

    if (names.length === 0) {
      return NextResponse.json(
        { error: 'All meals are already cooked — nothing left to shop for. Nice work.' },
        { status: 400 }
      )
    }

    const { data: recipes } = await admin
      .from('recipes')
      .select('ingredients')
      .in('name', names)
      .is('user_id', null)

    recipeIngredients = recipes ?? []
  } else {
    // Legacy path: fall back to slots
    const stored = weekPlan.slots as { slots: Array<{ recipe_id: string | null }> } | null
    const slots = stored?.slots ?? []
    const recipeIds = slots
      .filter((s) => s.recipe_id)
      .map((s) => s.recipe_id as string)

    if (recipeIds.length === 0) {
      return NextResponse.json({ error: 'No recipes in the current plan.' }, { status: 400 })
    }

    const { data: recipes } = await admin
      .from('recipes')
      .select('ingredients')
      .in('id', recipeIds)

    recipeIngredients = recipes ?? []
  }

  // 3. Aggregate ingredients
  const agg: Record<string, {
    name: string; quantity: number | null; unit: string | null; category: string
  }> = {}

  for (const recipe of recipeIngredients) {
    const ingredients = (recipe.ingredients ?? []) as Array<{
      name: string; quantity: number | string | null; unit: string | null
    }>
    for (const ing of ingredients) {
      const unit = normalizeUnit(ing.unit)
      const qty = typeof ing.quantity === 'string' ? parseFloat(ing.quantity) || null : ing.quantity
      const key = `${ing.name.toLowerCase().trim()}__${unit ?? ''}`
      if (agg[key]) {
        if (agg[key].quantity !== null && qty !== null) {
          agg[key].quantity = agg[key].quantity! + qty
        }
      } else {
        agg[key] = { name: ing.name, quantity: qty, unit, category: categorize(ing.name) }
      }
    }
  }

  // 4. Subtract pantry items
  const shoppingItems: ShoppingListItem[] = []
  for (const item of Object.values(agg)) {
    if (isInPantry(item.name, pantryText)) continue
    shoppingItems.push({
      name: item.name,
      quantity_needed: item.quantity,
      quantity_have: null,
      unit: item.unit,
      category: item.category,
      checked: false,
    })
  }

  // 5. Group by category
  const grouped: Record<string, ShoppingListItem[]> = {}
  for (const cat of CATEGORY_ORDER) {
    const items = shoppingItems.filter(i => i.category === cat)
    if (items.length > 0) grouped[cat] = items
  }

  return NextResponse.json({ groups: grouped, total: shoppingItems.length })
}
