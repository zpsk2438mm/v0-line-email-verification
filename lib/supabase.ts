import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // 關鍵修正：在 LIFF 這種 SPA 環境中，關閉自動偵測 URL 變更跳轉，避免它擅自把網址導向不存在的 /login
    detectSessionInUrl: false, 
    storageKey: 'stust-market-auth-v6',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce', // 改回 Next.js 推薦的 pkce，配合不跳轉的 OTP 最穩定
  },
})
