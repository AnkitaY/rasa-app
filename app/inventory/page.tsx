'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InventoryItem } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Package,
  Trash2,
  Plus,
  AlertTriangle,
  Thermometer,
  Snowflake,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

type TabKey = 'use-soon' | 'fridge' | 'freezer' | 'pantry'

const TABS: { key: TabKey; label: string; Icon: React.ElementType; color: string; activeClass: string }[] = [
  { key: 'use-soon', label: 'Use Soon', Icon: AlertTriangle, color: 'text-rasa-terra', activeClass: 'bg-rasa-terra text-white border-rasa-terra' },
  { key: 'fridge',   label: 'Fridge',   Icon: Thermometer,   color: 'text-blue-500',   activeClass: 'bg-blue-500 text-white border-blue-500' },
  { key: 'freezer',  label: 'Freezer',  Icon: Snowflake,     color: 'text-cyan-500',   activeClass: 'bg-cyan-500 text-white border-cyan-500' },
  { key: 'pantry',   label: 'Pantry',   Icon: ShoppingBag,   color: 'text-amber-500',  activeClass: 'bg-amber-500 text-white border-amber-500' },
]

// ─── swipe-to-delete row ───────────────────────────────────────────────────────

function InventoryRow({
  item,
  onDelete,
  onUpdate,
}: {
  item: InventoryItem
  onDelete: (id: string) => void
  onUpdate: (id: string, fields: Partial<InventoryItem>) => void
}) {
  const [swiped, setSwiped] = useState(false)
  const [editing, setEditing] = useState<'quantity' | 'unit' | 'name' | null>(null)
  const [draft, setDraft] = useState({ name: item.name, quantity: String(item.quantity ?? ''), unit: item.unit ?? '' })
  const startX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = startX.current - e.changedTouches[0].clientX
    if (delta > 60) setSwiped(true)
    else if (delta < -20) setSwiped(false)
  }

  function commitField(field: 'name' | 'quantity' | 'unit') {
    const updates: Partial<InventoryItem> = {}
    if (field === 'quantity') updates.quantity = draft.quantity ? parseFloat(draft.quantity) : null
    if (field === 'unit') updates.unit = draft.unit || null
    if (field === 'name') updates.name = draft.name || item.name
    onUpdate(item.id, updates)
    setEditing(null)
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button revealed on swipe */}
      <button
        className="absolute right-0 top-0 bottom-0 w-16 bg-red-500 text-white flex items-center justify-center rounded-r-xl"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Item content */}
      <div
        className={cn(
          'relative bg-rasa-oat border border-rasa-stone rounded-xl px-3 py-2.5 flex items-center gap-3 transition-transform',
          swiped && '-translate-x-16',
          item.low_stock && 'border-rasa-terra/40',
          item.use_soon && 'border-l-2 border-l-rasa-terra'
        )}
      >
        {/* Expiry indicator dot */}
        {item.use_soon && (
          <span className="shrink-0 w-2 h-2 rounded-full bg-rasa-terra" title="Use soon" />
        )}
        {item.low_stock && !item.use_soon && (
          <span className="shrink-0 w-2 h-2 rounded-full bg-yellow-400" title="Low stock" />
        )}
        {!item.use_soon && !item.low_stock && (
          <span className="shrink-0 w-2 h-2 rounded-full bg-rasa-fern/40" />
        )}

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editing === 'name' ? (
            <Input
              autoFocus
              className="h-7 text-sm py-0 border-rasa-stone"
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              onBlur={() => commitField('name')}
              onKeyDown={(e) => e.key === 'Enter' && commitField('name')}
            />
          ) : (
            <button
              className="text-sm font-display font-semibold text-rasa-ink text-left truncate w-full hover:text-rasa-slate"
              onClick={() => setEditing('name')}
            >
              {item.name}
            </button>
          )}
          {item.low_stock && (
            <span className="text-[10px] font-display text-rasa-terra font-semibold">Low stock</span>
          )}
          {item.use_soon && !item.low_stock && (
            <span className="text-[10px] font-display text-rasa-terra font-semibold">Use soon</span>
          )}
        </div>

        {/* Quantity + Unit */}
        <div className="flex items-center gap-1 shrink-0">
          {editing === 'quantity' ? (
            <Input
              autoFocus
              type="number"
              className="h-7 w-16 text-sm py-0 text-right border-rasa-stone"
              value={draft.quantity}
              onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
              onBlur={() => commitField('quantity')}
              onKeyDown={(e) => e.key === 'Enter' && commitField('quantity')}
            />
          ) : (
            <button
              className="text-sm font-code text-muted-foreground hover:text-rasa-ink min-w-[2rem] text-right"
              onClick={() => setEditing('quantity')}
            >
              {item.quantity ?? '—'}
            </button>
          )}

          {editing === 'unit' ? (
            <Input
              autoFocus
              className="h-7 w-14 text-sm py-0 border-rasa-stone"
              value={draft.unit}
              onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
              onBlur={() => commitField('unit')}
              onKeyDown={(e) => e.key === 'Enter' && commitField('unit')}
            />
          ) : (
            <button
              className="text-xs font-display text-muted-foreground hover:text-rasa-ink w-10 text-left"
              onClick={() => setEditing('unit')}
            >
              {item.unit ?? 'unit'}
            </button>
          )}
        </div>

        {/* Desktop delete */}
        <button
          className="hidden sm:flex shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('fridge')

  useEffect(() => {
    createClient()
      .from('inventory_items')
      .select('*')
      .order('name')
      .then(({ data }) => {
        const fetched = (data as InventoryItem[]) ?? []
        setItems(fetched)
        // Auto-select "Use Soon" tab if there are items needing attention
        if (fetched.some((i) => i.use_soon)) setActiveTab('use-soon')
        setLoading(false)
      })
  }, [])

  async function handleUpdate(id: string, fields: Partial<InventoryItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...fields } : i)))
    await fetch('/api/inventory/save', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await fetch('/api/inventory/save', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const grouped: Record<TabKey, InventoryItem[]> = {
    'use-soon': items.filter((i) => i.use_soon),
    fridge:     items.filter((i) => !i.use_soon && i.location === 'fridge'),
    freezer:    items.filter((i) => !i.use_soon && i.location === 'freezer'),
    pantry:     items.filter((i) => !i.use_soon && i.location === 'pantry'),
  }

  const activeItems = grouped[activeTab]

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-rasa-slate" />
          <h1 className="font-serif text-2xl font-bold text-rasa-ink">Inventory</h1>
        </div>
        <button
          onClick={() => router.push('/inventory/update')}
          className="flex items-center gap-1.5 text-sm font-display font-semibold text-rasa-slate border border-rasa-stone rounded-xl px-3 py-2 hover:bg-rasa-mist transition"
        >
          <RefreshCw className="w-4 h-4" />
          Update
        </button>
      </div>

      {/* ── Category tabs ───────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(({ key, label, Icon, activeClass }) => {
          const count = grouped[key].length
          const isActive = key === activeTab
          const hasAlert = key === 'use-soon' && count > 0
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-display font-semibold border transition-all shrink-0',
                isActive
                  ? activeClass
                  : hasAlert
                  ? 'bg-orange-50 text-rasa-terra border-rasa-terra/40 hover:bg-orange-100'
                  : 'bg-rasa-mist text-muted-foreground border-rasa-stone hover:border-rasa-slate/40'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-code rounded-full w-4 h-4 flex items-center justify-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-rasa-stone text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-rasa-stone rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (

        /* ── Empty state (no items at all) ─────────────────────────── */
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-rasa-mist flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-xl font-bold text-rasa-ink">No items yet</h2>
          <p className="font-display text-sm text-muted-foreground">Tell us what&apos;s in your fridge and pantry.</p>
          <button
            onClick={() => router.push('/inventory/update')}
            className="flex items-center gap-2 text-sm font-display font-semibold text-rasa-slate border border-rasa-slate rounded-xl px-4 py-2 hover:bg-rasa-mist transition"
          >
            <Plus className="w-4 h-4" />
            Add Inventory
          </button>
        </div>
      ) : activeItems.length === 0 ? (

        /* ── Empty tab state ────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rasa-mist flex items-center justify-center">
            {TABS.find((t) => t.key === activeTab) && (() => {
              const { Icon, color } = TABS.find((t) => t.key === activeTab)!
              return <Icon className={cn('w-6 h-6', color)} />
            })()}
          </div>
          <p className="font-display text-sm font-semibold text-muted-foreground">
            No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} items
          </p>
        </div>
      ) : (

        /* ── Item list for active tab ───────────────────────────────── */
        <div className="space-y-1.5">
          {activeItems.map((item) => (
            <InventoryRow key={item.id} item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
          <p className="text-xs font-display text-muted-foreground text-center pt-3">
            Tap any value to edit · Swipe left to delete
          </p>
        </div>
      )}
    </main>
  )
}
