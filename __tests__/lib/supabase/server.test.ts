import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ from: vi.fn(), auth: {} })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

describe('createClient (server)', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
    vi.resetModules()
  })

  it('returns a client object with a from method', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const client = createClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('calls createServerClient with correct URL and anon key', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    const { createClient } = await import('@/lib/supabase/server')
    createClient()
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })
})
