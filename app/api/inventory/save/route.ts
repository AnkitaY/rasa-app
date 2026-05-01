import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ParsedInventoryItem } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: ParsedInventoryItem[] }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const anon = createClient()
    const { data: { user } } = await anon.auth.getUser()

    // Fetch existing inventory to support smart merge
    const existingQuery = admin.from('inventory_items').select('id, name')
    const { data: existing } = await (
      user?.id
        ? existingQuery.or(`user_id.eq.${user.id},user_id.is.null`)
        : existingQuery.is('user_id', null)
    )

    const existingMap: Record<string, string> = {}
    for (const row of existing ?? []) {
      existingMap[row.name.toLowerCase().trim()] = row.id
    }

    const toUpdate: Array<{ id: string; quantity: number | null; unit: string | null; use_soon: boolean; low_stock: boolean; location: string; updated_at: string }> = []
    const toInsert: Array<{ user_id: string | null; name: string; quantity: number | null; unit: string | null; location: string; use_soon: boolean; low_stock: boolean }> = []

    for (const item of items) {
      const key = item.name.toLowerCase().trim()
      const existingId = existingMap[key]

      if (existingId) {
        toUpdate.push({
          id: existingId,
          quantity: item.quantity,
          unit: item.unit,
          use_soon: item.use_soon,
          low_stock: item.low_stock,
          location: item.location,
          updated_at: new Date().toISOString(),
        })
      } else {
        toInsert.push({
          user_id: user?.id ?? null,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          use_soon: item.use_soon,
          low_stock: item.low_stock,
        })
      }
    }

    const errors: string[] = []

    if (toUpdate.length > 0) {
      for (const row of toUpdate) {
        const { id, ...fields } = row
        const { error } = await admin.from('inventory_items').update(fields).eq('id', id)
        if (error) errors.push(error.message)
      }
    }

    if (toInsert.length > 0) {
      const { error } = await admin.from('inventory_items').insert(toInsert)
      if (error) errors.push(error.message)
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
    }

    return NextResponse.json({ saved: toUpdate.length + toInsert.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('inventory_items').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...fields } = await request.json() as { id: string; [key: string]: unknown }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('inventory_items')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
