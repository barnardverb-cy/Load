<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { registerSchema } from '@/validation/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ displayName: '', email: '', password: '', confirmPassword: '' })
const errors = ref<Record<string, string>>({})
const submitError = ref('')
const successMessage = ref('')
const submitting = ref(false)
const showPassword = ref(false)

async function submit() {
  errors.value = {}
  submitError.value = ''
  successMessage.value = ''

  const result = registerSchema.safeParse(form)
  if (!result.success) {
    errors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    )
    return
  }

  submitting.value = true
  try {
    const data = await auth.register(
      result.data.email,
      result.data.password,
      result.data.displayName,
    )
    if (data.session) {
      await router.replace('/dashboard')
    } else {
      successMessage.value =
        'Check your email to confirm your account, then return here to sign in.'
    }
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to register. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="auth-card__heading">
      <p class="eyebrow">Start tracking</p>
      <h2>Create your account</h2>
      <p>Your training history stays private to your account.</p>
    </div>

    <form class="form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="display-name">Name</label>
        <input
          id="display-name"
          v-model="form.displayName"
          type="text"
          autocomplete="name"
          placeholder="Your name"
          :aria-invalid="Boolean(errors.displayName)"
        />
        <p v-if="errors.displayName" class="field-error">{{ errors.displayName }}</p>
      </div>

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

      <div class="field-grid">
        <div class="field">
          <label for="password">Password</label>
          <div class="field__row">
            <input
              id="password"
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
          <label for="confirm-password">Confirm</label>
          <div class="field__row">
            <input
              id="confirm-password"
              v-model="form.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Repeat password"
              :aria-invalid="Boolean(errors.confirmPassword)"
            />
          </div>
          <p v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</p>
        </div>
      </div>

      <p v-if="submitError" class="alert alert--error" role="alert">{{ submitError }}</p>
      <p v-if="successMessage" class="alert alert--success" role="status">
        {{ successMessage }}
      </p>

      <button class="button button--primary" type="submit" :disabled="submitting">
        {{ submitting ? 'Creating account…' : 'Create account' }}
      </button>
    </form>

    <p class="auth-switch">Already registered? <RouterLink to="/login">Sign in</RouterLink></p>
  </AuthLayout>
</template>
