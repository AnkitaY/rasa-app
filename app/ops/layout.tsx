import { notFound } from 'next/navigation'
import { isLocalRequest } from '@/lib/ops/guard'
import { loadOverview } from '@/lib/ops/parsers'
import Sidebar from './components/Sidebar'
import './ops.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Rasa Ops',
  description: 'Internal agent dashboard',
}

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  if (!isLocalRequest()) notFound()

  // Pull lightweight stats so the sidebar can show badges without each page re-fetching
  const overview = await loadOverview()

  return (
    <div className="ops-root flex min-h-screen">
      <Sidebar stats={{
        needsFounder: overview.counts.needsFounder,
        openTasks: overview.counts.openTasks,
      }} />
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  )
}
