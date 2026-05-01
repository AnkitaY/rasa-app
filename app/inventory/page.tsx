'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { InventoryItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
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

// ─── helpers ──────────────────────────────────────────────────────────────────

const LOCATION_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  fridge: { label: 'Fridge', Icon: Thermometer, color: 'text-blue-500' },
  freezer: { label: 'Freezer', Icon: Snowflake, color: 'text-cyan-500' },
  pantry: { label: 'Pantry', Icon: ShoppingBag, color: 'text-amber-500' },
}

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

  const { Icon, color } = LOCATION_META[item.location] ?? LOCATION_META.fridge

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button revealed on swipe */}
      <button
        className="absolute right-0 top-0 bottom-0 w-16 bg-red-500 text-white flex items-center justify-center"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Item content */}
      <div
        className={cn(
          'relative bg-card border rounded-lg px-3 py-2.5 flex items-center gap-3 transition-transform',
          swiped && '-translate-x-16',
          item.low_stock && 'border-orange-200'
        )}
      >
        <Icon className={cn('w-4 h-4 shrink-0', color)} />

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editing === 'name' ? (
            <Input
              autoFocus
              className="h-7 text-sm py-0"
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              onBlur={() => commitField('name')}
              onKeyDown={(e) => e.key === 'Enter' && commitField('name')}
            />
          ) : (
            <button
              className="text-sm font-medium text-left truncate w-full hover:text-primary"
              onClick={() => setEditing('name')}
            >
              {item.name}
            </button>
          )}
          {item.low_stock && (
            <span className="text-[10px] text-orange-500 font-medium">Low stock</span>
          )}
        </div>

        {/* Quantity + Unit */}
        <div className="flex items-center gap-1 shrink-0">
          {editing === 'quantity' ? (
            <Input
              autoFocus
              type="number"
              className="h-7 w-16 text-sm py-0 text-right"
              value={draft.quantity}
              onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
              onBlur={() => commitField('quantity')}
              onKeyDown={(e) => e.key === 'Enter' && commitField('quantity')}
            />
          ) : (
            <button
              className="text-sm text-muted-foreground hover:text-foreground min-w-[2rem] text-right"
              onClick={() => setEditing('quantity')}
            >
              {item.quantity ?? '—'}
            </button>
          )}

          {editing === 'unit' ? (
            <Input
              autoFocus
              className="h-7 w-14 text-sm py-0"
              value={draft.unit}
              onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
              onBlur={() => commitField('unit')}
              onKeyDown={(e) => e.key === 'Enter' && commitField('unit')}
            />
          ) : (
            <button
              className="text-xs text-muted-foreground hover:text-foreground w-10 text-left"
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

// ─── section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  iconColor,
  items,
  onDelete,
  onUpdate,
}: {
  title: string
  icon: React.ReactNode
  iconColor: string
  items: InventoryItem[]
  onDelete: (id: string) => void
  onUpdate: (id: string, fields: Partial<InventoryItem>) => void
}) {
  if (items.length === 0) return null
  return (
    <div>
      <div className={cn('flex items-center gap-2 mb-2', iconColor)}>
        {icon}
        <span className="text-sm font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <InventoryRow key={item.id} item={item} onDelete={onDelete} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('inventory_items')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setItems((data as InventoryItem[]) ?? [])
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

  const useSoon = items.filter((i) => i.use_soon)
  const fridge = items.filter((i) => !i.use_soon && i.location === 'fridge')
  const freezer = items.filter((i) => !i.use_soon && i.location === 'freezer')
  const pantry = items.filter((i) => !i.use_soon && i.location === 'pantry')

  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Inventory</h1>
        </div>
        <Button onClick={() => router.push('/inventory/update')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Update Inventory
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <Package className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No items yet</h2>
          <p className="text-muted-foreground">Tell us what&apos;s in your fridge and pantry.</p>
          <Button onClick={() => router.push('/inventory/update')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Inventory
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Use Soon */}
          {useSoon.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-yellow-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Use Soon</span>
                <span className="text-xs text-muted-foreground">({useSoon.length})</span>
              </div>
              <div className="space-y-1.5">
                {useSoon.map((item) => (
                  <div key={item.id} className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 rounded-l-lg" />
                    <div className="pl-3">
                      <InventoryRow item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Section
            title="Fridge"
            icon={<Thermometer className="w-4 h-4" />}
            iconColor="text-blue-500"
            items={fridge}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
          <Section
            title="Freezer"
            icon={<Snowflake className="w-4 h-4" />}
            iconColor="text-cyan-500"
            items={freezer}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
          <Section
            title="Pantry"
            icon={<ShoppingBag className="w-4 h-4" />}
            iconColor="text-amber-500"
            items={pantry}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />

          <p className="text-xs text-muted-foreground text-center pt-2">
            Tap any value to edit inline · Swipe left or hover to delete
          </p>
        </div>
      )}
    </main>
  )
}
