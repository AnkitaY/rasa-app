'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, ChefHat, Package, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',          label: 'Home',    Icon: Home },
  { href: '/planner',   label: 'Plan',    Icon: CalendarDays },
  { href: '/recipes',   label: 'Recipes', Icon: ChefHat },
  { href: '/inventory', label: 'Fridge',  Icon: Package },
  { href: '/shopping',  label: 'Shop',    Icon: ShoppingCart },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
      <div className="max-w-2xl mx-auto flex items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] text-[10px] font-medium transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5px]')} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
