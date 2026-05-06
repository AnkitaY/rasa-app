'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Link as LinkIcon } from 'lucide-react'

export default function ImportRecipePage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Hmm, something went wrong. Give it one more try?")
        return
      }
      // Navigate to the saved recipe
      router.push(`/recipes/${data.recipe.id}`)
    } catch {
      setError("Hmm, something went wrong. Give it one more try?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-p1-cream">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-p1-brown active:opacity-60"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-ui font-bold text-p1-dark">Import from URL</h1>
      </div>

      <div className="px-5 space-y-5">
        <p className="text-sm font-ui text-p1-brown">
          Paste a link to any recipe page and we&apos;ll pull it in — ingredients, steps, and all.
        </p>

        {/* URL input */}
        <div className="space-y-2">
          <label className="text-xs font-ui font-semibold text-p1-brown uppercase tracking-wider">
            Recipe URL
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-p1-brown/40 pointer-events-none" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleImport() }}
              placeholder="https://..."
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-p1-border bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 focus:outline-none focus:border-p1-terra transition-colors"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
            <p className="text-sm font-ui text-p1-brown">{error}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleImport}
          disabled={!url.trim() || loading}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80"
        >
          {loading ? 'Reading recipe…' : 'Import recipe →'}
        </button>

        {loading && (
          <p className="text-center text-xs text-p1-brown/60 font-ui">
            Takes about 15 seconds — we&apos;re reading and structuring the full recipe.
          </p>
        )}

        {/* Tips */}
        <div className="rounded-2xl bg-p1-card border border-p1-border-lt px-4 py-4 space-y-2">
          <p className="text-xs font-ui font-bold text-p1-brown uppercase tracking-wider">
            Works best with
          </p>
          <ul className="space-y-1.5 text-sm font-ui text-p1-brown">
            <li>· BBC Good Food, Serious Eats, NYT Cooking</li>
            <li>· Food blogs with a clear ingredients list</li>
            <li>· Any page where the recipe text is visible</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
