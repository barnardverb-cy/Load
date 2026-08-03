<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'

import ToastNotification from '@/components/ToastNotification.vue'
import { getFitnessGoals, saveFitnessGoals } from '@/services/health'
import { useAuthStore } from '@/stores/auth'
import type { FitnessGoals } from '@/types/health'
import { getErrorMessage } from '@/utils/errors'
import { displayWeightToKilograms, kilogramsToDisplay } from '@/utils/units'
import { fitnessGoalsSchema } from '@/validation/health'

type NumberField = number | ''

const auth = useAuthStore()
const saving = ref(false)
const savingGoals = ref(false)
const toast = reactive({ message: '', tone: 'success' as 'success' | 'error' })
const savedProfileSnapshot = ref('')
const savedGoalsSnapshot = ref('')
const form = reactive({ displayName: '', preferredWeightUnit: 'kg' as 'kg' | 'lb' })
const goalsForm = reactive({
  starting_weight: '' as NumberField,
  goal_weight: '' as NumberField,
  starting_body_fat_percentage: '' as NumberField,
  goal_body_fat_percentage: '' as NumberField,
  daily_calorie_goal: '' as NumberField,
  daily_protein_goal_g: '' as NumberField,
  daily_water_goal_l: '' as NumberField,
  daily_steps_goal: '' as NumberField,
})

const goalWeightUnit = computed(() => auth.profile?.preferred_weight_unit ?? 'kg')
const profileDirty = computed(
  () => savedProfileSnapshot.value !== '' && JSON.stringify(form) !== savedProfileSnapshot.value,
)
const goalsDirty = computed(
  () => savedGoalsSnapshot.value !== '' && JSON.stringify(goalsForm) !== savedGoalsSnapshot.value,
)

watchEffect(() => {
  if (!auth.profile) return
  form.displayName = auth.profile.display_name ?? ''
  form.preferredWeightUnit = auth.profile.preferred_weight_unit
  savedProfileSnapshot.value = JSON.stringify(form)
})

function showToast(message: string, tone: 'success' | 'error' = 'success') {
  toast.message = message
  toast.tone = tone
}

function valueOrBlank(value: number | null | undefined): NumberField {
  return value === null || value === undefined ? '' : Number(value)
}

function populateGoals(goals: FitnessGoals | null) {
  goalsForm.starting_weight =
    goals?.starting_weight_kg === null || goals?.starting_weight_kg === undefined
      ? ''
      : kilogramsToDisplay(Number(goals.starting_weight_kg), goalWeightUnit.value)
  goalsForm.goal_weight =
    goals?.goal_weight_kg === null || goals?.goal_weight_kg === undefined
      ? ''
      : kilogramsToDisplay(Number(goals.goal_weight_kg), goalWeightUnit.value)
  goalsForm.starting_body_fat_percentage = valueOrBlank(goals?.starting_body_fat_percentage)
  goalsForm.goal_body_fat_percentage = valueOrBlank(goals?.goal_body_fat_percentage)
  goalsForm.daily_calorie_goal = valueOrBlank(goals?.daily_calorie_goal)
  goalsForm.daily_protein_goal_g = valueOrBlank(goals?.daily_protein_goal_g)
  goalsForm.daily_water_goal_l = valueOrBlank(goals?.daily_water_goal_l)
  goalsForm.daily_steps_goal = valueOrBlank(goals?.daily_steps_goal)
  savedGoalsSnapshot.value = JSON.stringify(goalsForm)
}

async function saveProfile() {
  saving.value = true
  try {
    await auth.updateProfile({
      display_name: form.displayName.trim() || null,
      preferred_weight_unit: form.preferredWeightUnit,
    })
    populateGoals(await getFitnessGoals())
    showToast('Preferences saved.')
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to save your profile.'), 'error')
  } finally {
    saving.value = false
  }
}

async function saveGoals() {
  if (!auth.user) return
  const result = fitnessGoalsSchema.safeParse({
    starting_weight_kg:
      goalsForm.starting_weight === ''
        ? null
        : displayWeightToKilograms(goalsForm.starting_weight, goalWeightUnit.value),
    goal_weight_kg:
      goalsForm.goal_weight === ''
        ? null
        : displayWeightToKilograms(goalsForm.goal_weight, goalWeightUnit.value),
    starting_body_fat_percentage: goalsForm.starting_body_fat_percentage,
    goal_body_fat_percentage: goalsForm.goal_body_fat_percentage,
    daily_calorie_goal: goalsForm.daily_calorie_goal,
    daily_protein_goal_g: goalsForm.daily_protein_goal_g,
    daily_water_goal_l: goalsForm.daily_water_goal_l,
    daily_steps_goal: goalsForm.daily_steps_goal,
  })
  if (!result.success) {
    showToast(result.error.issues[0]?.message ?? 'Check your goals.', 'error')
    return
  }

  savingGoals.value = true
  try {
    populateGoals(await saveFitnessGoals(auth.user.id, result.data))
    showToast('Fitness goals saved.')
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to save fitness goals.'), 'error')
  } finally {
    savingGoals.value = false
  }
}

