<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import ToastNotification from '@/components/ToastNotification.vue'
import { getWeeklyCheckIn, listWeeklyCheckIns, saveWeeklyCheckIn } from '@/services/health'
import { useAuthStore } from '@/stores/auth'
import type { WeeklyCheckIn } from '@/types/health'
import { isoWeekNumber, localDateString } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'
import { displayWeightToKilograms, kilogramsToDisplay } from '@/utils/units'
import { weeklyCheckInSchema } from '@/validation/health'

type NumberField = number | ''

const auth = useAuthStore()
const today = localDateString()
const loading = ref(true)
const saving = ref(false)
const checkIns = ref<WeeklyCheckIn[]>([])
const toast = reactive({ message: '', tone: 'success' as 'success' | 'error' })
const savedSnapshot = ref('')
const form = reactive({
  check_in_date: today,
  weight: '' as NumberField,
  body_fat_percentage: '' as NumberField,
  waist_inches: '' as NumberField,
  chest_inches: '' as NumberField,
  hips_inches: '' as NumberField,
  arms_inches: '' as NumberField,
  quads_inches: '' as NumberField,
  notes: '',
})
const measurementFields = [
  { key: 'waist_inches' as const, label: 'Waist' },
  { key: 'chest_inches' as const, label: 'Chest' },
  { key: 'hips_inches' as const, label: 'Hips' },
  { key: 'arms_inches' as const, label: 'Arms' },
  { key: 'quads_inches' as const, label: 'Quads' },
]

const weightUnit = computed(() => auth.profile?.preferred_weight_unit ?? 'kg')
const weekNumber = computed(() => isoWeekNumber(form.check_in_date))
const dirty = computed(() => savedSnapshot.value !== '' && snapshot() !== savedSnapshot.value)

function snapshot() {
  return JSON.stringify(form)
}

function valueOrBlank(value: number | null | undefined): NumberField {
  return value === null || value === undefined ? '' : Number(value)
}

function showToast(message: string, tone: 'success' | 'error' = 'success') {
  toast.message = message
  toast.tone = tone
}

function populate(checkIn: WeeklyCheckIn | null) {
  form.weight =
    checkIn?.weight_kg === null || checkIn?.weight_kg === undefined
      ? ''
      : kilogramsToDisplay(Number(checkIn.weight_kg), weightUnit.value)
  form.body_fat_percentage = valueOrBlank(checkIn?.body_fat_percentage)
  form.waist_inches = valueOrBlank(checkIn?.waist_inches)
  form.chest_inches = valueOrBlank(checkIn?.chest_inches)
  form.hips_inches = valueOrBlank(checkIn?.hips_inches)
  form.arms_inches = valueOrBlank(checkIn?.arms_inches)
  form.quads_inches = valueOrBlank(checkIn?.quads_inches)
  form.notes = checkIn?.notes ?? ''
  savedSnapshot.value = snapshot()
}

async function loadSelectedDate() {
  loading.value = true
  try {
    populate(await getWeeklyCheckIn(form.check_in_date))
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to load this check-in.'), 'error')
  } finally {
    loading.value = false
  }
}

async function refreshHistory() {
  checkIns.value = await listWeeklyCheckIns()
}

async function save() {
  const result = weeklyCheckInSchema.safeParse({
    check_in_date: form.check_in_date,
    weight_kg: form.weight === '' ? null : displayWeightToKilograms(form.weight, weightUnit.value),
    body_fat_percentage: form.body_fat_percentage,
    waist_inches: form.waist_inches,
    chest_inches: form.chest_inches,
    hips_inches: form.hips_inches,
    arms_inches: form.arms_inches,
    quads_inches: form.quads_inches,
    notes: form.notes,
  })
  if (!result.success) {
    showToast(result.error.issues[0]?.message ?? 'Check the measurements.', 'error')
    return
  }
  if (!auth.user) return

  saving.value = true
  try {
    const saved = await saveWeeklyCheckIn(auth.user.id, {
      ...result.data,
      notes: result.data.notes || null,
    })
    populate(saved)
    await refreshHistory()
    showToast('Weekly check-in saved.')
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to save the weekly check-in.'), 'error')
  } finally {
    saving.value = false
  }
}

