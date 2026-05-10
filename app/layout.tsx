import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Playfair_Display, Nunito, DM_Mono, DM_Sans } from 'next/font/google'
import './globals.css'
import BottomNav from './components/BottomNav'
import OnboardingGuard from './components/OnboardingGuard'
import AppShell from './components/AppShell'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['300', '400', '500'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Rasa',
  description: 'AI-powered meal planning for your household',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${nunito.variable} ${dmMono.variable} ${dmSans.variable} antialiased font-display`}
      >
        <OnboardingGuard>
          {/* AppShell adds pb-20 clearance for the bottom nav, and steps aside on /ops. */}
          <AppShell>
            {children}
          </AppShell>
          <BottomNav />
        </OnboardingGuard>
      </body>
    </html>
  )
}
