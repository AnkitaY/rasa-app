'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingListItem } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  ShoppingCart,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Plus,
  AlertCircle,
  CalendarDays,
} from 'lucide-react'

const CATEGORY_EMOJI: Record<string, string> = {
  Protein: '🥩',
  Dairy: '🥛',
  Produce: '🥦',
  Pantry: '🥫',
  Spices: '🌶️',
  Other: '📦',
}

type GroupedItems = Record<string, ShoppingListItem[]>

// ─── format item label ─────────────────────────────────────────────────────────

function itemLabel(item: ShoppingListItem): string {
  const need = item.quantity_needed !== null ? `${item.quantity_needed}${item.unit ? ' ' + item.unit : ''}` : ''
  const have = item.quantity_have !== null ? ` (have ${item.quantity_have}${item.unit ? ' ' + item.unit : ''})` : ''
  return need ? `${need}${have}` : item.unit ?? ''
}

// ─── copy-to-clipboard formatter ──────────────────────────────────────────────

function formatForClipboard(grouped: GroupedItems, weekStart?: string): string {
  const header = `🛒 Shopping List${weekStart ? ` – Week of ${weekStart}` : ''}\n\n`
  const body = Object.entries(grouped)
    .map(([cat, items]) => {
      const lines = items
        .filter((i) => !i.checked)
        .map((i) => `  □ ${i.name}${itemLabel(i) ? ' — ' + itemLabel(i) : ''}`)
        .join('\n')
      return lines ? `${CATEGORY_EMOJI[cat] ?? '📦'} ${cat.toUpperCase()}\n${lines}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
  return header + body
}

// ─── shopping row ──────────────────────────────────────────────────────────────

function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingListItem
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <div className={cn('flex items-center gap-3 py-2.5 border-b border-rasa-stone/50 last:border-0', item.checked && 'opacity-50')}>
      <Checkbox checked={item.checked} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm font-display font-semibold text-rasa-ink', item.checked && 'line-through text-muted-foreground')}>
          {item.name}
        </span>
        {itemLabel(item) && (
          <span className="text-xs font-code text-muted-foreground ml-2">{itemLabel(item)}</span>
        )}
        {item.quantity_have !== null && !item.checked && (
          <span className="text-[10px] font-code text-rasa-fern ml-2">
            have {item.quantity_have}{item.unit ? ' ' + item.unit : ''}
          </span>
        )}
      </div>
      <button
        className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── main page ─────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const [isPending, startTransition] = useTransition()
  const [grouped, setGrouped] = useState<GroupedItems>({})
  const [weekStart, setWeekStart] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [addingIn, setAddingIn] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')

  useEffect(() => {
    createClient()
      .from('shopping_lists')
      .select('*, week_plans(week_start_date)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setGrouped((data.items as GroupedItems) ?? {})
          const wp = data.week_plans as { week_start_date: string } | null
          if (wp?.week_start_date) {
            setWeekStart(
              new Date(wp.week_start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            )
          }
        }
        setLoading(false)
      })
  }, [])

  async function handleGenerate() {
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/shopping/generate', { method: 'POST' })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to generate'); return }
        const sl = data.shopping_list
        setGrouped((sl.items as GroupedItems) ?? {})
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  function toggleItem(cat: string, index: number) {
    setGrouped((prev) => {
      const updated = { ...prev }
      updated[cat] = updated[cat].map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
      return updated
    })
  }

  function removeItem(cat: string, index: number) {
    setGrouped((prev) => {
      const updated = { ...prev }
      updated[cat] = updated[cat].filter((_, i) => i !== index)
      if (updated[cat].length === 0) delete updated[cat]
      return { ...updated }
    })
  }

  function addItem(cat: string) {
    if (!newItemName.trim()) return
    setGrouped((prev) => ({
      ...prev,
      [cat]: [
        ...(prev[cat] ?? []),
        { name: newItemName.trim(), quantity_needed: null, quantity_have: null, unit: null, category: cat, checked: false, manually_added: true },
      ],
    }))
    setNewItemName('')
    setAddingIn(null)
  }

  async function handleCopy() {
    const text = formatForClipboard(grouped, weekStart)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalItems = Object.values(grouped).flat().length
  const uncheckedItems = Object.values(grouped).flat().filter((i) => !i.checked).length

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-rasa-slate" />
          <h1 className="font-serif text-2xl font-bold text-rasa-ink">Shopping List</h1>
        </div>
        <div className="flex gap-2">
          {totalItems > 0 && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm font-display font-semibold text-rasa-slate border border-rasa-stone rounded-xl px-3 py-2 hover:bg-rasa-mist transition"
            >
              {copied ? <Check className="w-4 h-4 text-rasa-fern" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm font-display font-semibold bg-rasa-slate text-white rounded-xl px-3 py-2 hover:bg-rasa-slate/90 transition disabled:opacity-60"
          >
            {isPending ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
            ) : (
              <><RefreshCw className="w-4 h-4" />{totalItems > 0 ? 'Regenerate' : 'Generate List'}</>
            )}
          </button>
        </div>
      </div>

      {/* ── Plan connection banner ─────────────────────────────────── */}
      {weekStart && (
        <div className="flex items-center gap-2 rounded-xl bg-rasa-sprout border border-rasa-fern/30 px-3 py-2 mb-5">
          <CalendarDays className="w-4 h-4 text-rasa-fern shrink-0" />
          <p className="text-xs font-display font-semibold text-rasa-fern">
            Built from week plan · {weekStart}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Progress bar ────────────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs font-display text-muted-foreground mb-1.5">
            <span>{totalItems - uncheckedItems} of {totalItems} ticked off</span>
            <span className="font-semibold text-rasa-slate">{uncheckedItems} remaining</span>
          </div>
          <div className="h-1.5 bg-rasa-stone rounded-full overflow-hidden">
            <div
              className="h-full bg-rasa-fern rounded-full transition-all"
              style={{ width: `${totalItems ? ((totalItems - uncheckedItems) / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-rasa-stone rounded w-48" />
          <div className="h-2 bg-rasa-stone rounded-full" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 bg-rasa-stone rounded w-24" />
              <div className="h-10 bg-rasa-stone rounded-xl" />
              <div className="h-10 bg-rasa-stone rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loading && totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rasa-mist flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-xl font-bold text-rasa-ink">No shopping list yet</h2>
          <p className="font-display text-sm text-muted-foreground max-w-xs">
            Generate a week plan first, then hit Generate to build your shopping list.
          </p>
        </div>
      )}

      {/* ── Grouped list ────────────────────────────────────────────── */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-5">
          {/* Category header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">{CATEGORY_EMOJI[cat] ?? '📦'}</span>
            <span className="text-sm font-display font-bold text-rasa-ink">{cat}</span>
            <span className="text-xs font-code text-muted-foreground ml-1">
              ({items.filter((i) => !i.checked).length} left)
            </span>
          </div>

          {/* Items card */}
          <div className="rounded-2xl border border-rasa-stone bg-rasa-oat px-3 overflow-hidden">
            {items.map((item, idx) => (
              <ShoppingRow
                key={idx}
                item={item}
                onToggle={() => toggleItem(cat, idx)}
                onRemove={() => removeItem(cat, idx)}
              />
            ))}
          </div>

          {/* Add item inline */}
          {addingIn === cat ? (
            <div className="flex gap-2 mt-2">
              <Input
                autoFocus
                className="h-9 text-sm border-rasa-stone bg-rasa-oat font-display"
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem(cat)
                  if (e.key === 'Escape') { setAddingIn(null); setNewItemName('') }
                }}
              />
              <button
                onClick={() => addItem(cat)}
                className="text-sm font-display font-semibold bg-rasa-slate text-white rounded-xl px-3 py-1.5"
              >
                Add
              </button>
              <button
                onClick={() => { setAddingIn(null); setNewItemName('') }}
                className="text-sm font-display text-muted-foreground hover:text-rasa-ink px-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="mt-2 flex items-center gap-1 text-xs font-display font-semibold text-muted-foreground hover:text-rasa-slate transition-colors"
              onClick={() => setAddingIn(cat)}
            >
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          )}
        </div>
      ))}
    </main>
  )
}
