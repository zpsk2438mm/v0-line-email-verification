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
  supabaseAnonKey || ''
)
