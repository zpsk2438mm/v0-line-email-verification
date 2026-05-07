import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { LiffProvider } from '@/components/liff-provider'
import Script from 'next/script' 
import './globals.css'

export const metadata: Metadata = {
  title: '南臺二手交易平臺',
  description: '南臺科技大學專屬二手交易平台',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW">
      <head>
        <Script 
          src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className="antialiased bg-[#F9F8F6]">
        <LiffProvider>
          {children}
        </LiffProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
