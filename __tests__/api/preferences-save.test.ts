import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const TEST_UUID = '00000000-0000-0000-0000-000000000001'

const mockFrom = vi.fn()
const mockAdminClient = { from: mockFrom }

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function makeUpdateChain(result: { error: unknown }) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function makeInsertChain(result: { error: unknown }) {
  return {
    insert: vi.fn().mockResolvedValue(result),
  }
}

async function callRoute(body: unknown) {
  const { POST } = await import('@/app/api/preferences/save/route')
  const req = new NextRequest('http://localhost/api/preferences/save', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  return POST(req)
}

describe('POST /api/preferences/save', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
  })

  it('happy path — existing row — returns 200 ok', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
    })

    const res = await callRoute({ anon_id: TEST_UUID, who_cooking_for: 'just_me' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('happy path — new row insert — returns 200 ok', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
    })

    const res = await callRoute({ anon_id: TEST_UUID, who_cooking_for: 'family_teens' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('missing anon_id — returns 400', async () => {
    const res = await callRoute({ who_cooking_for: 'just_me' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/anon_id/i)
  })

  it('empty anon_id string — returns 400', async () => {
    const res = await callRoute({ anon_id: '', who_cooking_for: 'just_me' })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/anon_id/i)
  })

  it('invalid JSON body — returns 400', async () => {
    const { POST } = await import('@/app/api/preferences/save/route')
    const req = new NextRequest('http://localhost/api/preferences/save', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('supabase fetch error — returns 500', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
            }),
          }),
        }
      }
    })

    const res = await callRoute({ anon_id: TEST_UUID, who_cooking_for: 'just_me' })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('supabase update error — returns 500', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'update failed' } }),
          }),
        }
      }
    })

    const res = await callRoute({ anon_id: TEST_UUID, who_cooking_for: 'just_me' })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('supabase insert error on new row — returns 500', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_preferences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'insert failed' } }),
        }
      }
    })

    const res = await callRoute({ anon_id: TEST_UUID })
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
