import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { LiffProvider } from '@/components/liff-provider'
import Script from 'next/script' 
import { Inter } from 'next/font/google' // 建議引入字體優化
import './globals.css'

// 設定字體，預防 layout shift
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
    <html lang="zh-TW" className={`bg-background ${inter.variable}`}>
      <head>
        {/* 1. LINE SDK 採用 beforeInteractive 確保在 LiffProvider 執行前到位 */}
        <Script 
          src="https://static.line-scdn.net/liff/edge/2/sdk.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className="font-sans antialiased min-h-screen">
        {/* 2. 確保 LiffProvider 包裹所有 children，並在內部處理初始化錯誤 */}
        <LiffProvider>
          {children}
        </LiffProvider>
        
        {/* 3. 僅在正式環境載入分析工具 */}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
