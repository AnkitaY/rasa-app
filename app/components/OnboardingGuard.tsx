'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAnonId } from '@/lib/anon'

/**
 * Wraps every page and ensures first-time visitors complete onboarding.
 *
 * Logic on mount:
 * 1. Skip the check entirely for /onboarding/** routes (avoid redirect loops).
 * 2. Call getAnonId() — generates a new UUID and persists it if this is a
 *    brand-new device; returns the existing one otherwise.
 * 3. Fetch /api/preferences/get to see whether a preferences row exists.
 * 4. No row → redirect to /onboarding.
 * 5. Row exists → render children.
 *
 * While checking we render nothing (a brief blank flash) so there is no
 * content visible before a potential redirect.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  // Skip guard entirely on onboarding pages
  const isOnboarding = pathname.startsWith('/onboarding')

  useEffect(() => {
    if (isOnboarding) {
      setReady(true)
      return
    }

    const anonId = getAnonId()

    fetch(`/api/preferences/get?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ preferences }) => {
        if (!preferences) {
          router.replace('/onboarding')
        } else {
          setReady(true)
        }
      })
      .catch(() => {
        // On network failure, allow through — don't block the whole app
        setReady(true)
      })
  }, [isOnboarding, router])

  if (isOnboarding) return <>{children}</>
  if (!ready) return null

  return <>{children}</>
}
