import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('createAdminClient', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
    vi.resetModules()
  })

  it('returns a client object with a from method', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const client = createAdminClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('calls createClient with the correct URL and service role key', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    createAdminClient()
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'service-role-key',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  })
})
