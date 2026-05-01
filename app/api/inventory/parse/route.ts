import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ParsedInventoryItem } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `Parse this text into structured ingredient list.
leftover/from yesterday/use soon → use_soon:true.
running low/almost out → low_stock:true.
freezer → location:freezer, default location is fridge.
pantry/shelf/dry → location:pantry.
Vague quantities (some, thoda, a little, kuch) → quantity:null.
Handles Hinglish naturally.
Return ONLY valid JSON: {items:[{name,quantity,unit,location,use_soon,low_stock}]}`

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text.trim() }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse inventory from AI response' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as { items: Partial<ParsedInventoryItem>[] }

    const items: ParsedInventoryItem[] = parsed.items.map((item) => ({
      name: item.name ?? 'Unknown',
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      location: (['fridge', 'freezer', 'pantry'].includes(item.location ?? '') ? item.location : 'fridge') as 'fridge' | 'freezer' | 'pantry',
      use_soon: item.use_soon ?? false,
      low_stock: item.low_stock ?? false,
      checked: true,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
