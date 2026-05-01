import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import BottomNav from './components/BottomNav'

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* pb-16 clears the fixed bottom nav */}
        <div className="pb-16">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
