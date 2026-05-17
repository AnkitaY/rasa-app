'use client'

import { useState, useEffect } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'

interface DuplicateNameSheetProps {
  open: boolean
  originalName: string
  suggestedName: string
  onSave: (confirmedName: string) => void
  onCancel: () => void
}

export default function DuplicateNameSheet({
  open,
  originalName,
  suggestedName,
  onSave,
  onCancel,
}: DuplicateNameSheetProps) {
  const [editedName, setEditedName] = useState(suggestedName)

  useEffect(() => {
    if (open) setEditedName(suggestedName)
  }, [open, suggestedName])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <DialogPrimitive.Popup
          className="fixed bottom-0 left-0 right-0 z-50 bg-p1-cream rounded-t-3xl px-5 pt-5 max-h-[70dvh] overflow-y-auto shadow-[0_-4px_24px_rgba(0,0,0,0.12)] outline-none"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <div className="w-10 h-1 rounded-full bg-p1-border mx-auto mb-5" />
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 text-p1-brown active:opacity-60 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
          <DialogPrimitive.Title className="text-base font-ui font-bold text-p1-dark mb-1.5 pr-10">
            Already in your bank
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm font-ui text-p1-brown mb-5">
            You&apos;ve already saved &ldquo;{originalName}&rdquo;. Want to save it as a new version?
            Here&apos;s a name to start with — change it however you like.
          </DialogPrimitive.Description>
          <label htmlFor="duplicate-name-input" className="sr-only">
            New recipe name
          </label>
          <input
            id="duplicate-name-input"
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-p1-border bg-p1-card text-sm font-ui font-semibold text-p1-dark focus:outline-none focus:border-p1-terra transition-colors mb-4"
            autoFocus
          />
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onSave(editedName)}
              disabled={!editedName.trim()}
              className="w-full py-4 rounded-xl bg-p1-terra text-white text-sm font-ui font-semibold tracking-wide disabled:opacity-40 transition-opacity active:opacity-80 min-h-[44px]"
            >
              Save as New Version
            </button>
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl text-sm font-ui text-p1-brown active:opacity-60 min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
