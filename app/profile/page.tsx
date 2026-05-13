'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAnonId } from '@/lib/anon'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import { MealTypeChips } from '@/app/components/MealTypeChips'
import { DaysStepper, MEAL_TYPE_DEFAULTS, MEAL_TYPE_RANGES } from '@/app/components/DaysStepper'

// ── Constants ─────────────────────────────────────────────────────────────────

const DIETARY_CHIPS = ['Vegetarian', 'Halal', 'Vegan', 'Gluten-free', 'Dairy-free']

const WHO_FOR_OPTIONS = [
  { value: 'just_me',           label: 'Just me',            emoji: '🧑‍🍳' },
  { value: 'me_and_partner',    label: 'Me + partner',       emoji: '👫' },
  { value: 'family_young_kids', label: 'Family, young kids', emoji: '👨‍👩‍👧' },
  { value: 'family_teens',      label: 'Family, teens',      emoji: '👨‍👩‍👦' },
]

const CUISINE_OPTIONS = [
  'Indian', 'Italian', 'Thai', 'Mexican', 'Mediterranean',
  'Japanese', 'Chinese', 'Middle Eastern', 'Korean', 'Other',
]

const SKILL_OPTIONS = [
  { value: 'finding_my_feet',  label: 'Beginner',      sub: 'Simple weeknight staples' },
  { value: 'pretty_confident', label: 'Home cook',     sub: 'Comfortable with most recipes' },
  { value: 'enjoy_challenge',  label: 'Adventurous',   sub: 'Happy to try complex dishes' },
]

const BUDGET_OPTIONS = [
  { value: 'under_30',    label: '≤ 30 min',  sub: 'Always in a rush' },
  { value: '30_to_45',    label: '30–45 min', sub: 'The usual weeknight' },
  { value: 'hour_is_fine', label: '60 min+',  sub: 'Happy to take my time' },
]

const GOAL_OPTIONS = [
  'Eat healthier', 'Reduce food waste', 'Save money',
  'Try new cuisines', 'Cook more at home', 'Batch cook',
]

