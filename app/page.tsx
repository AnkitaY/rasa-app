import Link from 'next/link'
import { ChefHat, CalendarDays } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Rasa App</h1>
      <p className="text-muted-foreground">AI-powered meal planning for your household.</p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/recipes"
          className="flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          <ChefHat className="w-4 h-4" />
          Recipe Bank
        </Link>
        <Link
          href="/planner"
          className="flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          Weekly Planner
        </Link>
      </div>
    </main>
  )
}
