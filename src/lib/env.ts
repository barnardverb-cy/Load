export type PublicEnv = {
  supabaseUrl: string
  supabasePublishableKey: string
}

export function readPublicEnv(env: ImportMetaEnv): PublicEnv {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim()
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing Supabase configuration. Copy .env.example to .env and add your project URL and publishable key.',
    )
  }

  return { supabaseUrl, supabasePublishableKey }
}
