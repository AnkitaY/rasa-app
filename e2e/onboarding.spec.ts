import { test, expect } from '@playwright/test'

/**
 * Onboarding flow tests
 *
 * These tests cover the 3-step onboarding sequence:
 *   Step 1 (/onboarding)        — dietary preferences
 *   Step 2 (/onboarding/who-for) — who is cooking
 *   Step 3 (/onboarding/cuisine) — cuisine preferences → saves prefs → /planner/generate
 *
 * All tests that navigate to onboarding routes bypass the OnboardingGuard by
 * going directly to the onboarding URL (the guard skips for /onboarding/**).
 */

// A stub anon ID that won't match any real Supabase row
const STUB_ANON_ID = '00000000-0000-0000-0000-000000000001'

test.describe('Onboarding — no existing preferences', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the preferences check so the guard redirects to onboarding
    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: null } })
    )
  })

  test('visiting the home page redirects to /onboarding when no prefs exist', async ({ page }) => {
    // Set an anon ID so getAnonId() doesn't generate a random one
    await page.goto('/')
    await page.evaluate(id => localStorage.setItem('rasa_anon_id', id), STUB_ANON_ID)

    // Mock the preferences endpoint to return no prefs
    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: null } })
    )

    await page.goto('/')
    await page.waitForURL('**/onboarding', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/onboarding/)
  })

  test('step 1 — dietary preferences page renders correctly', async ({ page }) => {
    await page.goto('/onboarding')

    // Heading
    await expect(page.getByText('Anything we should never put on the menu?')).toBeVisible()

    // Progress indicator shows step 1 of 3
    await expect(page.getByText('Question 1 of 3')).toBeVisible()

    // Diet chips are visible
    await expect(page.getByRole('button', { name: 'Vegetarian' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Halal' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Vegan' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'None' })).toBeVisible()

    // Next button is present
    await expect(page.getByRole('button', { name: /Next/ })).toBeVisible()
  })

  test('step 1 — selecting "None" disables the free-text textarea', async ({ page }) => {
    await page.goto('/onboarding')

    await page.getByRole('button', { name: 'None' }).click()

    const textarea = page.getByPlaceholder(/e.g. No pork/)
    await expect(textarea).toBeDisabled()
  })

  test('step 1 — selecting a diet chip appends its label to the textarea', async ({ page }) => {
    await page.goto('/onboarding')

    await page.getByRole('button', { name: 'Vegetarian' }).click()
    const textarea = page.getByPlaceholder(/e.g. No pork/)
    await expect(textarea).toHaveValue(/Vegetarian/)
  })

  test('step 1 — clicking Next navigates to /onboarding/who-for', async ({ page }) => {
    await page.goto('/onboarding')

    // Skip chip selection — clicking Next with no restrictions is valid
    await page.getByRole('button', { name: /Next/ }).click()
    await page.waitForURL('**/onboarding/who-for', { timeout: 8_000 })
    await expect(page).toHaveURL(/\/onboarding\/who-for/)
  })

  test('step 1 → step 2 → step 3 full navigation chain', async ({ page }) => {
    // Step 1
    await page.goto('/onboarding')
    await page.getByRole('button', { name: 'None' }).click()
    await page.getByRole('button', { name: /Next/ }).click()
    await page.waitForURL('**/onboarding/who-for')

    // Step 2
    await expect(page.getByText('Who are you cooking for?')).toBeVisible()
    await expect(page.getByText('Question 2 of 3')).toBeVisible()

    await page.getByRole('button', { name: /Family, young kids/ }).click()
    await page.getByRole('button', { name: /Next/ }).click()
    await page.waitForURL('**/onboarding/cuisine')

    // Step 3
    await expect(page.getByText('What feels like home cooking to you?')).toBeVisible()
    await expect(page.getByText('Question 3 of 3')).toBeVisible()
  })
})