onMounted(async () => {
  try {
    populateGoals(await getFitnessGoals())
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to load fitness goals.'), 'error')
  }
})
</script>

<template>
  <div class="page page--narrow">
    <ToastNotification :message="toast.message" :tone="toast.tone" @dismiss="toast.message = ''" />

    <header class="page-header">
      <div>
        <p class="eyebrow">Account</p>
        <h1>Your profile</h1>
        <p>Manage the preferences and goals used throughout your fitness tracker.</p>
      </div>
    </header>

    <section class="panel">
      <form class="form" @submit.prevent="saveProfile">
        <div class="field">
          <label for="profile-name">Display name</label>
          <input id="profile-name" v-model="form.displayName" type="text" maxlength="80" />
        </div>

        <div class="field">
          <label>Email</label>
          <input :value="auth.user?.email" type="email" disabled />
        </div>

        <fieldset class="field">
          <legend>Preferred weight unit</legend>
          <div class="segmented-control">
            <label>
              <input v-model="form.preferredWeightUnit" type="radio" value="kg" />
              <span>Kilograms</span>
            </label>
            <label>
              <input v-model="form.preferredWeightUnit" type="radio" value="lb" />
              <span>Pounds</span>
            </label>
          </div>
        </fieldset>

        <button
          class="button button--primary button--fit"
          type="submit"
          :disabled="saving || !profileDirty"
        >
          {{ saving ? 'Saving…' : profileDirty ? 'Save preferences' : 'No changes' }}
        </button>
      </form>
    </section>

    <section class="panel profile-goals-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Personal targets</p>
          <h2>Fitness goals</h2>
          <p>These power the progress cards on your dashboard.</p>
        </div>
      </div>

      <form class="form" @submit.prevent="saveGoals">
        <p class="form-section-label">Body composition</p>
        <div class="health-field-grid">
          <div class="field">
            <label for="starting-weight">Starting weight</label>
            <div class="input-suffix">
              <input
                id="starting-weight"
                v-model.number="goalsForm.starting_weight"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              />
              <span>{{ goalWeightUnit }}</span>
            </div>
          </div>
          <div class="field">
            <label for="goal-weight">Goal weight</label>
            <div class="input-suffix">
              <input
                id="goal-weight"
                v-model.number="goalsForm.goal_weight"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              />
              <span>{{ goalWeightUnit }}</span>
            </div>
          </div>
          <div class="field">
            <label for="starting-body-fat">Starting body fat</label>
            <div class="input-suffix">
              <input
                id="starting-body-fat"
                v-model.number="goalsForm.starting_body_fat_percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputmode="decimal"
              />
              <span>%</span>
            </div>
          </div>
          <div class="field">
            <label for="goal-body-fat">Goal body fat</label>
            <div class="input-suffix">
              <input
                id="goal-body-fat"
                v-model.number="goalsForm.goal_body_fat_percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputmode="decimal"
              />
              <span>%</span>
            </div>
          </div>
        </div>

        <p class="form-section-label">Daily goals</p>
        <div class="health-field-grid">
          <div class="field">
            <label for="calorie-goal">Calories</label>
            <div class="input-suffix">
              <input
                id="calorie-goal"
                v-model.number="goalsForm.daily_calorie_goal"
                type="number"
                min="0"
                inputmode="numeric"
              />
              <span>kcal</span>
            </div>
          </div>
          <div class="field">
            <label for="protein-goal">Protein</label>
            <div class="input-suffix">
              <input
                id="protein-goal"
                v-model.number="goalsForm.daily_protein_goal_g"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              />
              <span>g</span>
            </div>
          </div>
          <div class="field">
            <label for="water-goal">Water</label>
            <div class="input-suffix">
              <input
                id="water-goal"
                v-model.number="goalsForm.daily_water_goal_l"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
              />
              <span>L</span>
            </div>
          </div>
          <div class="field">
            <label for="steps-goal">Steps</label>
            <input
              id="steps-goal"
              v-model.number="goalsForm.daily_steps_goal"
              type="number"
              min="0"
              inputmode="numeric"
            />
          </div>
        </div>

        <button
          class="button button--primary button--fit"
          type="submit"
          :disabled="savingGoals || !goalsDirty"
        >
          {{ savingGoals ? 'Saving…' : goalsDirty ? 'Save fitness goals' : 'No changes' }}
        </button>
      </form>
    </section>
  </div>
</template>
