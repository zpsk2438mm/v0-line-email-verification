import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { LiffProvider } from '@/components/liff-provider'
import './globals.css'

export const metadata: Metadata = {
  title: '南台二手物平台',
  description: '南台科技大學二手物品交易平台',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" className="bg-background">
      {/* 🎯 移除原本多餘且會與 npm 套件衝突的 <head> 和 <Script> 標籤 */}
      <body className="font-sans antialiased">
        <LiffProvider>
          {children}
        </LiffProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
