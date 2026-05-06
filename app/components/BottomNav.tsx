'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, ShoppingBasket, ShoppingCart, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',         label: 'Home',     Icon: Home },
  { href: '/planner',  label: 'Planner',  Icon: CalendarDays },
  { href: '/pantry',   label: 'Pantry',   Icon: ShoppingBasket },
  { href: '/shopping', label: 'Shopping', Icon: ShoppingCart },
  { href: '/recipes',  label: 'Recipes',  Icon: BookOpen },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: '#2B1C12',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-2xl mx-auto flex items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 flex-1 py-2.5 min-h-[60px] text-[10px] font-ui font-semibold tracking-wide transition-colors',
                active
                  ? 'text-p1-terra'
                  : 'hover:opacity-70'
              )}
              style={!active ? { color: 'rgba(255,255,255,0.4)' } : undefined}
            >
              <div className="relative flex flex-col items-center gap-1">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all',
                    active ? 'stroke-[2.25px]' : 'stroke-[1.75px]'
                  )}
                />
                {/* Active terra dot */}
                {active && (
                  <span
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-p1-terra"
                  />
                )}
              </div>
              <span className="mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
