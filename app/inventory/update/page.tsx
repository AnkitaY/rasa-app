'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ParsedInventoryItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Thermometer,
  Snowflake,
  ShoppingBag,
} from 'lucide-react'

type Stage = 'input' | 'review' | 'saved'

const LOCATION_ICONS: Record<string, React.ElementType> = {
  fridge: Thermometer,
  freezer: Snowflake,
  pantry: ShoppingBag,
}
const LOCATION_COLORS: Record<string, string> = {
  fridge: 'text-blue-500',
  freezer: 'text-cyan-500',
  pantry: 'text-amber-500',
}

function ReviewRow({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: ParsedInventoryItem
  index: number
  onChange: (i: number, patch: Partial<ParsedInventoryItem>) => void
  onRemove: (i: number) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const Icon = LOCATION_ICONS[item.location] ?? Thermometer
  const iconColor = LOCATION_COLORS[item.location] ?? 'text-blue-500'

  return (
    <div className={cn('flex items-start gap-3 py-2.5 border-b last:border-0', !item.checked && 'opacity-40')}>
      <Checkbox
        checked={item.checked}
        onCheckedChange={(v) => onChange(index, { checked: Boolean(v) })}
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Name */}
          {editingName ? (
            <Input
              autoFocus
              className="h-7 text-sm py-0 w-40"
              value={item.name}
              onChange={(e) => onChange(index, { name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            />
          ) : (
            <button className="text-sm font-medium hover:text-primary text-left" onClick={() => setEditingName(true)}>
              {item.name}
            </button>
          )}

          {/* Qty + Unit */}
          <div className="flex items-center gap-1">
            <Input
              type="number"
              className="h-6 w-14 text-xs py-0 text-right"
              value={item.quantity ?? ''}
              placeholder="qty"
              onChange={(e) => onChange(index, { quantity: e.target.value ? parseFloat(e.target.value) : null })}
            />
            <Input
              className="h-6 w-12 text-xs py-0"
              value={item.unit ?? ''}
              placeholder="unit"
              onChange={(e) => onChange(index, { unit: e.target.value || null })}
            />
          </div>

          {/* Location selector */}
          <select
            className="h-6 text-xs border rounded px-1 bg-background"
            value={item.location}
            onChange={(e) => onChange(index, { location: e.target.value as ParsedInventoryItem['location'] })}
          >
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
            <option value="pantry">Pantry</option>
          </select>

          <Icon className={cn('w-3.5 h-3.5 shrink-0', iconColor)} />
        </div>

        {/* Flags */}
        <div className="flex items-center gap-3">
          {item.use_soon && (
            <span className="flex items-center gap-1 text-[10px] text-yellow-600 font-medium">
              <AlertTriangle className="w-3 h-3" /> Use soon
            </span>
          )}
          {item.quantity === null && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <AlertCircle className="w-3 h-3" /> Vague quantity
            </span>
          )}
          {item.low_stock && (
            <span className="flex items-center gap-1 text-[10px] text-orange-500 font-medium">
              Low stock
            </span>
          )}
        </div>
      </div>

      <button
        className="text-muted-foreground hover:text-red-500 text-xs mt-0.5"
        onClick={() => onRemove(index)}
      >
        ✕
      </button>
    </div>
  )
}

export default function UpdateInventoryPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [stage, setStage] = useState<Stage>('input')
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedInventoryItem[]>([])
  const [error, setError] = useState('')
  const [savedCount, setSavedCount] = useState(0)

  function handleChange(index: number, patch: Partial<ParsedInventoryItem>) {
    setParsed((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }
  function handleRemove(index: number) {
    setParsed((prev) => prev.filter((_, i) => i !== index))
  }
  function addBlankItem() {
    setParsed((prev) => [
      ...prev,
      { name: '', quantity: null, unit: null, location: 'fridge', use_soon: false, low_stock: false, checked: true },
    ])
  }

  function handleParse() {
    if (!text.trim()) { setError('Please enter some text first.'); return }
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/inventory/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Parse failed'); return }
        setParsed(data.items as ParsedInventoryItem[])
        setStage('review')
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  function handleSaveAll() {
    const toSave = parsed.filter((i) => i.checked && i.name.trim())
    if (toSave.length === 0) { setError('No items selected.'); return }
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/inventory/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: toSave }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Save failed'); return }
        setSavedCount(data.saved)
        setStage('saved')
      } catch {
        setError('Network error. Please try again.')
      }
    })
  }

  // ── Saved ──────────────────────────────────────────────────────────────────
  if (stage === 'saved') {
    return (
      <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto flex flex-col items-center justify-center gap-6">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-bold">Inventory updated</h2>
        <p className="text-muted-foreground">{savedCount} item{savedCount !== 1 ? 's' : ''} saved.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setText(''); setParsed([]); setStage('input') }}>
            Add More
          </Button>
          <Button onClick={() => router.push('/inventory')}>View Inventory</Button>
        </div>
      </main>
    )
  }

  // ── Review ─────────────────────────────────────────────────────────────────
  if (stage === 'review') {
    const checkedCount = parsed.filter((i) => i.checked).length
    return (
      <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          onClick={() => setStage('input')}
        >
          <ArrowLeft className="w-4 h-4" /> Back to input
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Review & Confirm</CardTitle>
            <CardDescription>
              {checkedCount} of {parsed.length} items selected · Uncheck to skip · Tap to edit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {parsed.map((item, i) => (
                <ReviewRow key={i} item={item} index={i} onChange={handleChange} onRemove={handleRemove} />
              ))}
            </div>

            <button
              className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={addBlankItem}
            >
              <Plus className="w-4 h-4" /> Add missed item
            </button>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button className="w-full mt-4" onClick={handleSaveAll} disabled={isPending || checkedCount === 0}>
          {isPending ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving…</>
          ) : (
            `Save All (${checkedCount} item${checkedCount !== 1 ? 's' : ''})`
          )}
        </Button>
      </main>
    )
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        onClick={() => router.push('/inventory')}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Inventory
      </button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>Update Inventory</CardTitle>
          </div>
          <CardDescription>
            Describe what you have in plain English or Hinglish. Claude will parse it into structured items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What do you have?</Label>
            <Textarea
              rows={6}
              placeholder="e.g. half a block of paneer, 6 eggs, leftover dal from yesterday, chicken in freezer, almost out of onions, kuch chole hai pantry mein, 200g yogurt"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button className="w-full" onClick={handleParse} disabled={isPending || !text.trim()}>
            {isPending ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Parsing…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Parse & Review</>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
