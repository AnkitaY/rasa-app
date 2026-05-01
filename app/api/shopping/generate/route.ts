import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { PlanSlot, ShoppingListItem } from '@/lib/types'

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
  if (/chicken|mutton|lamb|egg|fish|prawn|soya|tofu/.test(n)) return 'Protein'
  if (/dal|lentil|bean|chana|rajma|moong|masoor|urad/.test(n)) return 'Protein'
  if (/paneer|milk|yogurt|curd|cream|butter|ghee|cheese/.test(n)) return 'Dairy'
  if (/onion|tomato|garlic|ginger|spinach|capsicum|pepper|chilli|coriander|mint|lemon|lime|potato|pea|carrot|cucumber|cherry|bell pepper|mushroom|green/.test(n)) return 'Produce'
  if (/masala|powder|turmeric|cumin|garam|paprika|chilli powder|seeds|cardamom|cinnamon|bay|saffron|chaat|spice|seasoning|tikka|tandoori|biryani masala|keema masala|rajma masala|chana masala/.test(n)) return 'Spices'
  if (/rice|flour|bread|tortilla|oil|salt|sugar|pasta|noodle|sauce|puree|canned|can|tin/.test(n)) return 'Pantry'
  return 'Other'
}

const CATEGORY_ORDER = ['Protein', 'Dairy', 'Produce', 'Pantry', 'Spices', 'Other']

interface AggIngredient {
  name: string
  quantity: number | null
  unit: string | null
  category: string
}

export async function POST() {
  try {
    const admin = createAdminClient()
    const anon = createClient()
    const { data: { user } } = await anon.auth.getUser()

    // Latest week plan
    const { data: weekPlan, error: planError } = await admin
      .from('week_plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (planError || !weekPlan) {
      return NextResponse.json({ error: 'No week plan found. Generate a plan first.' }, { status: 400 })
    }

    const stored = weekPlan.slots as { slots: PlanSlot[] }
    const slots: PlanSlot[] = stored.slots ?? []

    // Count recipe occurrences
    const recipeCounts: Record<string, number> = {}
    for (const slot of slots) {
      if (slot.recipe_id && !slot.eating_out) {
        recipeCounts[slot.recipe_id] = (recipeCounts[slot.recipe_id] ?? 0) + 1
      }
    }

    const recipeIds = Object.keys(recipeCounts)
    if (recipeIds.length === 0) {
      return NextResponse.json({ error: 'No recipes in the current plan.' }, { status: 400 })
    }

    const { data: recipes, error: recipeError } = await admin
      .from('recipes')
      .select('id, ingredients')
      .in('id', recipeIds)

    if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })

    // Aggregate ingredients
    const agg: Record<string, AggIngredient> = {}
    for (const recipe of recipes ?? []) {
      const count = recipeCounts[recipe.id] ?? 1
      const ingredients = (recipe.ingredients as Array<{ name: string; quantity: number | null; unit: string | null }>) ?? []
      for (const ing of ingredients) {
        const unit = normalizeUnit(ing.unit)
        const key = `${ing.name.toLowerCase().trim()}__${unit ?? ''}`
        if (agg[key]) {
          if (agg[key].quantity !== null && ing.quantity !== null) {
            agg[key].quantity = agg[key].quantity! + ing.quantity * count
          }
        } else {
          agg[key] = {
            name: ing.name,
            quantity: ing.quantity !== null ? ing.quantity * count : null,
            unit,
            category: categorize(ing.name),
          }
        }
      }
    }

    // Fetch inventory
    const invQuery = admin.from('inventory_items').select('name, quantity, unit')
    const { data: inventory } = await (
      user?.id
        ? invQuery.or(`user_id.eq.${user.id},user_id.is.null`)
        : invQuery.is('user_id', null)
    )

    const invMap: Record<string, { quantity: number | null; unit: string | null }> = {}
    for (const item of inventory ?? []) {
      invMap[item.name.toLowerCase().trim()] = {
        quantity: item.quantity,
        unit: normalizeUnit(item.unit),
      }
    }

    // Build shopping items
    const shoppingItems: ShoppingListItem[] = []
    for (const item of Object.values(agg)) {
      const inv = invMap[item.name.toLowerCase().trim()]
      let quantity_have: number | null = null
      let quantity_needed = item.quantity

      if (inv && normalizeUnit(inv.unit) === item.unit && inv.quantity !== null && item.quantity !== null) {
        quantity_have = inv.quantity
        quantity_needed = Math.max(0, item.quantity - inv.quantity)
        if (quantity_needed === 0) continue
      }

      shoppingItems.push({
        name: item.name,
        quantity_needed,
        quantity_have,
        unit: item.unit,
        category: item.category,
        checked: false,
      })
    }

    // Group by category
    const grouped: Record<string, ShoppingListItem[]> = {}
    for (const cat of CATEGORY_ORDER) {
      const catItems = shoppingItems.filter((i) => i.category === cat)
      if (catItems.length > 0) grouped[cat] = catItems
    }

    const { data: savedList, error: saveError } = await admin
      .from('shopping_lists')
      .insert({ user_id: user?.id ?? null, week_plan_id: weekPlan.id, items: grouped })
      .select()
      .single()

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

    return NextResponse.json({ shopping_list: savedList }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
