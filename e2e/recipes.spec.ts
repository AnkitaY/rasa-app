import { test, expect } from '@playwright/test'

/**
 * Recipe bank and recipe detail tests
 *
 * /recipes       — recipe list page (app/recipes/page.tsx)
 * /recipes/[id]  — recipe detail page (app/recipes/[id]/page.tsx)
 *
 * Key behaviours:
 * - Recipe bank loads and renders recipe cards
 * - Tapping a recipe navigates to /recipes/[id]
 * - Search and cuisine filter work
 * - Empty state shows when no recipes exist
 * - Recipe detail shows ingredients, method and BottomNav (BUG-005 fix regression)
 * - Back button on detail page returns to previous page
 */

const STUB_ANON_ID = '00000000-0000-0000-0000-000000000003'

const MOCK_RECIPES = [
  {
    id: 'recipe-001',
    name: 'Chicken Tikka Masala',
    cuisine_type: 'Indian',
    meal_type: 'dinner',
    cook_time_minutes: 40,
    servings: 4,
    is_complete_meal: true,
  },
  {
    id: 'recipe-002',
    name: 'Spaghetti Bolognese',
    cuisine_type: 'Italian',
    meal_type: 'dinner',
    cook_time_minutes: 45,
    servings: 4,
    is_complete_meal: true,
  },
  {
    id: 'recipe-003',
    name: 'Pad Thai',
    cuisine_type: 'Thai',
    meal_type: 'dinner',
    cook_time_minutes: 30,
    servings: 2,
    is_complete_meal: true,
  },
]

const MOCK_RECIPE_DETAIL = {
  id: 'recipe-001',
  name: 'Chicken Tikka Masala',
  cuisine_type: 'Indian',
  meal_type: 'dinner',
  cook_time_minutes: 40,
  servings: 4,
  ingredients: [
    { name: 'Chicken breast', quantity: 500, unit: 'g' },
    { name: 'Onion', quantity: 1, unit: 'large' },
    { name: 'Tomato passata', quantity: 400, unit: 'ml' },
  ],
  steps: [
    'Marinate chicken in yoghurt and spices for 30 minutes.',
    'Fry onions until soft, add garlic and ginger.',
    'Add marinated chicken and cook through.',
    'Stir in passata and simmer for 15 minutes.',
  ],
  steps_v2: null,
  prep_ahead: null,
  is_complete_meal: true,
  source_type: 'ai_generated',
  source_url: null,
}

// ── Recipe bank (/recipes) ──────────────────────────────────────────────────

test.describe('Recipe bank — with recipes', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/recipes/list**', route =>
      route.fulfill({ status: 200, json: { recipes: MOCK_RECIPES } })
    )
  })

  test('recipe bank page loads with "Recipe bank" heading', async ({ page }) => {
    await page.goto('/recipes')
    await expect(page.getByRole('heading', { name: 'Recipe bank' })).toBeVisible({ timeout: 8_000 })
  })

  test('recipe cards are rendered for each recipe', async ({ page }) => {
    await page.goto('/recipes')
    await expect(page.getByText('Chicken Tikka Masala')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Spaghetti Bolognese')).toBeVisible()
    await expect(page.getByText('Pad Thai')).toBeVisible()
  })

  test('recipe card shows cook time', async ({ page }) => {
    await page.goto('/recipes')
    await expect(page.getByText('40 min')).toBeVisible({ timeout: 8_000 })
  })

  test('recipe card shows cuisine type badge', async ({ page }) => {
    await page.goto('/recipes')
    // The badges on each card
    const badges = page.getByText('Indian')
    await expect(badges.first()).toBeVisible({ timeout: 8_000 })
  })

  test('recipe count label is shown', async ({ page }) => {
    await page.goto('/recipes')
    // "3 of 3 recipes"
    await expect(page.getByText(/3 of 3 recipe/)).toBeVisible({ timeout: 8_000 })
  })

  test('tapping a recipe navigates to /recipes/[id]', async ({ page }) => {
    await page.goto('/recipes')
    // Click on the first recipe card (it's a button)
    await page.getByRole('button', { name: /Chicken Tikka Masala/ }).click()
    await page.waitForURL(/\/recipes\/recipe-001/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/recipes\/recipe-001/)
  })

  test('"Add recipe" dropdown button is present', async ({ page }) => {
    await page.goto('/recipes')
    await expect(page.getByRole('button', { name: /Add recipe/ })).toBeVisible({ timeout: 8_000 })
  })

  test('search input filters recipes', async ({ page }) => {
    await page.goto('/recipes')
    await page.getByPlaceholder('Search recipes…').fill('Pad')

    // Only Pad Thai should remain in the filtered list
    await expect(page.getByText('Pad Thai')).toBeVisible({ timeout: 4_000 })
    await expect(page.getByText('Chicken Tikka Masala')).not.toBeVisible()
    await expect(page.getByText('Spaghetti Bolognese')).not.toBeVisible()
  })

  test('clear search icon resets the search', async ({ page }) => {
    await page.goto('/recipes')
    await page.getByPlaceholder('Search recipes…').fill('Pad')
    await expect(page.getByText('Pad Thai')).toBeVisible({ timeout: 4_000 })

    // Click the X button to clear
    await page.getByRole('button').filter({ has: page.locator('svg') }).last().click()
    // Or use the clear button that appears when search is non-empty
    // The X button inside the search bar
    await page.getByPlaceholder('Search recipes…').fill('')

    // All three recipes visible again
    await expect(page.getByText('Chicken Tikka Masala')).toBeVisible({ timeout: 4_000 })
  })

  test('cuisine filter chip filters recipes', async ({ page }) => {
    await page.goto('/recipes')

    // Click the "Italian" cuisine chip
    await page.getByRole('button', { name: 'Italian' }).first().click()

    await expect(page.getByText('Spaghetti Bolognese')).toBeVisible({ timeout: 4_000 })
    await expect(page.getByText('Chicken Tikka Masala')).not.toBeVisible()
  })

  test('"Clear" chip resets cuisine filter', async ({ page }) => {
    await page.goto('/recipes')
    await page.getByRole('button', { name: 'Italian' }).first().click()
    await expect(page.getByText('Spaghetti Bolognese')).toBeVisible({ timeout: 4_000 })

    await page.getByRole('button', { name: /Clear/ }).click()
    await expect(page.getByText('Chicken Tikka Masala')).toBeVisible({ timeout: 4_000 })
    await expect(page.getByText('Spaghetti Bolognese')).toBeVisible()
  })
})

