import { test, expect } from '@playwright/test'

/**
 * Planner page tests (app/planner/page.tsx)
 *
 * Key behaviours tested:
 * - Page loads and renders meal cards
 * - Empty state when no plan exists
 * - "Mark as cooked" shows a toast — user stays on /planner (BUG-004 fix regression)
 * - Toast disappears after ~2.5 seconds
 * - Swap button is present on active meal cards
 * - BottomNav is rendered (inherited from layout)
 */

const STUB_ANON_ID = '00000000-0000-0000-0000-000000000002'

const MOCK_WEEK_PLAN = {
  id: 'plan-001',
  week_start_date: '2026-05-04',
}

const MOCK_MEALS = [
  {
    id: 'meal-mon',
    day: 'Mon',
    recipe_name: 'Chicken Tikka Masala',
    reasoning: 'A family favourite with warming spices.',
    cooked: false,
    cooked_at: null,
    verdict: null,
    use_soon_priority: false,
    recipe_id: 'recipe-001',
  },
  {
    id: 'meal-tue',
    day: 'Tue',
    recipe_name: 'Spaghetti Bolognese',
    reasoning: null,
    cooked: false,
    cooked_at: null,
    verdict: null,
    use_soon_priority: false,
    recipe_id: 'recipe-002',
  },
  {
    id: 'meal-wed',
    day: 'Wed',
    recipe_name: 'Butter Chicken',
    reasoning: null,
    cooked: true,
    cooked_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    verdict: 'loved',
    use_soon_priority: false,
    recipe_id: 'recipe-003',
  },
]

test.describe('Planner page — with a plan', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/meals/current**', route =>
      route.fulfill({
        status: 200,
        json: { week_plan: MOCK_WEEK_PLAN, meals: MOCK_MEALS },
      })
    )
  })

  test('planner page loads and shows "This Week" heading', async ({ page }) => {
    await page.goto('/planner')
    await expect(page.getByRole('heading', { name: 'This Week' })).toBeVisible({ timeout: 8_000 })
  })

  test('renders meal cards for each planned day', async ({ page }) => {
    await page.goto('/planner')
    await expect(page.getByText('Chicken Tikka Masala')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Spaghetti Bolognese')).toBeVisible()
  })

  test('cooked meal cards show the "Cooked ✓" label', async ({ page }) => {
    await page.goto('/planner')
    await expect(page.getByText(/Cooked ✓/)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Butter Chicken')).toBeVisible()
  })

  test('cooked meal shows verdict label when verdict is set', async ({ page }) => {
    await page.goto('/planner')
    await expect(page.getByText('Everyone loved it 🙌')).toBeVisible({ timeout: 8_000 })
  })

  test('"Mark as cooked" button is present on uncooked meal cards', async ({ page }) => {
    await page.goto('/planner')
    const cookBtns = page.getByRole('button', { name: 'Mark as cooked' })
    await expect(cookBtns.first()).toBeVisible({ timeout: 8_000 })
  })

  test('"Swap" button is present on uncooked meal cards', async ({ page }) => {
    await page.goto('/planner')
    const swapBtns = page.getByRole('button', { name: 'Swap' })
    await expect(swapBtns.first()).toBeVisible({ timeout: 8_000 })
  })

  test('BUG-004 regression — "Mark as cooked" does NOT redirect away from /planner', async ({ page }) => {
    // Mock the cooked PATCH endpoint to succeed
    await page.route('**/api/meals/cooked', route =>
      route.fulfill({ status: 200, json: { ok: true } })
    )

    await page.goto('/planner')

    // Click the first "Mark as cooked" button
    await page.getByRole('button', { name: 'Mark as cooked' }).first().click()

    // Toast should appear
    await expect(page.getByText(/Nice work|Dinner's done/)).toBeVisible({ timeout: 6_000 })

    // User MUST still be on /planner — not redirected
    await expect(page).toHaveURL(/\/planner$/)
  })

  test('toast disappears after ~2.5 seconds', async ({ page }) => {
    await page.route('**/api/meals/cooked', route =>
      route.fulfill({ status: 200, json: { ok: true } })
    )

    await page.goto('/planner')
    await page.getByRole('button', { name: 'Mark as cooked' }).first().click()

    const toast = page.getByText(/Nice work|Dinner's done/)
    await expect(toast).toBeVisible({ timeout: 6_000 })

    // After 3 seconds the toast should be gone (timer is 2500ms)
    await page.waitForTimeout(3_200)
    await expect(toast).not.toBeVisible()
  })

  test('error toast shows if cooked API call fails', async ({ page }) => {
    await page.route('**/api/meals/cooked', route =>
      route.fulfill({ status: 500, json: { error: 'server error' } })
    )

    await page.goto('/planner')
    await page.getByRole('button', { name: 'Mark as cooked' }).first().click()

    await expect(page.getByText(/Hmm, something went wrong/)).toBeVisible({ timeout: 6_000 })

    // Still on planner page after error
    await expect(page).toHaveURL(/\/planner$/)
  })

  test('shows date range in header', async ({ page }) => {
    await page.goto('/planner')
    // Date range format: "4 May – 10 May"
    await expect(page.getByText(/May/)).toBeVisible({ timeout: 8_000 })
  })

  test('"Rethink remaining →" link is visible when uncooked meals exist', async ({ page }) => {
    await page.goto('/planner')
    await expect(page.getByRole('link', { name: /Rethink remaining/ })).toBeVisible({ timeout: 8_000 })
  })

  test('"Recipe" link navigates to the recipe detail page', async ({ page }) => {
    await page.goto('/planner')
    const recipeLinks = page.getByRole('link', { name: 'Recipe', exact: true })
    await recipeLinks.first().click()
    await page.waitForURL(/\/recipes\/recipe-/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/recipes\//)
  })
})

test.describe('Planner page — empty state (no plan)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/meals/current**', route =>
      route.fulfill({ status: 200, json: { week_plan: null, meals: [] } })
    )
  })

  test('shows "Nothing planned yet" empty state', async ({ page }) => {
    await page.goto('/planner')
    await expect(page.getByText('Nothing planned yet')).toBeVisible({ timeout: 8_000 })
  })

  test('shows "Plan my week →" link in empty state', async ({ page }) => {
    await page.goto('/planner')
    const link = page.getByRole('link', { name: 'Plan my week →' })
    await expect(link).toBeVisible({ timeout: 8_000 })
    await expect(link).toHaveAttribute('href', '/planner/generate')
  })
})

test.describe('Planner page — BottomNav', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/meals/current**', route =>
      route.fulfill({ status: 200, json: { week_plan: null, meals: [] } })
    )
  })

  test('BottomNav is visible on planner page', async ({ page }) => {
    await page.goto('/planner')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 8_000 })
  })

  test('Planner tab is active on /planner', async ({ page }) => {
    await page.goto('/planner')
    const plannerLink = page.getByRole('link', { name: 'Planner' })
    await expect(plannerLink).toBeVisible({ timeout: 8_000 })
    // Active tab should NOT be styled as the dim inactive white
    await expect(plannerLink).not.toHaveCSS('color', 'rgba(255, 255, 255, 0.4)')
  })
})
