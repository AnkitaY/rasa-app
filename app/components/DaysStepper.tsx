'use client'

export const MEAL_TYPE_RANGES: Record<string, { min: number; max: number }> = {
  breakfast: { min: 1, max: 7 },
  brunch:    { min: 1, max: 6 },
  lunch:     { min: 1, max: 5 },
  dinner:    { min: 1, max: 7 },
}

export const MEAL_TYPE_DEFAULTS: Record<string, number> = {
  breakfast: 3,
  brunch:    5,
  lunch:     3,
  dinner:    2,
}

interface DaysStepperProps {
  label: string
  mealType: string
  value: number
  onChange: (value: number) => void
}

export function DaysStepper({ label, mealType, value, onChange }: DaysStepperProps) {
  const { min, max } = MEAL_TYPE_RANGES[mealType] ?? { min: 1, max: 7 }

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm font-ui text-p1-dark pr-4">{label}</span>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full bg-p1-surface text-p1-dark font-ui font-bold text-base flex items-center justify-center disabled:opacity-40 active:opacity-60 transition-opacity"
          aria-label={`Decrease ${mealType} days`}
        >
          −
        </button>
        <span className="w-5 text-center text-base font-ui font-semibold text-p1-dark tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full bg-p1-surface text-p1-dark font-ui font-bold text-base flex items-center justify-center disabled:opacity-40 active:opacity-60 transition-opacity"
          aria-label={`Increase ${mealType} days`}
        >
          +
        </button>
      </div>
    </div>
  )
}
