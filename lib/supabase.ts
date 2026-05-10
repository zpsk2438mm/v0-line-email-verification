import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[v0] Missing Supabase environment variables:')
  console.error('[v0] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'NOT SET')
  console.error('[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'NOT SET')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,      // 啟動持久化快取，把登入狀態存在瀏覽器
      autoRefreshToken: true,    // 當 Token 過期時自動幫你刷新
      detectSessionInUrl: true,  // 自動偵測網址中的登入回傳資訊
      storageKey: 'stust-market-auth-token', // 設定存放在本地的名稱
    },
  }
)
