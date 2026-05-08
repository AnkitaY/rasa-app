import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const TEST_UUID = '00000000-0000-0000-0000-000000000001'

const mockMessagesCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  function AnthropicMock() {
    return { messages: { create: mockMessagesCreate } }
  }
  AnthropicMock.prototype = {}
  return { default: AnthropicMock }
})

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

const MOCK_MEALS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
  day,
  recipe_name: `Test Recipe ${day}`,
  reasoning: `Good for ${day}`,
  use_soon_priority: false,
  recipe: {
    name: `Test Recipe ${day}`,
    cuisine_type: 'varied',
    cook_time_minutes: 30,
    servings: 2,
    ingredients: [{ name: 'chicken', quantity: 200, unit: 'g' }],
    steps_v2: [{ instruction: 'Cook it' }],
    prep_ahead: [{ task: 'Chop veg', time_sensitive: false }],
    is_complete_meal: true,
  },
}))

const VALID_AI_RESPONSE = JSON.stringify({ meals: MOCK_MEALS })

function buildSupabaseMock({
  prefsData = null,
  recipesExisting = null,
  recipeInsertId = 'recipe-id-1',
  weekPlanExisting = null,
  weekPlanInsertId = 'week-plan-id-1',
  weekPlanUpdateError = null,
  weekPlanInsertError = null,
  mealsInsertError = null,
}: {
  prefsData?: unknown
  recipesExisting?: unknown
  recipeInsertId?: string
  weekPlanExisting?: unknown
  weekPlanInsertId?: string
  weekPlanUpdateError?: unknown
  weekPlanInsertError?: unknown
  mealsInsertError?: unknown
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_preferences') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: prefsData, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }

    if (table === 'recipes') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: recipesExisting, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: recipeInsertId }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }

    if (table === 'week_plans') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: weekPlanExisting, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: weekPlanInsertError ? null : { id: weekPlanInsertId },
              error: weekPlanInsertError ?? null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: weekPlanUpdateError ?? null }),
        }),
      }
    }

    if (table === 'meals') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mealsInsertError ? null : [{ id: 'meal-1' }],
            error: mealsInsertError ?? null,
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }
    }

    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  })
}

async function callRoute(body: unknown) {
  const { POST } = await import('@/app/api/plans/generate-v2/route')
  const req = new NextRequest('http://localhost/api/plans/generate-v2', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  return POST(req)
}

describe('POST /api/plans/generate-v2', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
    mockMessagesCreate.mockReset()
  })

  it('happy path — valid anon_id + pantry_input — returns 200 with plan shape', async () => {
    buildSupabaseMock()
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: VALID_AI_RESPONSE }],
    })

    const res = await callRoute({ anon_id: TEST_UUID, pantry_input: 'chicken, rice, broccoli' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.week_plan_id).toBeDefined()
    expect(Array.isArray(json.meals)).toBe(true)
    expect(typeof json.recipe_ids).toBe('object')
  })

  it('missing anon_id — returns 400', async () => {
    const res = await callRoute({ pantry_input: 'chicken, rice' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('empty anon_id string — returns 400', async () => {
    const res = await callRoute({ anon_id: '', pantry_input: 'chicken, rice' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('missing pantry_input — returns 400', async () => {
    const res = await callRoute({ anon_id: TEST_UUID })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('invalid JSON body — returns 400', async () => {
    const { POST } = await import('@/app/api/plans/generate-v2/route')
    const req = new NextRequest('http://localhost/api/plans/generate-v2', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('Anthropic SDK throws — returns 500', async () => {
    buildSupabaseMock()
    mockMessagesCreate.mockRejectedValue(new Error('Anthropic API error'))

    const res = await callRoute({ anon_id: TEST_UUID, pantry_input: 'chicken, rice' })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('AI returns invalid JSON — returns 500', async () => {
    buildSupabaseMock()
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'sorry I cannot do that' }],
    })

    const res = await callRoute({ anon_id: TEST_UUID, pantry_input: 'chicken, rice' })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('AI returns empty meals array — returns 500', async () => {
    buildSupabaseMock()
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ meals: [] }) }],
    })

    const res = await callRoute({ anon_id: TEST_UUID, pantry_input: 'chicken, rice' })
    expect(res.status).toBe(500)
  })

  it('supabase week_plans insert failure — returns 500', async () => {
    buildSupabaseMock({ weekPlanInsertError: { message: 'insert failed' } })
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: VALID_AI_RESPONSE }],
    })

    const res = await callRoute({ anon_id: TEST_UUID, pantry_input: 'chicken, rice' })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('supabase meals insert failure — returns 500', async () => {
    buildSupabaseMock({ mealsInsertError: { message: 'meals insert failed' } })
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: VALID_AI_RESPONSE }],
    })

    const res = await callRoute({ anon_id: TEST_UUID, pantry_input: 'chicken, rice' })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('passes week_context and use_soon through to prompt without error', async () => {
    buildSupabaseMock()
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: VALID_AI_RESPONSE }],
    })

    const res = await callRoute({
      anon_id: TEST_UUID,
      pantry_input: 'chicken, rice',
      week_context: 'Busy Tuesday',
      use_soon: 'spinach',
    })
    expect(res.status).toBe(200)
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('spinach'),
          }),
        ]),
      })
    )
  })
})
