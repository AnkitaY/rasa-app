export default function EmptyState({ message = 'Nothing here.' }: { message?: string }) {
  return (
    <div className="px-4 py-8 text-center text-[12px] text-[color:var(--ops-fg-soft)]">
      {message}
    </div>
  )
}