function editCheckIn(checkIn: WeeklyCheckIn) {
  form.check_in_date = checkIn.check_in_date
  globalThis.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(
  () => form.check_in_date,
  () => void loadSelectedDate(),
)

onMounted(async () => {
  try {
    await Promise.all([refreshHistory(), loadSelectedDate()])
  } catch (error) {
    showToast(getErrorMessage(error, 'Unable to load weekly check-ins.'), 'error')
  }
})
</script>

<template>
  <div class="page page--narrow">
    <ToastNotification :message="toast.message" :tone="toast.tone" @dismiss="toast.message = ''" />

    <header class="page-header page-header--actions">
      <div>
        <p class="eyebrow">Weekly progress</p>
        <h1>Check in</h1>
        <p>Track body changes consistently without cluttering your daily log.</p>
      </div>
      <RouterLink class="button button--secondary" to="/dashboard">Dashboard</RouterLink>
    </header>

    <section class="panel health-entry-card">
      <form class="form" @submit.prevent="save">
        <div class="check-in-date-row">
          <div class="field">
            <label for="check-in-date">Date</label>
            <input id="check-in-date" v-model="form.check_in_date" type="date" :max="today" />
          </div>
          <span class="week-badge">Week {{ weekNumber }}</span>
        </div>

        <div v-if="loading" class="inline-loading">Loading this check-in…</div>
        <template v-else>
          <div class="health-field-grid">
            <div class="field">
              <label for="check-in-weight">Weight</label>
              <div class="input-suffix">
                <input
                  id="check-in-weight"
                  v-model.number="form.weight"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                />
                <span>{{ weightUnit }}</span>
              </div>
            </div>
            <div class="field">
              <label for="check-in-body-fat">Body fat</label>
              <div class="input-suffix">
                <input
                  id="check-in-body-fat"
                  v-model.number="form.body_fat_percentage"
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

          <div>
            <p class="form-section-label">Measurements <span>inches</span></p>
            <div class="health-field-grid health-field-grid--measurements">
              <div v-for="field in measurementFields" :key="field.key" class="field">
                <label :for="`check-in-${field.key}`">{{ field.label }}</label>
                <div class="input-suffix">
                  <input
                    :id="`check-in-${field.key}`"
                    v-model.number="form[field.key]"
                    type="number"
                    min="0"
                    step="0.1"
                    inputmode="decimal"
                  />
                  <span>in</span>
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="check-in-notes">Notes <span class="optional">Optional</span></label>
            <textarea
              id="check-in-notes"
              v-model="form.notes"
              rows="4"
              maxlength="2000"
              placeholder="Energy, fit, cycle, or anything worth remembering"
            ></textarea>
          </div>

          <button class="button button--primary" type="submit" :disabled="saving || !dirty">
            {{ saving ? 'Saving…' : dirty ? 'Save check-in' : 'No changes' }}
          </button>
        </template>
      </form>
    </section>

    <section class="check-in-history">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Previous entries</p>
          <h2>Check-in history</h2>
        </div>
      </div>
      <div v-if="checkIns.length" class="check-in-list">
        <button
          v-for="checkIn in checkIns"
          :key="checkIn.id"
          type="button"
          @click="editCheckIn(checkIn)"
        >
          <span>
            <strong>Week {{ isoWeekNumber(checkIn.check_in_date) }}</strong>
            <small>{{ checkIn.check_in_date }}</small>
          </span>
          <span>
            <strong v-if="checkIn.weight_kg !== null">
              {{ kilogramsToDisplay(Number(checkIn.weight_kg), weightUnit) }} {{ weightUnit }}
            </strong>
            <small v-if="checkIn.body_fat_percentage !== null"
              >{{ Number(checkIn.body_fat_percentage) }}% body fat</small
            >
          </span>
        </button>
      </div>
      <div v-else class="empty-state empty-state--compact">
        Your weekly check-ins will appear here.
      </div>
    </section>
  </div>
</template>
