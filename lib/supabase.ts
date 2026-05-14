import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,               // 自動儲存登入狀態
    autoRefreshToken: true,             // 自動更新過期憑證
    detectSessionInUrl: true,
    storageKey: 'stust-market-auth-v6',  // 使用新 Key 清除舊快取
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'implicit',               // 對 LINE 瀏覽器最友善的模式
  },
})
