<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AdherenceChart from '@/components/AdherenceChart.vue'
import SkeletonLine from '@/components/SkeletonLine.vue'
import StrengthImprovements from '@/components/StrengthImprovements.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import WeightTrendChart from '@/components/WeightTrendChart.vue'
import { getDailyLog, getFitnessGoals, listDailyLogs, listWeeklyCheckIns } from '@/services/health'
import { getActiveWorkout, listWorkoutHistory } from '@/services/workouts'
import { useAuthStore } from '@/stores/auth'
import { useRefresh } from '@/composables/useRefresh'
import type { DailyLog, FitnessGoals, WeeklyCheckIn } from '@/types/health'
import type { WorkoutSession, WorkoutSessionBundle } from '@/types/workout'
import { localDateString } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'
import { dailyAdherence, strengthImprovements, weightSummary } from '@/utils/analytics'
import { kilogramsToDisplay } from '@/utils/units'
import { formatDuration, workoutDurationSeconds, workoutVolume } from '@/utils/workout'

const auth = useAuthStore()
const { refreshing, setLoader, clearLoader } = useRefresh()
const loading = ref(true)
const goals = ref<FitnessGoals | null>(null)
const todayLog = ref<DailyLog | null>(null)
const recentLogs = ref<DailyLog[]>([])
const checkIns = ref<WeeklyCheckIn[]>([])
const workouts = ref<WorkoutSessionBundle[]>([])
const activeWorkout = ref<WorkoutSession | null>(null)
const toast = reactive({ message: '', tone: 'error' as 'success' | 'error' })
const today = localDateString()

const weightUnit = computed(() => auth.profile?.preferred_weight_unit ?? 'kg')
const latestCheckIn = computed(() => checkIns.value[0] ?? null)
const latestWeightCheckIn = computed(
  () => checkIns.value.find((checkIn) => checkIn.weight_kg !== null) ?? null,
)
const recentWorkouts = computed(() =>
  workouts.value.filter((workout) => workout.status === 'completed').slice(0, 3),
)
const workoutsThisWeek = computed(
  () =>
    workouts.value.filter(
      (workout) =>
        workout.status === 'completed' &&
        localDateString(new Date(workout.started_at)) >= dateDaysAgo(6),
    ).length,
)
const todayWorkouts = computed(() =>
  workouts.value.filter(
    (workout) =>
      workout.status === 'completed' && localDateString(new Date(workout.started_at)) === today,
  ),
)

const weightPoints = computed(() =>
  [...checkIns.value]
    .reverse()
    .filter((checkIn) => checkIn.weight_kg !== null)
    .slice(-12)
    .map((checkIn) => ({
      date: checkIn.check_in_date,
      value: kilogramsToDisplay(Number(checkIn.weight_kg), weightUnit.value),
    })),
)

const weight = computed(() =>
  weightSummary(
    latestWeightCheckIn.value ? Number(latestWeightCheckIn.value.weight_kg) : null,
    goals.value?.starting_weight_kg ?? null,
    goals.value?.goal_weight_kg ?? null,
  ),
)

const adherence = computed(() => dailyAdherence(recentLogs.value, 7))
const strength = computed(() => strengthImprovements(workouts.value))
const checkInDue = computed(() => {
  if (!latestCheckIn.value) return true
  const daysSince = Math.floor(
    (new Date(`${today}T12:00:00`).getTime() -
      new Date(`${latestCheckIn.value.check_in_date}T12:00:00`).getTime()) /
      86400000,
  )
  return daysSince >= 7
})

const dailyGoals = computed(() => [
  {
    label: 'Calories',
    value: todayLog.value?.calories ?? 0,
    goal: goals.value?.daily_calorie_goal ?? null,
    unit: 'kcal',
  },
  {
    label: 'Protein',
    value: Number(todayLog.value?.protein_g ?? 0),
    goal: goals.value?.daily_protein_goal_g ?? null,
    unit: 'g',
  },
  {
    label: 'Water',
    value: Number(todayLog.value?.water_l ?? 0),
    goal: goals.value?.daily_water_goal_l ?? null,
    unit: 'L',
  },
  {
    label: 'Steps',
    value: todayLog.value?.steps ?? 0,
    goal: goals.value?.daily_steps_goal ?? null,
    unit: '',
  },
])

