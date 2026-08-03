import { describe, expect, it } from 'vitest'

import { readPublicEnv } from './env'

describe('readPublicEnv', () => {
  it('returns configured public values', () => {
    expect(
      readPublicEnv({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      } as ImportMetaEnv),
    ).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      supabasePublishableKey: 'publishable-key',
    })
  })

  it('fails with a useful message when configuration is missing', () => {
    expect(() =>
      readPublicEnv({
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_PUBLISHABLE_KEY: '',
      } as ImportMetaEnv),
    ).toThrow('Missing Supabase configuration')
  })
})
