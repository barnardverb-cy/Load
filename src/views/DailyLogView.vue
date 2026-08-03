<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import ToastNotification from '@/components/ToastNotification.vue'
import { getDailyLog, saveDailyLog } from '@/services/health'
import { listWorkoutHistory } from '@/services/workouts'
import { useAuthStore } from '@/stores/auth'
import type { DailyLog } from '@/types/health'
import type { WorkoutSessionBundle } from '@/types/workout'
import { localDateString } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'
import { dailyLogSchema } from '@/validation/health'

type NumberField = number | ''

const auth = useAuthStore()
const today = localDateString()
const loading = ref(true)
const saving = ref(false)
const toast = reactive({ message: '', tone: 'success' as 'success' | 'error' })
const workouts = ref<WorkoutSessionBundle[]>([])
const savedSnapshot = ref('')
const form = reactive({
  log_date: today,
  calories: '' as NumberField,
  protein_g: '' as NumberField,
  water_l: '' as NumberField,
  steps: '' as NumberField,
  sleep_hours: '' as NumberField,
  notes: '',
})

const selectedWorkouts = computed(() =>
  workouts.value.filter(
    (workout) =>
      workout.status === 'completed' &&
      localDateString(new Date(workout.started_at)) === form.log_date,
  ),
)
const dirty = computed(() => savedSnapshot.value !== '' && snapshot() !== savedSnapshot.value)

function snapshot() {
  return JSON.stringify(form)
}

function showToast(message: string, tone: 'success' | 'error' = 'success') {
  toast.message = message
  toast.tone = tone
}

function populate(log: DailyLog | null) {
  form.calories = log?.calories ?? ''
  form.protein_g =
    log?.protein_g === null || log?.protein_g === undefined ? '' : Number(log.protein_g)
  form.water_l = log?.water_l === null || log?.water_l === undefined ? '' : Number(log.water_l)
  form.steps = log?.steps ?? ''
  form.sleep_hours =
    log?.sleep_hours === null || log?.sleep_hours === undefined ? '' : Number(log.sleep_hours)
  form.notes = log?.notes ?? ''
  savedSnapshot.value = snapshot()
}

async function loadSelectedDate() {
  loading.value = true
  try {
    populate(await getDailyLog(form.log_date))
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to load this daily log.'), 'error')
  } finally {
    loading.value = false
  }
}

async function save() {
  const result = dailyLogSchema.safeParse(form)
  if (!result.success) {
    showToast(result.error.issues[0]?.message ?? 'Check the daily log.', 'error')
    return
  }
  if (!auth.user) return

  saving.value = true
  try {
    const saved = await saveDailyLog(auth.user.id, {
      ...result.data,
      notes: result.data.notes || null,
    })
    populate(saved)
    showToast('Daily log saved.')
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to save the daily log.'), 'error')
  } finally {
    saving.value = false
  }
}

watch(
  () => form.log_date,
  () => void loadSelectedDate(),
)

onMounted(async () => {
  try {
    workouts.value = await listWorkoutHistory(100)
  } catch {
    workouts.value = []
  }
  await loadSelectedDate()
})
</script>

<template>
  <div class="page page--narrow">
    <ToastNotification :message="toast.message" :tone="toast.tone" @dismiss="toast.message = ''" />

    <header class="page-header page-header--actions">
      <div>
        <p class="eyebrow">Daily tracking</p>
        <h1>Log your day</h1>
        <p>Record nutrition, hydration, movement, and recovery in one place.</p>
      </div>
      <RouterLink class="button button--secondary" to="/dashboard">Dashboard</RouterLink>
    </header>

    <section class="panel health-entry-card">
      <form class="form" @submit.prevent="save">
        <div class="field">
          <label for="daily-date">Date</label>
          <input id="daily-date" v-model="form.log_date" type="date" :max="today" />
        </div>

        <div v-if="loading" class="inline-loading">Loading this day…</div>
        <template v-else>
          <div class="health-field-grid">
            <div class="field">
              <label for="daily-calories">Calories</label>
              <div class="input-suffix">
                <input
                  id="daily-calories"
                  v-model.number="form.calories"
                  type="number"
                  min="0"
                  inputmode="numeric"
                />
                <span>kcal</span>
              </div>
            </div>
            <div class="field">
              <label for="daily-protein">Protein</label>
              <div class="input-suffix">
                <input
                  id="daily-protein"
                  v-model.number="form.protein_g"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                />
                <span>g</span>
              </div>
            </div>
            <div class="field">
              <label for="daily-water">Water</label>
              <div class="input-suffix">
                <input
                  id="daily-water"
                  v-model.number="form.water_l"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                />
                <span>L</span>
              </div>
            </div>
            <div class="field">
              <label for="daily-steps">Steps</label>
              <input
                id="daily-steps"
                v-model.number="form.steps"
                type="number"
                min="0"
                inputmode="numeric"
              />
            </div>
            <div class="field">
              <label for="daily-sleep">Sleep</label>
              <div class="input-suffix">
                <input
                  id="daily-sleep"
                  v-model.number="form.sleep_hours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.25"
                  inputmode="decimal"
                />
                <span>hrs</span>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="daily-notes">Notes <span class="optional">Optional</span></label>
            <textarea
              id="daily-notes"
              v-model="form.notes"
              rows="4"
              maxlength="2000"
              placeholder="How did the day feel?"
            ></textarea>
          </div>

          <div v-if="selectedWorkouts.length" class="derived-workout-card">
            <span>Workout automatically linked</span>
            <strong>{{
              selectedWorkouts.map((workout) => workout.program_name).join(', ')
            }}</strong>
          </div>

          <button class="button button--primary" type="submit" :disabled="saving || !dirty">
            {{ saving ? 'Saving…' : dirty ? 'Save daily log' : 'No changes' }}
          </button>
        </template>
      </form>
    </section>
  </div>
</template>
