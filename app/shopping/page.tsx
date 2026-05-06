'use client'

import { useEffect, useState } from 'react'
import { getAnonId } from '@/lib/anon'
import { ShoppingListItem } from '@/lib/types'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  Produce:  '🥦',
  Protein:  '🥩',
  Dairy:    '🥛',
  Spices:   '🌶️',
  Pantry:   '🥫',
  Other:    '📦',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Groups = Record<string, ShoppingListItem[]>

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemQtyLabel(item: ShoppingListItem): string {
  if (item.quantity_needed === null && !item.unit) return ''
  const qty = item.quantity_needed !== null
    ? (item.quantity_needed % 1 === 0
        ? item.quantity_needed.toString()
        : item.quantity_needed.toFixed(1))
    : ''
  return [qty, item.unit].filter(Boolean).join(' ')
}

function buildClipboardText(groups: Groups, checked: Set<string>): string {
  const lines: string[] = ['🛒 Shopping list\n']
  for (const [cat, items] of Object.entries(groups)) {
    const unchecked = items.filter(i => !checked.has(`${cat}:${i.name}`))
    if (unchecked.length === 0) continue
    lines.push(`${CATEGORY_EMOJI[cat] ?? '📦'} ${cat.toUpperCase()}`)
    for (const item of unchecked) {
      const qty = itemQtyLabel(item)
      lines.push(`  □ ${item.name}${qty ? ' — ' + qty : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const [groups, setGroups] = useState<Groups>({})
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function loadList() {
    const anonId = getAnonId()
    setError('')
    try {
      const res = await fetch('/api/shopping/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anon_id: anonId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setGroups({})
      } else {
        setGroups(data.groups ?? {})
        setChecked(new Set()) // reset checks on fresh list
      }
    } catch {
      setError('Hmm, something went wrong. Give it one more try?')
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }

  useEffect(() => { loadList() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCheck(cat: string, name: string) {
    const key = `${cat}:${name}`
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  function handleRegenerate() {
    setRegenerating(true)
    setLoading(true)
    loadList()
  }

  async function handleCopy() {
    const text = buildClipboardText(groups, checked)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const totalItems = Object.values(groups).flat().length
  const checkedCount = checked.size
  const allDone = totalItems > 0 && checkedCount >= totalItems

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-p1-cream">
        <div className="px-5 pt-12 pb-6">
          <div className="h-7 w-40 bg-p1-surface rounded animate-pulse" />
          <div className="h-4 w-56 bg-p1-surface rounded mt-2 animate-pulse" />
        </div>
        <div className="px-5 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-p1-surface rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-p1-cream">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-ui font-bold text-p1-dark">Shopping list</h1>
          {totalItems > 0 && (
            <p className="mt-0.5 text-sm text-p1-brown font-ui">
              {totalItems - checkedCount} item{totalItems - checkedCount !== 1 ? 's' : ''} to grab
              {checkedCount > 0 && ` · ${checkedCount} done`}
            </p>
          )}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs font-ui font-medium text-p1-terra pt-1.5 disabled:opacity-50"
        >
          {regenerating ? 'Updating…' : 'Refresh ↺'}
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mb-5 px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
          <p className="text-sm font-ui text-p1-brown">{error}</p>
        </div>
      )}

      {/* ── All done ────────────────────────────────────────────────────────── */}
      {allDone && (
        <div className="mx-5 mb-4 px-4 py-3 rounded-2xl bg-p1-forest-lt border border-p1-forest/20">
          <p className="text-sm font-ui font-semibold text-p1-forest">
            🎉 That&apos;s everything. You&apos;re all set.
          </p>
        </div>
      )}

      {/* ── Groups ──────────────────────────────────────────────────────────── */}
      <div className="px-5 space-y-5 pb-32">
        {Object.entries(groups).map(([cat, items]) => {
          const catCheckedCount = items.filter(i => checked.has(`${cat}:${i.name}`)).length
          return (
            <section key={cat}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{CATEGORY_EMOJI[cat] ?? '📦'}</span>
                  <h2 className="text-xs font-ui font-bold text-p1-brown uppercase tracking-widest">
                    {cat}
                  </h2>
                </div>
                {catCheckedCount > 0 && (
                  <span className="text-[10px] font-ui text-p1-brown/60">
                    {catCheckedCount}/{items.length}
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="rounded-2xl bg-p1-card border border-p1-border-lt overflow-hidden">
                {items.map((item, idx) => {
                  const key = `${cat}:${item.name}`
                  const isChecked = checked.has(key)
                  const qty = itemQtyLabel(item)
                  return (
                    <button
                      key={item.name}
                      onClick={() => toggleCheck(cat, item.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                        idx < items.length - 1 && 'border-b border-p1-border-lt',
                        isChecked && 'bg-p1-surface/50'
                      )}
                    >
                      {/* Checkbox */}
                      <span className={cn(
                        'shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                        isChecked
                          ? 'border-p1-forest bg-p1-forest'
                          : 'border-p1-border bg-transparent'
                      )}>
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>

                      {/* Name */}
                      <span className={cn(
                        'flex-1 text-sm font-ui',
                        isChecked ? 'line-through text-p1-brown/50' : 'text-p1-dark'
                      )}>
                        {item.name}
                      </span>

                      {/* Quantity */}
                      {qty && (
                        <span className={cn(
                          'text-xs font-ui shrink-0',
                          isChecked ? 'text-p1-brown/40' : 'text-p1-brown'
                        )}>
                          {qty}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!error && totalItems === 0 && (
          <div className="flex flex-col items-center text-center pt-12 gap-4">
            <span className="text-5xl">🧺</span>
            <div>
              <p className="text-base font-ui font-semibold text-p1-dark">
                Looks like you&apos;ve got everything
              </p>
              <p className="text-sm font-ui text-p1-brown mt-1">
                Your pantry covers the whole week. Nice.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ───────────────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-5">
          <button
            onClick={handleCopy}
            className="w-full py-3.5 rounded-2xl bg-p1-dark text-white text-sm font-ui font-semibold shadow-lg active:opacity-80 transition-opacity"
          >
            {copied ? '✓ Copied to clipboard' : 'Copy list'}
          </button>
        </div>
      )}
    </main>
  )
}