test.describe('Onboarding step 2 — who are you cooking for', () => {
  test('renders all four household options', async ({ page }) => {
    await page.goto('/onboarding/who-for')

    await expect(page.getByRole('button', { name: /Just me/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Me \+ partner/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Family, young kids/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Family, teens/ })).toBeVisible()
  })

  test('Next button is disabled until an option is selected', async ({ page }) => {
    await page.goto('/onboarding/who-for')

    const nextBtn = page.getByRole('button', { name: /Next/ })
    await expect(nextBtn).toBeDisabled()

    await page.getByRole('button', { name: /Just me/ }).click()
    await expect(nextBtn).toBeEnabled()
  })

  test('Back button returns to step 1', async ({ page }) => {
    await page.goto('/onboarding/who-for')

    await page.getByRole('button', { name: /← Back/ }).click()
    await page.waitForURL('**/onboarding')
    await expect(page).toHaveURL(/\/onboarding$/)
  })
})

test.describe('Onboarding step 3 — cuisine preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(id => {
      localStorage.setItem('rasa_anon_id', id)
    }, STUB_ANON_ID)

    // Allow OnboardingGuard to pass through — prefs already exist
    await page.route('**/api/preferences/get**', route =>
      route.fulfill({ status: 200, json: { preferences: { id: STUB_ANON_ID } } })
    )
  })

  test('primary cuisine chips render correctly', async ({ page }) => {
    await page.goto('/onboarding/cuisine')

    await expect(page.getByText('What feels like home cooking to you?')).toBeVisible()

    // A selection of known cuisine chips
    await expect(page.getByRole('button', { name: 'Indian' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Italian' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Thai' })).toBeVisible()
  })

  test('secondary cuisine section appears after selecting a primary cuisine', async ({ page }) => {
    await page.goto('/onboarding/cuisine')

    // Secondary section should not be visible before selecting primary
    await expect(page.getByText('Also enjoy')).not.toBeVisible()

    await page.getByRole('button', { name: 'Indian' }).click()

    // Now secondary section should appear
    await expect(page.getByText('Also enjoy')).toBeVisible()
  })

  test('"Let\'s build your first plan" button is disabled without a primary cuisine', async ({ page }) => {
    await page.goto('/onboarding/cuisine')

    const finishBtn = page.getByRole('button', { name: /build your first plan/ })
    await expect(finishBtn).toBeDisabled()
  })

  test('finish — saves preferences and redirects to /planner/generate', async ({ page }) => {
    // Set up anon ID in localStorage
    await page.goto('/onboarding/cuisine')
    await page.evaluate(id => localStorage.setItem('rasa_anon_id', id), STUB_ANON_ID)

    // Seed sessionStorage with prior steps (as if user went through steps 1 & 2)
    await page.evaluate(() => {
      sessionStorage.setItem('rasa_ob', JSON.stringify({
        dietary_rules: null,
        who_cooking_for: 'family_young_kids',
      }))
    })

    // Mock the preferences save endpoint
    await page.route('**/api/preferences/save', route =>
      route.fulfill({ status: 200, json: { ok: true } })
    )

    await page.goto('/onboarding/cuisine')

    await page.getByRole('button', { name: 'Indian' }).click()
    await page.getByRole('button', { name: /build your first plan/ }).click()

    await page.waitForURL('**/planner/generate', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/planner\/generate/)
  })

  test('shows an error message when save API fails', async ({ page }) => {
    await page.goto('/onboarding/cuisine')
    await page.evaluate(id => localStorage.setItem('rasa_anon_id', id), STUB_ANON_ID)

    // Mock API to return a server error
    await page.route('**/api/preferences/save', route =>
      route.fulfill({ status: 500, json: { error: 'server error' } })
    )

    await page.getByRole('button', { name: 'Indian' }).click()
    await page.getByRole('button', { name: /build your first plan/ }).click()

    await expect(page.getByText(/Hmm|couldn't save/)).toBeVisible({ timeout: 6_000 })
  })
})
