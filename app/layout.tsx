import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { LiffProvider } from '@/components/liff-provider'
import Script from 'next/script' 
import './globals.css'

export const metadata: Metadata = {
  title: '南台二手物平台',
  description: '南台科技大學二手物品交易平台',
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
    <html lang="zh-TW" className="light">
      <head>
        <Script 
          src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
          strategy="beforeInteractive" 
        />
      </head>
      {/* 1. bg-[#F9F8F6] 確保全站背景色 
        2. text-[#404040] 確保文字顏色符合你 css 的設定 
        3. min-h-screen 確保背景色撐滿整個螢幕
      */}
      <body className="font-sans antialiased bg-[#F9F8F6] text-[#404040] min-h-screen">
        <LiffProvider>
          {children}
        </LiffProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
