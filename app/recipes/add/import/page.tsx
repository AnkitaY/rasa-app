'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

const STALL_DELAY_MS = 15_000
const TIMEOUT_MS = 30_000

export default function ImportRecipePage() {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [stalling, setStalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimers() {
    if (stallTimer.current) clearTimeout(stallTimer.current)
    stallTimer.current = null
    setStalling(false)
  }

  useEffect(() => {
    return () => {
      if (stallTimer.current) clearTimeout(stallTimer.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      abortRef.current?.abort()
    }
  }, [])

  async function handleParse() {
    const text = rawText.trim()
    if (!text || loading) return

    setError(null)
    setErrorCode(null)
    setLoading(true)
    setStalling(false)

    stallTimer.current = setTimeout(() => setStalling(true), STALL_DELAY_MS)

    const abort = new AbortController()
    abortRef.current = abort
    timeoutRef.current = setTimeout(() => abort.abort(), TIMEOUT_MS)

    try {
      const res = await fetch('/api/recipes/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
        signal: abort.signal,
      })

      clearTimeout(timeoutRef.current!)
      const data = await res.json() as
        | { parsed: Record<string, unknown> }
        | { error: string; code: string }

      if (!res.ok || 'error' in data) {
        const errData = data as { error: string; code: string }
        setError(errData.error)
        setErrorCode(errData.code)
        return
      }

      const { parsed } = data as { parsed: Record<string, unknown> }
      try {
        sessionStorage.setItem('import_draft', JSON.stringify({ parsed, rawText: text }))
      } catch {
        // sessionStorage unavailable (private browsing / full) — proceed anyway, review page handles missing state
      }
      router.push('/recipes/import/review')
    } catch (err) {
      clearTimeout(timeoutRef.current!)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('This is taking longer than expected. Want to try again?')
        setErrorCode('PARSE_FAILED')
      } else {
        setError('Something went wrong. Give it one more try?')
        setErrorCode('NETWORK_ERROR')
      }
    } finally {
      clearTimers()
      setLoading(false)
    }
  }

  const ctaText = loading
    ? stalling ? 'Still reading — almost done.' : 'Reading your recipe…'
    : 'Read this recipe'

  const isRetryable = errorCode === 'PARSE_FAILED' || errorCode === 'NETWORK_ERROR'

  return (
    <main className="min-h-screen bg-p1-cream flex flex-col">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-p1-brown active:opacity-60 min-w-[44px] min-h-[44px] flex items-center"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-ui font-bold text-p1-dark leading-tight">
          Drop in the recipe exactly as you got it.
        </h1>
      </div>

      <div className="flex-1 px-5 flex flex-col gap-4">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={loading}
          placeholder="Paste anything here — Instagram caption, YouTube description, WhatsApp message. Ingredients and steps all jumbled together is fine. Rasa will sort it out."
          className="w-full flex-1 min-h-[200px] resize-none rounded-2xl border border-p1-border bg-p1-card text-sm font-ui text-p1-dark placeholder:text-p1-brown/40 px-4 py-4 focus:outline-none focus:border-p1-terra transition-colors disabled:opacity-50"
          style={{ height: 'calc(100dvh - 280px)' }}
        />

        {error && (
          <div role="alert" className="px-4 py-3 rounded-2xl bg-p1-card border border-p1-border-lt">
            <p className="text-sm font-ui text-p1-brown">{error}</p>
            {isRetryable && (
              <button
                onClick={handleParse}
                className="mt-2 text-sm font-ui font-semibold text-p1-terra active:opacity-60 min-h-[44px] flex items-center"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4">
        <button
          onClick={handleParse}
          disabled={!rawText.trim() || loading}
          className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80 min-h-[44px]"
        >
          {ctaText}
        </button>
      </div>
    </main>
  )
}