const HEALTH_GOAL_CHIPS = [
  { label: 'High protein, balanced', value: 'high protein, balanced' },
  { label: 'Lighter meals',          value: 'lighter meals'          },
  { label: 'Family-friendly',        value: 'family-friendly'        },
  { label: 'Quick and simple',       value: 'quick and simple'       },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()

  // ── Load state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // ── Block 1 — onboarding prefs ──────────────────────────────────────────────
  const [dietaryText, setDietaryText] = useState('')
  const [dietaryDisabled, setDietaryDisabled] = useState(false)
  const [whoFor, setWhoFor] = useState('')
  const [primaryCuisine, setPrimaryCuisine] = useState('')
  const [primaryOther, setPrimaryOther] = useState('')
  const [showPrimaryOther, setShowPrimaryOther] = useState(false)
  const [secondaryCuisines, setSecondaryCuisines] = useState<string[]>([])

  // ── Block 2 — fine-tune ─────────────────────────────────────────────────────
  const [banned, setBanned] = useState('')
  const [skill, setSkill] = useState('')
  const [budget, setBudget] = useState('')
  const [goals, setGoals] = useState<string[]>([])

  // ── Block 3 — My cooking ────────────────────────────────────────────────────
  const [mealTypesDefault, setMealTypesDefault] = useState<string[]>(['breakfast', 'dinner'])
  const [mealDaysDefault, setMealDaysDefault] = useState<Record<string, number>>({ breakfast: 5, dinner: 2 })
  const [healthGoalChips, setHealthGoalChips] = useState<string[]>([])
  const [showHealthFreeText, setShowHealthFreeText] = useState(false)
  const [healthGoalFreeText, setHealthGoalFreeText] = useState('')

  // tracks whether initial prefs have been loaded so auto-save doesn't fire on mount
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // skips the first auto-save effect run (triggered by prefsLoaded flipping to true)
  const initialLoadRef = useRef(true)

  // ── Load prefs on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const anonId = getAnonId()
    fetch(`/api/preferences/get?anon_id=${encodeURIComponent(anonId)}`)
      .then(r => r.json())
      .then(({ preferences: p }) => {
        if (!p) return
        // Block 1
        setDietaryText(p.dietary_rules ?? '')
        setDietaryDisabled(p.dietary_rules === 'None')
        setWhoFor(p.who_cooking_for ?? '')
        const pc = p.primary_cuisine ?? ''
        if (CUISINE_OPTIONS.includes(pc)) {
          setPrimaryCuisine(pc)
          if (pc === 'Other') setShowPrimaryOther(true)
        } else if (pc) {
          setPrimaryCuisine('Other')
          setPrimaryOther(pc)
          setShowPrimaryOther(true)
        }
        setSecondaryCuisines(p.secondary_cuisines ?? [])
        // Block 2
        setBanned(p.banned_ingredients ?? '')
        setSkill(p.skill_level ?? '')
        setBudget(p.weeknight_budget ?? '')
        setGoals(p.goals ?? [])
        // Block 3 — My cooking (normalize brunch → breakfast for existing rows)
        if (Array.isArray(p.meal_types_default) && p.meal_types_default.length > 0) {
          const normalized = (p.meal_types_default as string[]).map(t => t === 'brunch' ? 'breakfast' : t)
          setMealTypesDefault(Array.from(new Set(normalized)))
        }
        if (p.meal_days_default && typeof p.meal_days_default === 'object') {
          const raw = p.meal_days_default as Record<string, number>
          const normalized: Record<string, number> = {}
          for (const [k, v] of Object.entries(raw)) {
            const key = k === 'brunch' ? 'breakfast' : k
            normalized[key] = (normalized[key] ?? 0) + (v as number)
          }
          setMealDaysDefault(normalized)
        }
        // Parse health_goals into chips + free text
        const rawGoals = (p.health_goals as string | null) ?? ''
        if (rawGoals) {
          const knownValues = new Set(HEALTH_GOAL_CHIPS.map(c => c.value))
          const parts = rawGoals.split(',').map((s: string) => s.trim()).filter(Boolean)
          const matched: string[] = []
          const unmatched: string[] = []
          for (const part of parts) {
            if (knownValues.has(part)) {
              matched.push(part)
            } else {
              unmatched.push(part)
            }
          }
          setHealthGoalChips(matched)
          if (unmatched.length > 0) {
            setHealthGoalFreeText(unmatched.join(', '))
            setShowHealthFreeText(true)
          }
        }
      })
      .catch(() => { /* silently fail — form stays blank */ })
      .finally(() => {
        setLoading(false)
        setPrefsLoaded(true)
      })
  }, [])

  // ── Auto-save "My cooking" fields on change ──────────────────────────────────
  useEffect(() => {
    if (!prefsLoaded) return
    if (initialLoadRef.current) { initialLoadRef.current = false; return }
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      const anonId = getAnonId()
      const healthParts = [
        ...healthGoalChips,
        ...(showHealthFreeText && healthGoalFreeText.trim() ? [healthGoalFreeText.trim()] : []),
      ]
      fetch('/api/preferences/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id: anonId,
          meal_types_default: mealTypesDefault,
          meal_days_default: mealDaysDefault,
          health_goals: healthParts.join(', ') || null,
        }),
      }).catch(() => {})
    }, 800)
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [prefsLoaded, mealTypesDefault, mealDaysDefault, healthGoalChips, showHealthFreeText, healthGoalFreeText])

  // ── Meal type handlers ───────────────────────────────────────────────────────
  function handleMealTypeDefaultChange(selected: string[]) {
    setMealTypesDefault(selected)
    setMealDaysDefault(prev => {
      const next = { ...prev }
      for (const type of selected) {
        if (next[type] === undefined) {
          next[type] = MEAL_TYPE_DEFAULTS[type] ?? 3
        }
      }
      return next
    })
  }

  function handleDefaultDaysChange(type: string, value: number) {
    const { min, max } = MEAL_TYPE_RANGES[type] ?? { min: 1, max: 7 }
    setMealDaysDefault(prev => ({ ...prev, [type]: Math.min(max, Math.max(min, value)) }))
  }

  // ── Health goal chip handlers ────────────────────────────────────────────────
  function toggleHealthGoalChip(value: string) {
    setHealthGoalChips(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  // ── Dietary chip handler ─────────────────────────────────────────────────────
  function toggleDietaryChip(chip: string) {
    if (chip === 'None') {
      setDietaryText('None')
      setDietaryDisabled(true)
      return
    }
    setDietaryDisabled(false)
    setDietaryText(prev => {
      if (prev === 'None') return chip
      const parts = prev.split(',').map(s => s.trim()).filter(Boolean)
      if (parts.includes(chip)) {
        return parts.filter(p => p !== chip).join(', ')
      }
      return [...parts, chip].join(', ')
    })
  }

  // ── Secondary cuisine toggle ─────────────────────────────────────────────────
  function toggleSecondary(c: string) {
    setSecondaryCuisines(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  // ── Goal toggle ──────────────────────────────────────────────────────────────
  function toggleGoal(g: string) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  // ── Save (Block 1 + Block 2) ─────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    const anonId = getAnonId()
    const finalPrimary = primaryCuisine === 'Other' && primaryOther.trim()
      ? primaryOther.trim()
      : primaryCuisine
    try {
      const res = await fetch('/api/preferences/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id: anonId,
          dietary_rules: dietaryText.trim() || null,
          who_cooking_for: whoFor || null,
          primary_cuisine: finalPrimary || null,
          secondary_cuisines: secondaryCuisines,
          banned_ingredients: banned.trim() || null,
          skill_level: skill || null,
          weeknight_budget: budget || null,
          goals,
        }),
      })
      if (!res.ok) {
        setError('Hmm, something went wrong. Give it one more try?')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 4000)
      }
    } catch {
      setError('Hmm, something went wrong. Give it one more try?')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-p1-cream">
        <div className="px-5 pt-12 pb-5">
          <div className="h-6 w-32 bg-p1-surface rounded animate-pulse" />
        </div>
        <div className="px-5 space-y-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-p1-surface rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  const dietaryParts = dietaryText.split(',').map(s => s.trim()).filter(Boolean)

  return (
    <main className="min-h-screen bg-p1-cream pb-32">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-5 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-p1-brown active:opacity-60"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-ui font-bold text-p1-dark">Your preferences</h1>
      </div>

      <div className="px-5 space-y-8">

        {/* ══════════════════════════════════════════════════════════════════
            BLOCK 1 — From onboarding
        ════════════════════════════════════════════════════════════════════ */}

        {/* ── Dietary rules ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest mb-3">
            Dietary rules
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {[...DIETARY_CHIPS, 'None'].map(chip => {
              const active = chip === 'None'
                ? dietaryDisabled
                : !dietaryDisabled && dietaryParts.includes(chip)
              return (
                <button
                  key={chip}
                  onClick={() => toggleDietaryChip(chip)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
                    active
                      ? 'bg-p1-terra text-white border-p1-terra'
                      : 'bg-p1-card text-p1-brown border-p1-border'
                  )}
                >
                  {chip}
                </button>
              )
            })}
          </div>
          <textarea
            value={dietaryDisabled ? '' : dietaryText}
            onChange={e => setDietaryText(e.target.value)}
            disabled={dietaryDisabled}
            placeholder="Or type your own rules…"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-p1-border bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors resize-none disabled:opacity-40"
          />
        </section>

        {/* ── Who are you cooking for ──────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest mb-3">
            Who are you cooking for?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {WHO_FOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setWhoFor(opt.value)}
                className={cn(
                  'flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left transition-all',
                  whoFor === opt.value
                    ? 'border-p1-terra bg-p1-terra-lt'
                    : 'border-p1-border bg-p1-card'
                )}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className={cn(
                  'text-sm font-ui font-semibold',
                  whoFor === opt.value ? 'text-p1-terra' : 'text-p1-dark'
                )}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Cuisines ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest mb-1">
            Home cuisine
          </h2>
          <p className="text-xs font-ui text-p1-brown/70 mb-3">
            Your primary cuisine — we&apos;ll build most meals around this.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {CUISINE_OPTIONS.map(c => (
              <button
                key={c}
                onClick={() => {
                  setPrimaryCuisine(c)
                  setShowPrimaryOther(c === 'Other')
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
                  primaryCuisine === c
                    ? 'bg-p1-terra text-white border-p1-terra'
                    : 'bg-p1-card text-p1-brown border-p1-border'
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {showPrimaryOther && (
            <input
              type="text"
              value={primaryOther}
              onChange={e => setPrimaryOther(e.target.value)}
              placeholder="Your cuisine…"
              className="w-full px-4 py-3 rounded-xl border border-p1-terra bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none transition-colors mb-3"
            />
          )}

          {primaryCuisine && (
            <>
              <p className="text-xs font-ui text-p1-brown/70 mt-4 mb-2">
                Also enjoy (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.filter(c => c !== primaryCuisine).map(c => (
                  <button
                    key={c}
                    onClick={() => toggleSecondary(c)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
                      secondaryCuisines.includes(c)
                        ? 'bg-p1-forest-lt text-p1-forest border-p1-forest/40'
                        : 'bg-p1-card text-p1-brown border-p1-border'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="h-px bg-p1-border-lt" />

        {/* ══════════════════════════════════════════════════════════════════
            BLOCK 2 — Fine-tune
        ════════════════════════════════════════════════════════════════════ */}

        {/* ── Never on the menu ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest mb-1">
            Never on the menu
          </h2>
          <p className="text-xs font-ui text-p1-brown/70 mb-3">
            Ingredients we&apos;ll always leave out.
          </p>
          <textarea
            value={banned}
            onChange={e => setBanned(e.target.value)}
            placeholder="e.g. mushrooms, blue cheese, anchovies…"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-p1-border bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors resize-none"
          />
        </section>

        {/* ── Skill level ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest mb-3">
            Skill level
          </h2>
          <div className="space-y-2">
            {SKILL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSkill(opt.value)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left transition-all',
                  skill === opt.value
                    ? 'border-p1-terra bg-p1-terra-lt'
                    : 'border-p1-border bg-p1-card'
                )}
              >
                <div>
                  <p className={cn(
                    'text-sm font-ui font-semibold',
                    skill === opt.value ? 'text-p1-terra' : 'text-p1-dark'
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-xs font-ui text-p1-brown mt-0.5">{opt.sub}</p>
                </div>
                {skill === opt.value && (
                  <span className="text-p1-terra text-lg">✓</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── Weeknight time ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest mb-3">
            Weeknight time budget
          </h2>
          <div className="space-y-2">
            {BUDGET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBudget(opt.value)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-left transition-all',
                  budget === opt.value
                    ? 'border-p1-terra bg-p1-terra-lt'
                    : 'border-p1-border bg-p1-card'
                )}
              >
                <div>
                  <p className={cn(
                    'text-sm font-ui font-semibold',
                    budget === opt.value ? 'text-p1-terra' : 'text-p1-dark'
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-xs font-ui text-p1-brown mt-0.5">{opt.sub}</p>
                </div>
                {budget === opt.value && (
                  <span className="text-p1-terra text-lg">✓</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── Goals ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest mb-1">
            What matters to you
          </h2>
          <p className="text-xs font-ui text-p1-brown/70 mb-3">Pick as many as you like.</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map(g => (
              <button
                key={g}
                onClick={() => toggleGoal(g)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
                  goals.includes(g)
                    ? 'bg-p1-terra text-white border-p1-terra'
                    : 'bg-p1-card text-p1-brown border-p1-border'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="h-px bg-p1-border-lt" />

        {/* ══════════════════════════════════════════════════════════════════
            BLOCK 3 — My cooking
        ════════════════════════════════════════════════════════════════════ */}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-ui font-bold text-p1-dark">My cooking</h2>
            <p className="text-xs font-ui text-p1-brown/70 mt-1">
              This pre-fills your planning form every week. You can always adjust when you plan.
            </p>
          </div>

          {/* ── Field 1 — Which meals do you cook ─────────────────────── */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest block">
              Which meals do you cook at home?
            </label>
            <p className="text-xs font-ui text-p1-brown/70">Pick everything that applies.</p>
            <MealTypeChips
              selected={mealTypesDefault}
              onChange={handleMealTypeDefaultChange}
            />
          </div>

          {/* ── Field 2 — Typical days per week (per type) ────────────── */}
          {mealTypesDefault.length > 0 && (
            <div className="space-y-1 bg-p1-card rounded-2xl px-4 py-2 mb-6">
              {mealTypesDefault.map(type => (
                <DaysStepper
                  key={type}
                  label={`Typical ${type} days per week`}
                  mealType={type}
                  value={mealDaysDefault[type] ?? MEAL_TYPE_DEFAULTS[type] ?? 3}
                  onChange={value => handleDefaultDaysChange(type, value)}
                />
              ))}
              <p className="text-xs font-ui text-p1-brown/60 pt-1 pb-1">
                This is your usual week — not a hard rule. You&apos;ll set the exact days each time you plan.
              </p>
            </div>
          )}

          {/* ── Field 3 — Health goals ────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest block">
              How do you like to eat?
            </label>
            <p className="text-xs font-ui text-p1-brown/70">
              We&apos;ll keep this in mind when building your plan.
            </p>
            <div className="flex flex-wrap gap-2">
              {HEALTH_GOAL_CHIPS.map(chip => {
                const active = healthGoalChips.includes(chip.value)
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => toggleHealthGoalChip(chip.value)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
                      active
                        ? 'bg-p1-terra text-white border-p1-terra'
                        : 'bg-p1-card text-p1-brown border-p1-border'
                    )}
                  >
                    {chip.label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setShowHealthFreeText(v => !v)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[11px] font-ui font-semibold border transition-all',
                  showHealthFreeText
                    ? 'bg-p1-terra text-white border-p1-terra'
                    : 'bg-p1-card text-p1-brown border-p1-border'
                )}
              >
                Something else
              </button>
            </div>
            {showHealthFreeText && (
              <input
                type="text"
                value={healthGoalFreeText}
                onChange={e => setHealthGoalFreeText(e.target.value)}
                placeholder="Tell us your preference"
                className="w-full px-4 py-3 rounded-xl border border-p1-border bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors mt-2"
              />
            )}
          </div>
        </section>

      </div>

      {/* ── Sticky save bar (Block 1 + Block 2 only — My cooking auto-saves) ─── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-p1-cream border-t border-p1-border-lt">
        {saved && (
          <p className="text-center text-xs font-ui text-p1-forest font-semibold mb-2">
            ✓ Preferences saved. Your next plan will reflect these.
          </p>
        )}
        {error && (
          <p className="text-center text-xs font-ui text-p1-terra mb-2">{error}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-p1-dark text-white text-sm font-ui font-semibold shadow-lg active:opacity-80 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>

    </main>
  )
}
