'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch',     label: 'Lunch'     },
  { value: 'dinner',    label: 'Dinner'    },
] as const

interface MealTypeChipsProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function MealTypeChips({ selected, onChange }: MealTypeChipsProps) {
  const [showError, setShowError] = useState(false)

  function toggle(value: string) {
    if (selected.includes(value)) {
      const next = selected.filter(v => v !== value)
      if (next.length > 0) {
        setShowError(false)
        onChange(next)
      } else {
        setShowError(true)
      }
    } else {
      setShowError(false)
      onChange([...selected, value])
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MEAL_TYPES.map(({ value, label }) => {
          const active = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-ui font-semibold border transition-all active:opacity-70',
                active
                  ? 'bg-p1-terra text-white border-p1-terra'
                  : 'bg-p1-surface text-p1-dark border-p1-border'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
      {showError && (
        <p className="mt-2 text-xs font-ui text-p1-terra">
          Pick at least one meal type to continue.
        </p>
      )}
    </div>
  )
}