function goalPercentage(value: number, goal: number | null) {
  if (!goal) return 0
  return Math.min(100, Math.round((value / Number(goal)) * 100))
}

function dateDaysAgo(days: number, from = new Date()): string {
  const date = new Date(from)
  date.setDate(date.getDate() - days)
  return localDateString(date)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  )
}

// Load any in-progress workout so the dashboard can offer to resume it.
async function loadActiveWorkout() {
  try {
    activeWorkout.value = await getActiveWorkout()
  } catch {
    activeWorkout.value = null
  }
}

async function load() {
  try {
    const [savedGoals, log, logs, savedCheckIns, history] = await Promise.all([
      getFitnessGoals(),
      getDailyLog(today),
      listDailyLogs(dateDaysAgo(6), today),
      listWeeklyCheckIns(12),
      listWorkoutHistory(20),
    ])
    goals.value = savedGoals
    todayLog.value = log
    recentLogs.value = logs
    checkIns.value = savedCheckIns
    workouts.value = history
    await loadActiveWorkout()
  } catch (error) {
    toast.message = getErrorMessage(error, 'Unable to load the dashboard.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setLoader(load)
  void load()
})

onBeforeUnmount(() => clearLoader())
</script>

<template>
  <div class="page dashboard-page">
    <ToastNotification :message="toast.message" :tone="toast.tone" @dismiss="toast.message = ''" />

    <header class="dashboard-hero">
      <div>
        <p class="eyebrow">Today’s overview</p>
        <h1>Welcome back, {{ auth.profile?.display_name?.split(' ')[0] || 'Athlete' }}.</h1>
        <p>Small entries create a clear picture of your progress.</p>
      </div>
      <div class="dashboard-quick-actions">
        <RouterLink class="button button--primary" to="/daily">Log today</RouterLink>
        <RouterLink class="button button--secondary" to="/check-ins">Weekly check-in</RouterLink>
      </div>
    </header>

    <div v-if="loading || refreshing" class="dashboard-skeleton" aria-busy="true">
      <div class="dashboard-skeleton__row">
        <div class="metric-card">
          <SkeletonLine variant="title" width="50%" />
          <SkeletonLine width="70%" />
          <SkeletonLine width="40%" />
        </div>
        <div class="metric-card">
          <SkeletonLine variant="title" width="50%" />
          <SkeletonLine width="70%" />
          <SkeletonLine width="40%" />
        </div>
        <div class="metric-card">
          <SkeletonLine variant="title" width="50%" />
          <SkeletonLine width="70%" />
          <SkeletonLine width="40%" />
        </div>
      </div>
      <div class="metric-card metric-card--wide">
        <SkeletonLine variant="title" width="35%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="80%" />
      </div>
    </div>
    <template v-else>
      <RouterLink v-if="activeWorkout" class="resume-banner" :to="`/workouts/${activeWorkout.id}`">
        <span class="resume-banner__pulse" aria-hidden="true"></span>
        <span>
          <strong>Resume your workout</strong>
          <small>{{ activeWorkout.program_name }} · in progress</small>
        </span>
        <span class="resume-banner__cta">Continue →</span>
      </RouterLink>

      <section class="dashboard-section">
        <div class="section-heading section-heading--inline">
          <div>
            <p class="eyebrow">Daily goals</p>
            <h2>Today</h2>
          </div>
          <RouterLink to="/profile">Edit goals</RouterLink>
        </div>

        <div class="daily-goal-grid">
          <RouterLink
            v-for="item in dailyGoals"
            :key="item.label"
            class="daily-goal-card"
            to="/daily"
          >
            <span>{{ item.label }}</span>
            <strong
              >{{ item.value.toLocaleString() }}<small>{{ item.unit }}</small></strong
            >
            <div class="goal-progress">
              <span :style="{ width: `${goalPercentage(item.value, item.goal)}%` }"></span>
            </div>
            <small v-if="item.goal"
              >{{ goalPercentage(item.value, item.goal) }}% of
              {{ Number(item.goal).toLocaleString() }} {{ item.unit }}</small
            >
            <small v-else>Set a goal in Profile</small>
          </RouterLink>
        </div>
      </section>

      <section class="dashboard-main-grid">
        <article class="dashboard-panel weight-trend-panel">
          <div class="section-heading section-heading--inline">
            <div>
              <p class="eyebrow">Body progress</p>
              <h2>Weight trend</h2>
            </div>
            <RouterLink to="/check-ins">View check-ins</RouterLink>
          </div>

          <template v-if="latestWeightCheckIn">
            <div class="latest-measurement">
              <strong
                >{{ kilogramsToDisplay(Number(latestWeightCheckIn.weight_kg), weightUnit)
                }}<small>{{ weightUnit }}</small></strong
              >
              <span class="latest-measurement__meta">
                <small v-if="weight.changeFromStart !== null"
                  >{{ weight.changeFromStart > 0 ? '+' : ''
                  }}{{ kilogramsToDisplay(weight.changeFromStart, weightUnit) }}
                  {{ weightUnit }} since starting</small
                >
                <small v-if="goals?.goal_weight_kg != null"
                  >Goal: {{ kilogramsToDisplay(Number(goals.goal_weight_kg), weightUnit) }}
                  {{ weightUnit }}</small
                >
              </span>
            </div>
            <WeightTrendChart
              :points="weightPoints"
              :unit="weightUnit"
              :goal="goals?.goal_weight_kg"
              :starting="goals?.starting_weight_kg"
            />
          </template>
          <div v-else class="empty-state empty-state--compact">
            Add a weekly weight check-in to start your trend.
          </div>
        </article>

        <article class="dashboard-panel consistency-panel">
          <p class="eyebrow">Last 7 days</p>
          <h2>Consistency</h2>
          <div class="consistency-stats">
            <div>
              <strong>{{ recentLogs.length }}/7</strong><span>days logged</span>
            </div>
            <div>
              <strong>{{ workoutsThisWeek }}</strong
              ><span>workouts</span>
            </div>
            <div>
              <strong>{{ todayWorkouts.length }}</strong
              ><span>today</span>
            </div>
          </div>
          <AdherenceChart :days="adherence" />
        </article>
      </section>

      <section class="dashboard-section">
        <div class="section-heading section-heading--inline">
          <div>
            <p class="eyebrow">Training</p>
            <h2>Recent strength gains</h2>
          </div>
          <RouterLink to="/history">View history</RouterLink>
        </div>
        <article class="dashboard-panel">
          <StrengthImprovements :improvements="strength" :unit="weightUnit" />
        </article>
      </section>

      <section class="dashboard-section">
        <div class="section-heading section-heading--inline">
          <div>
            <p class="eyebrow">Training</p>
            <h2>Recent workouts</h2>
          </div>
          <RouterLink to="/history">View history</RouterLink>
        </div>
        <div v-if="recentWorkouts.length" class="dashboard-workout-list">
          <RouterLink
            v-for="workout in recentWorkouts"
            :key="workout.id"
            :to="`/workouts/${workout.id}/summary`"
          >
            <span
              ><strong>{{ workout.program_name }}</strong
              ><small>{{
                formatShortDate(localDateString(new Date(workout.started_at)))
              }}</small></span
            >
            <span
              ><strong>{{ workoutVolume(workout).toLocaleString() }} kg</strong
              ><small>{{
                formatDuration(workoutDurationSeconds(workout.started_at, workout.completed_at))
              }}</small></span
            >
          </RouterLink>
        </div>
        <div v-else class="empty-state empty-state--compact">
          Your recent workouts will appear here.
        </div>
      </section>

      <RouterLink v-if="checkInDue" class="checkin-reminder" to="/check-ins">
        <span class="checkin-reminder__icon" aria-hidden="true">◷</span>
        <span>
          <strong>Time for your weekly check-in</strong>
          <small>Log weight and measurements to keep your trend accurate.</small>
        </span>
        <span class="checkin-reminder__cta">Check in →</span>
      </RouterLink>
    </template>
  </div>
</template>
