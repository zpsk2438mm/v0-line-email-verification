import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ✨ 核心：持久化登入狀態，確保不會重整後就不見
    persistSession: true,
    
    // ✨ 核心：自動刷新權杖，避免使用者操作到一半被踢出
    autoRefreshToken: true,
    
    // ✨ 關鍵：Resend 信箱點擊連結回來時，自動解析 URL 中的 access_token
    detectSessionInUrl: true,
    
    // 自定義儲存名稱，避免與其他專案衝突
    storageKey: 'stust-market-auth-v3',
    
    // 確保在客戶端環境（window）才啟用 localStorage
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    
    // 額外增加：鎖定流程，避免在非必要時觸發 Auth 狀態變更
    flowType: 'pkce', 
  },
})
