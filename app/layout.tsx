import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { LiffProvider } from '@/components/liff-provider'
// 1. 引入 Next.js 的 Script 組件
import Script from 'next/script' 
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
      <head>
        {/* 2. 這是最重要的一行：在所有程式碼執行前載入 LINE SDK */}
        <Script 
          src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className="font-sans antialiased">
        <LiffProvider>
          {children}
        </LiffProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
