'use client'

import { useEffect, useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Bfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DaySelectionWidgetProps {
  selectedMealTypes: string[]
  onChange: (selections: Record<string, string[]>) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function allDaysOn(types: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const type of types) {
    result[type] = [...DAYS]
  }
  return result
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DaySelectionWidget({ selectedMealTypes, onChange }: DaySelectionWidgetProps) {
  // selections: { breakfast: ['Mon','Tue',...], dinner: [...] }
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    allDaysOn(selectedMealTypes)
  )

  // Sync selections when selectedMealTypes changes
  useEffect(() => {
    setSelections(prev => {
      const next: Record<string, string[]> = {}
      for (const type of selectedMealTypes) {
        // Preserve existing selections; new types default to all ON
        next[type] = prev[type] ?? [...DAYS]
      }
      return next
    })
  }, [selectedMealTypes])

  // Notify parent whenever selections change
  useEffect(() => {
    onChange(selections)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections])

  function toggleCell(type: string, day: string) {
    setSelections(prev => {
      const current = prev[type] ?? []
      const isOn = current.includes(day)
      const next = isOn ? current.filter(d => d !== day) : [...current, day]
      return { ...prev, [type]: next }
    })
  }

  // Validation: meal types with zero days selected
  const invalidTypes = selectedMealTypes.filter(
    type => (selections[type] ?? []).length === 0
  )

  // Summary counts
  const summaryParts = selectedMealTypes.map(type => {
    const count = (selections[type] ?? []).length
    const label = type.charAt(0).toUpperCase() + type.slice(1)
    return `${count} ${label} day${count !== 1 ? 's' : ''}`
  })

  if (selectedMealTypes.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Grid */}
      <div className="bg-p1-card rounded-2xl overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '52px' }} />
            {selectedMealTypes.map(type => (
              <col key={type} />
            ))}
          </colgroup>

          {/* Column headers */}
          <thead>
            <tr>
              <th className="h-11" />
              {selectedMealTypes.map(type => (
                <th
                  key={type}
                  className="h-11 text-xs font-semibold text-p1-brown text-center font-ui"
                >
                  {MEAL_TYPE_LABELS[type] ?? type}
                </th>
              ))}
            </tr>
          </thead>

          {/* Day rows */}
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                {/* Day label */}
                <td className="h-11 pl-3 text-xs font-ui font-medium text-p1-dark">
                  {day}
                </td>

                {/* Toggle cells */}
                {selectedMealTypes.map(type => {
                  const isOn = (selections[type] ?? []).includes(day)
                  return (
                    <td key={type} className="h-11 text-center">
                      {/* 44×44pt tap target wrapper */}
                      <button
                        type="button"
                        onClick={() => toggleCell(type, day)}
                        className="inline-flex items-center justify-center w-11 h-11 active:opacity-70 transition-opacity"
                        aria-label={`${isOn ? 'Deselect' : 'Select'} ${type} on ${day}`}
                      >
                        {isOn ? (
                          /* ON: filled terra square with checkmark */
                          <span
                            className="w-6 h-6 flex items-center justify-center rounded-sm"
                            style={{ backgroundColor: '#C4522A' }}
                          >
                            {/* 16×16 checkmark */}
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M3 8.5L6.5 12L13 5"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : (
                          /* OFF: bordered cream square */
                          <span
                            className="w-6 h-6 rounded-sm"
                            style={{
                              backgroundColor: '#FAF7F2',
                              border: '1.5px solid #DED2C2',
                            }}
                          />
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation messages */}
      {invalidTypes.map(type => (
        <p key={type} className="text-xs font-ui text-p1-terra px-1">
          Uncheck the chip above if you&apos;re skipping{' '}
          {type.charAt(0).toUpperCase() + type.slice(1)} this week.
        </p>
      ))}

      {/* Summary row */}
      <p className="text-sm font-ui text-p1-brown px-1">
        {summaryParts.join(' · ')}
      </p>
    </div>
  )
}

// Export a helper so page.tsx can check validity
export function isDaySelectionValid(
  selectedMealTypes: string[],
  selections: Record<string, string[]>
): boolean {
  return selectedMealTypes.every(type => (selections[type] ?? []).length > 0)
}
