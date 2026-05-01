'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingListItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  ShoppingCart,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Plus,
  AlertCircle,
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
    <div className={cn('flex items-center gap-3 py-2', item.checked && 'opacity-50')}>
      <Checkbox checked={item.checked} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', item.checked && 'line-through text-muted-foreground')}>
          {item.name}
        </span>
        {itemLabel(item) && (
          <span className="text-xs text-muted-foreground ml-2">{itemLabel(item)}</span>
        )}
        {item.quantity_have !== null && !item.checked && (
          <span className="text-[10px] text-blue-500 ml-2">
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

  // Load latest shopping list on mount
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Shopping List</h1>
            {weekStart && (
              <p className="text-xs text-muted-foreground">Week of {weekStart}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {totalItems > 0 && (
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy list'}
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Generating…</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />{totalItems > 0 ? 'Regenerate' : 'Generate List'}</>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{totalItems - uncheckedItems} of {totalItems} items ticked off</span>
            <span>{uncheckedItems} remaining</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${totalItems ? ((totalItems - uncheckedItems) / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <ShoppingCart className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No shopping list yet</h2>
          <p className="text-muted-foreground max-w-xs">
            Generate a week plan first, then hit Generate to build your shopping list.
          </p>
        </div>
      )}

      {/* Grouped list */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">{CATEGORY_EMOJI[cat] ?? '📦'}</span>
            <span className="text-sm font-semibold">{cat}</span>
            <span className="text-xs text-muted-foreground">({items.filter((i) => !i.checked).length} left)</span>
          </div>
          <Separator className="mb-2" />

          <div className="space-y-0.5">
            {items.map((item, idx) => (
              <ShoppingRow
                key={idx}
                item={item}
                onToggle={() => toggleItem(cat, idx)}
                onRemove={() => removeItem(cat, idx)}
              />
            ))}
          </div>

          {/* Add item to category */}
          {addingIn === cat ? (
            <div className="flex gap-2 mt-2">
              <Input
                autoFocus
                className="h-8 text-sm"
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem(cat)
                  if (e.key === 'Escape') { setAddingIn(null); setNewItemName('') }
                }}
              />
              <Button size="sm" onClick={() => addItem(cat)}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingIn(null); setNewItemName('') }}>✕</Button>
            </div>
          ) : (
            <button
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
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
