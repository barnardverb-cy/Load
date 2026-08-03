import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'
import { readPublicEnv } from './env'

const { supabaseUrl, supabasePublishableKey } = readPublicEnv(import.meta.env)

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
