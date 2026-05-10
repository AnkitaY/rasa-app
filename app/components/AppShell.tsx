'use client'

import { usePathname } from 'next/navigation'

/**
 * Wraps page content with bottom-nav clearance for the consumer app, and
 * gets out of the way on the internal /ops console (which has its own layout).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/ops')) return <>{children}</>
  return <div className="pb-20">{children}</div>
}
