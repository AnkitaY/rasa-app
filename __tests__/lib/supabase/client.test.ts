import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ from: vi.fn(), auth: {} })),
}))

describe('createClient (browser)', () => {
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
    const { createClient } = await import('@/lib/supabase/client')
    const client = createClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('calls createBrowserClient with correct URL and anon key', async () => {
    const { createBrowserClient } = await import('@supabase/ssr')
    const { createClient } = await import('@/lib/supabase/client')
    createClient()
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'anon-key'
    )
  })
})
