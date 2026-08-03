import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const initialized = ref(false)
  const initializing = ref<Promise<void> | null>(null)

  const user = computed<User | null>(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => user.value !== null)

  async function loadProfile() {
    if (!user.value) {
      profile.value = null
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (error) throw error
    profile.value = data
  }

  async function applySession(nextSession: Session | null) {
    session.value = nextSession
    profile.value = null

    if (nextSession) await loadProfile()
  }

  async function initialize() {
    if (initialized.value) return
    if (initializing.value) return initializing.value

    initializing.value = (async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      await applySession(data.session)

      supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
        // Avoid awaiting Supabase calls directly inside this callback.
        void applySession(nextSession)
      })

      initialized.value = true
    })()

    try {
      await initializing.value
    } finally {
      initializing.value = null
    }
  }

  async function register(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    })

    if (error) throw error
    if (data.session) await applySession(data.session)
    return data
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await applySession(data.session)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await applySession(null)
  }

  async function updateProfile(updates: Pick<Profile, 'display_name' | 'preferred_weight_unit'>) {
    if (!user.value) throw new Error('You must be signed in to update your profile.')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
      .select('*')
      .single()

    if (error) throw error
    profile.value = data
  }

  return {
    session,
    user,
    profile,
    initialized,
    isAuthenticated,
    initialize,
    register,
    signIn,
    signOut,
    loadProfile,
    updateProfile,
  }
})
