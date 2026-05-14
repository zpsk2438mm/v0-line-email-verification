import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 升級到 v5，確保徹底擺脫之前失敗的登入紀錄
    storageKey: 'stust-market-auth-v5', 
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // 改回 implicit 模式，這對於手動輸入驗證碼或單純記住登入最友善
    flowType: 'implicit', 
  },
})
