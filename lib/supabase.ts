import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,               // ✨ 記住登入狀態
    autoRefreshToken: true,             // 自動刷新 Token
    detectSessionInUrl: true,           // 從信箱連結回來時自動偵測
    storageKey: 'stust-market-auth-v3', // 儲存名稱
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
