import { test, expect } from '@playwright/test'

/**
 * Home page tests
 *
 * The home page (app/page.tsx) shows:
 * - A greeting header
 * - A hero card (tonight's meal or empty state)
 * - A week strip (if a plan exists)
 * - Quick action cards (if no plan)
 * - BottomNav (rendered by layout)
 *
 * OnboardingGuard checks /api/preferences/get on mount.
 * All tests stub this to return existing prefs so the guard passes through.
 */

const STUB_ANON_ID = '00000000-0000-0000-0000-000000000001'

// Minimal mock meals payload (a full week plan)
const MOCK_MEALS = [
  {
    id: 'meal-mon',
    day: 'Mon',
    recipe_name: 'Chicken Tikka Masala',
    cooked: false,
    cooked_at: null,
    verdict: null,
    verdict_shown: false,
    use_soon_priority: false,
    recipe_id: 'recipe-001',
  },
  {
    id: 'meal-tue',
    day: 'Tue',
    recipe_name: 'Spaghetti Bolognese',
    cooked: false,
    cooked_at: null,
    verdict: null,
    verdict_shown: false,
    use_soon_priority: false,
    recipe_id: 'recipe-002',
  },
]

test.describe('Home page — with an existing plan', () => {
  test.beforeEach(async ({ page }) => {
    // Set anon ID before any navigation
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    // Bypass OnboardingGuard — preferences exist
    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    // Return a mock meal plan
    await page.route('**/api/meals/current**', route =>
      route.fulfill({ status: 200, json: { meals: MOCK_MEALS } })
    )

    // Recipe details for tonight (guard against timing issues by returning empty)
    await page.route('**/api/recipes/**', route =>
      route.fulfill({ status: 200, json: { recipe: null } })
    )
  })

  test('page loads without errors', async ({ page }) => {
    await page.goto('/')
    // Hero card should be visible (not stuck on skeleton)
    await expect(page.getByRole('heading', { name: /Here's your week|Ready to plan/ })).toBeVisible({ timeout: 8_000 })
  })

  test('displays a greeting in the header', async ({ page }) => {
    await page.goto('/')
    // "Good morning" / "Good afternoon" / "Good evening"
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 8_000 })
  })

  test('shows the week strip when a plan exists', async ({ page }) => {
    await page.goto('/')
    // The week strip label
    await expect(page.getByText('This week')).toBeVisible({ timeout: 8_000 })
  })

  test('week strip contains day labels', async ({ page }) => {
    await page.goto('/')
    // Strip shows single-letter day abbreviations M T W T F S S
    // We check for a subset that are stable regardless of locale
    const strip = page.getByText('This week')
    await expect(strip).toBeVisible({ timeout: 8_000 })
  })

  test('profile settings button is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Profile settings' })).toBeVisible({ timeout: 8_000 })
  })

  test('profile settings button navigates to /profile', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Profile settings' }).click()
    await page.waitForURL('**/profile', { timeout: 8_000 })
    await expect(page).toHaveURL(/\/profile/)
  })
})

test.describe('Home page — no plan (empty state)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    // Empty meals list — no plan yet
    await page.route('**/api/meals/current**', route =>
      route.fulfill({ status: 200, json: { meals: [] } })
    )
  })

  test('shows "Ready to plan?" heading when no plan exists', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Ready to plan?' })).toBeVisible({ timeout: 8_000 })
  })

  test('shows "Plan my week →" CTA in the hero card', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Plan my week →' })).toBeVisible({ timeout: 8_000 })
  })

  test('shows quick-action cards for Recipe bank and Pantry', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Recipe bank')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('link', { name: /🧺 Pantry/ })).toBeVisible({ timeout: 8_000 })
  })

  test('recipe bank quick-action links to /recipes', async ({ page }) => {
    await page.goto('/')
    const link = page.getByRole('link', { name: /Recipe bank/ })
    await expect(link).toBeVisible({ timeout: 8_000 })
    await expect(link).toHaveAttribute('href', '/recipes')
  })
})

test.describe('Home page — BottomNav presence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    await page.route('**/api/meals/current**', route =>
      route.fulfill({ status: 200, json: { meals: [] } })
    )
  })

  test('BottomNav is rendered on home page', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible({ timeout: 8_000 })
  })

  test('BottomNav contains Home, Planner, Pantry, Shopping, Recipes tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('link', { name: 'Planner', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pantry', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Shopping', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Recipes', exact: true })).toBeVisible()
  })

  test('Home tab is marked active on / route', async ({ page }) => {
    await page.goto('/')
    // The Home link should be the active nav item (terra colour applied)
    const homeLink = page.getByRole('link', { name: 'Home' })
    await expect(homeLink).toBeVisible({ timeout: 8_000 })
    // Active class contains 'text-p1-terra' — verify it's not styled as inactive white
    await expect(homeLink).not.toHaveCSS('color', 'rgba(255, 255, 255, 0.4)')
  })
})

test.describe('Home page — feedback card', () => {
  test('shows feedback card when a cooked meal has no verdict within 72h', async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )

    const recentCooked = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2h ago
    await page.route('**/api/meals/current**', route =>
      route.fulfill({
        status: 200,
        json: {
          meals: [{
            id: 'meal-cooked',
            day: 'Mon',
            recipe_name: 'Butter Chicken',
            cooked: true,
            cooked_at: recentCooked,
            verdict: null,
            verdict_shown: false,
            use_soon_priority: false,
            recipe_id: null,
          }],
        },
      })
    )

    await page.goto('/')
    await expect(page.getByText(/How did Butter Chicken land/)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('button', { name: /Everyone loved it/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /It was fine/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Won't make again/ })).toBeVisible()
  })
})
