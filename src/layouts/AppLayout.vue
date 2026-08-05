<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import BrandMark from '@/components/BrandMark.vue'
import { useAuthStore } from '@/stores/auth'
import { provideRefresh, useRefresh } from '@/composables/useRefresh'

provideRefresh()
const { refreshing, refresh } = useRefresh()

const auth = useAuthStore()
const router = useRouter()
const signingOut = ref(false)

const initials = computed(() => {
  const source = auth.profile?.display_name || auth.user?.email || 'A'
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
})

async function signOut() {
  signingOut.value = true
  try {
    await auth.signOut()
    await router.replace('/login')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div class="app-frame">
    <aside class="sidebar">
      <BrandMark />

      <nav class="app-nav" aria-label="Main navigation">
        <RouterLink to="/dashboard">
          <span aria-hidden="true">⌂</span>
          Dashboard
        </RouterLink>
        <RouterLink to="/exercises">
          <span aria-hidden="true">◇</span>
          Exercises
        </RouterLink>
        <RouterLink to="/programs">
          <span aria-hidden="true">☷</span>
          Programs
        </RouterLink>
        <RouterLink to="/history">
          <span aria-hidden="true">◷</span>
          History
        </RouterLink>
        <RouterLink to="/profile">
          <span aria-hidden="true">○</span>
          Profile
        </RouterLink>
      </nav>

      <div class="sidebar__account">
        <RouterLink class="account-link" to="/profile">
          <span class="avatar">{{ initials }}</span>
          <span>
            <strong>{{ auth.profile?.display_name || 'Your profile' }}</strong>
            <small>{{ auth.user?.email }}</small>
          </span>
        </RouterLink>
        <button class="text-button" type="button" :disabled="signingOut" @click="signOut">
          {{ signingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </div>
    </aside>

    <main class="app-content">
      <div class="app-topbar">
        <span class="app-topbar__spacer" aria-hidden="true"></span>
        <button
          class="refresh-button"
          type="button"
          :disabled="refreshing"
          :aria-busy="refreshing"
          aria-label="Refresh data"
          title="Refresh"
          @click="refresh"
        >
          <svg
            class="refresh-button__icon"
            :class="{ 'is-spinning': refreshing }"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 4v5h-5" />
          </svg>
          <span>{{ refreshing ? 'Refreshing…' : 'Refresh' }}</span>
        </button>
      </div>

      <RouterView />
    </main>
  </div>
</template>
