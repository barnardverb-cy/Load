<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { loginSchema } from '@/validation/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const submitError = ref('')
const submitting = ref(false)

async function submit() {
  errors.value = {}
  submitError.value = ''

  const result = loginSchema.safeParse(form)
  if (!result.success) {
    errors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    )
    return
  }

  submitting.value = true
  try {
    await auth.signIn(result.data.email, result.data.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect.startsWith('/') ? redirect : '/dashboard')
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to sign in. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="auth-card__heading">
      <p class="eyebrow">Welcome back</p>
      <h2>Sign in to Load</h2>
      <p>Pick up exactly where your last workout ended.</p>
    </div>

    <form class="form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          :aria-invalid="Boolean(errors.email)"
        />
        <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          placeholder="Your password"
          :aria-invalid="Boolean(errors.password)"
        />
        <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
      </div>

      <p v-if="submitError" class="alert alert--error" role="alert">{{ submitError }}</p>

      <button class="button button--primary" type="submit" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>

      <div class="auth-links">
        <RouterLink to="/forgot-password" class="auth-links__secondary"
          >Forgot your password?</RouterLink
        >
      </div>
    </form>

    <p class="auth-switch">
      New to Load? <RouterLink to="/register">Create an account</RouterLink>
    </p>
  </AuthLayout>
</template>