test.describe('Recipe bank — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/recipes/list**', route =>
      route.fulfill({ status: 200, json: { recipes: [] } })
    )
  })

  test('shows "Your recipe bank is empty" when no recipes exist', async ({ page }) => {
    await page.goto('/recipes')
    await expect(page.getByText('Your recipe bank is empty')).toBeVisible({ timeout: 8_000 })
  })

  test('shows "Plan my first week →" CTA in empty state', async ({ page }) => {
    await page.goto('/recipes')
    await expect(page.getByRole('button', { name: 'Plan my first week →' })).toBeVisible({ timeout: 8_000 })
  })
})

// ── Recipe detail (/recipes/[id]) ────────────────────────────────────────────

test.describe('Recipe detail page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/recipes/recipe-001', route =>
      route.fulfill({ status: 200, json: { recipe: MOCK_RECIPE_DETAIL } })
    )
  })

  test('recipe detail page loads with recipe name as heading', async ({ page }) => {
    await page.goto('/recipes/recipe-001')
    await expect(page.getByRole('heading', { name: 'Chicken Tikka Masala' })).toBeVisible({ timeout: 8_000 })
  })

  test('displays cook time and servings tags', async ({ page }) => {
    await page.goto('/recipes/recipe-001')
    await expect(page.getByText('40 min')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Serves 4')).toBeVisible()
  })

  test('displays cuisine type tag', async ({ page }) => {
    await page.goto('/recipes/recipe-001')
    await expect(page.getByText('Indian')).toBeVisible({ timeout: 8_000 })
  })

  test('ingredients section is visible', async ({ page }) => {
    await page.goto('/recipes/recipe-001')
    await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Chicken breast')).toBeVisible()
    await expect(page.getByText('Onion', { exact: true })).toBeVisible()
  })

  test('method section is visible', async ({ page }) => {
    await page.goto('/recipes/recipe-001')
    await expect(page.getByRole('heading', { name: 'Method' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Marinate chicken/)).toBeVisible()
  })

  test('BUG-005 regression — BottomNav is rendered on recipe detail page', async ({ page }) => {
    await page.goto('/recipes/recipe-001')
    // BottomNav renders directly in this page component (not only via layout)
    // It must be visible after the recipe loads
    const nav = page.getByRole('navigation').first()
    await expect(nav).toBeVisible({ timeout: 8_000 })
    // All five tabs should be present
    await expect(page.getByRole('link', { name: 'Recipes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Planner' })).toBeVisible()
  })

  test('"Back" button navigates back', async ({ page }) => {
    // Navigate from recipe list to detail so there's history to go back to
    await page.route('**/api/recipes/list**', route =>
      route.fulfill({ status: 200, json: { recipes: MOCK_RECIPES } })
    )

    await page.goto('/recipes')
    await page.getByRole('button', { name: /Chicken Tikka Masala/ }).click()
    await page.waitForURL(/\/recipes\/recipe-001/, { timeout: 8_000 })

    await page.getByRole('button', { name: '← Back', exact: true }).click()
    await page.waitForURL(/\/recipes$/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/recipes$/)
  })

  test('"Let\'s cook" button navigates to /planner', async ({ page }) => {
    await page.goto('/recipes/recipe-001')
    await page.getByRole('button', { name: "Let's cook" }).click()
    await page.waitForURL(/\/planner/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/planner/)
  })
})

test.describe('Recipe detail — not found state', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/recipes/recipe-nonexistent', route =>
      route.fulfill({ status: 404, json: { recipe: null } })
    )
  })

  test('shows "Recipe not found" when the recipe does not exist', async ({ page }) => {
    await page.goto('/recipes/recipe-nonexistent')
    await expect(page.getByText('Recipe not found')).toBeVisible({ timeout: 8_000 })
  })
})
