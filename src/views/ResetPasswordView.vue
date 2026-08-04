<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { currentUrl, delay } from '@/utils/url'
import { passwordResetSchema } from '@/validation/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ password: '', confirmPassword: '' })
const errors = ref<Record<string, string>>({})
const submitError = ref('')
const successMessage = ref('')
const submitting = ref(false)
const sessionReady = ref(false)
const checking = ref(true)
const showPassword = ref(false)

async function detectSession() {
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

onMounted(async () => {
  // Supabase exchanges the recovery token in the URL automatically
  // (detectSessionInUrl is enabled). The exchange is async, so if a token is
  // present but not yet processed, poll briefly instead of failing immediately.
  const hasToken = /[?&#](access_token|type=recovery|token)/.test(currentUrl())

  sessionReady.value = await detectSession()
  if (!sessionReady.value && hasToken) {
    for (let attempt = 0; attempt < 10 && !sessionReady.value; attempt += 1) {
      await delay(300)
      sessionReady.value = await detectSession()
    }
  }
  checking.value = false
})

async function submit() {
  errors.value = {}
  submitError.value = ''
  successMessage.value = ''

  const result = passwordResetSchema.safeParse(form)
  if (!result.success) {
    errors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    )
    return
  }

  submitting.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: result.data.password })
    if (error) throw error
    successMessage.value = 'Password updated. Sign in with your new password.'
    await auth.signOut()
    await delay(1200)
    await router.replace('/login')
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : 'Unable to update your password. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="auth-card__heading">
      <p class="eyebrow">Account access</p>
      <h2>Choose a new password</h2>
      <p>Pick something memorable but strong — at least 8 characters.</p>
    </div>

    <p v-if="checking" class="auth-panel__note">Verifying your reset link…</p>

    <form v-else-if="sessionReady" class="form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="new-password">New password</label>
        <div class="field__row">
          <input
            id="new-password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="8+ characters"
            :aria-invalid="Boolean(errors.password)"
          />
          <button
            type="button"
            class="password-toggle"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
      </div>

      <div class="field">
        <label for="confirm-new-password">Confirm password</label>
        <div class="field__row">
          <input
            id="confirm-new-password"
            v-model="form.confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="Repeat password"
            :aria-invalid="Boolean(errors.confirmPassword)"
          />
        </div>
        <p v-if="errors.confirmPassword" class="field-error">
          {{ errors.confirmPassword }}
        </p>
      </div>

      <p v-if="submitError" class="alert alert--error" role="alert">{{ submitError }}</p>
      <p v-if="successMessage" class="alert alert--success" role="status">{{ successMessage }}</p>

      <button class="button button--primary" type="submit" :disabled="submitting">
        {{ submitting ? 'Updating…' : 'Update password' }}
      </button>
    </form>

    <div v-else class="auth-panel__note">
      <p class="alert alert--error" role="alert">
        This reset link is invalid or has expired. Request a fresh one.
      </p>
      <RouterLink class="button button--primary" to="/forgot-password"
        >Request reset link</RouterLink
      >
    </div>

    <p class="auth-switch">
      <RouterLink to="/login">Back to sign in</RouterLink>
    </p>
  </AuthLayout>
</template>
