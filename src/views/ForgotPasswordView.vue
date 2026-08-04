<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AuthLayout from '@/layouts/AuthLayout.vue'
import { supabase } from '@/lib/supabase'
import { currentOrigin } from '@/utils/url'
import { passwordResetRequestSchema } from '@/validation/auth'

const form = reactive({ email: '' })
const errors = ref<Record<string, string>>({})
const submitError = ref('')
const successMessage = ref('')
const submitting = ref(false)

async function submit() {
  errors.value = {}
  submitError.value = ''
  successMessage.value = ''

  const result = passwordResetRequestSchema.safeParse(form)
  if (!result.success) {
    errors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    )
    return
  }

  submitting.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${currentOrigin()}/reset-password`,
    })
    if (error) throw error
    successMessage.value =
      'If an account exists for that email, a reset link is on its way. Check your inbox (and spam).'
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : 'Unable to send the reset email. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="auth-card__heading">
      <p class="eyebrow">Account access</p>
      <h2>Reset your password</h2>
      <p>Enter the email tied to your account and we will send a reset link.</p>
    </div>

    <form class="form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="reset-email">Email</label>
        <input
          id="reset-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          :aria-invalid="Boolean(errors.email)"
        />
        <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
      </div>

      <p v-if="submitError" class="alert alert--error" role="alert">{{ submitError }}</p>
      <p v-if="successMessage" class="alert alert--success" role="status">{{ successMessage }}</p>

      <button class="button button--primary" type="submit" :disabled="submitting">
        {{ submitting ? 'Sending…' : 'Send reset link' }}
      </button>
    </form>

    <p class="auth-switch">Remembered it? <RouterLink to="/login">Back to sign in</RouterLink></p>
  </AuthLayout>
</template>
