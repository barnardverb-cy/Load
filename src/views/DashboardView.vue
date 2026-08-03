<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import ToastNotification from '@/components/ToastNotification.vue'
import { getDailyLog, getFitnessGoals, listDailyLogs, listWeeklyCheckIns } from '@/services/health'
import { listWorkoutHistory } from '@/services/workouts'
import { useAuthStore } from '@/stores/auth'
import type { DailyLog, FitnessGoals, WeeklyCheckIn } from '@/types/health'
import type { WorkoutSessionBundle } from '@/types/workout'
import { dateDaysAgo, localDateString } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'
import { kilogramsToDisplay } from '@/utils/units'
import { formatDuration, workoutDurationSeconds, workoutVolume } from '@/utils/workout'

const auth = useAuthStore()
const loading = ref(true)
const goals = ref<FitnessGoals | null>(null)
const todayLog = ref<DailyLog | null>(null)
const recentLogs = ref<DailyLog[]>([])
const checkIns = ref<WeeklyCheckIn[]>([])
const workouts = ref<WorkoutSessionBundle[]>([])
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
    .slice(-8)
    .map((checkIn) => ({
      date: checkIn.check_in_date,
      value: kilogramsToDisplay(Number(checkIn.weight_kg), weightUnit.value),
    })),
)
const chartPoints = computed(() => {
  const points = weightPoints.value
  if (!points.length) return []
  const values = points.map((point) => point.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const spread = maximum - minimum || 1
  return points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? 160 : 14 + (index / (points.length - 1)) * 292,
    y: 14 + ((maximum - point.value) / spread) * 72,
  }))
})
const chartPolyline = computed(() =>
  chartPoints.value.map((point) => `${point.x},${point.y}`).join(' '),
)

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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  )
}

onMounted(async () => {
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
  } catch (error) {
    toast.message = getErrorMessage(error, 'Unable to load the dashboard.')
  } finally {
    loading.value = false
  }
})
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

    <div v-if="loading" class="empty-state">Loading your dashboard…</div>
    <template v-else>
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

          <template v-if="chartPoints.length">
            <div class="latest-measurement">
              <strong>
                {{ kilogramsToDisplay(Number(latestWeightCheckIn?.weight_kg), weightUnit) }}
                <small>{{ weightUnit }}</small>
              </strong>
              <span class="latest-measurement__meta">
                <small v-if="latestCheckIn?.body_fat_percentage != null">
                  {{ Number(latestCheckIn?.body_fat_percentage) }}% body fat
                </small>
                <small v-if="goals?.goal_weight_kg != null">
                  Goal: {{ kilogramsToDisplay(Number(goals.goal_weight_kg), weightUnit) }}
                  {{ weightUnit }}
                </small>
              </span>
            </div>
            <svg class="weight-chart" viewBox="0 0 320 105" role="img" aria-label="Weight trend">
              <path d="M14 86H306" />
              <polyline :points="chartPolyline" />
              <circle
                v-for="point in chartPoints"
                :key="point.date"
                :cx="point.x"
                :cy="point.y"
                r="4"
              />
            </svg>
            <div class="weight-chart__dates">
              <span>{{ formatShortDate(chartPoints[0]!.date) }}</span>
              <span>{{ formatShortDate(chartPoints[chartPoints.length - 1]!.date) }}</span>
            </div>
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
          <div class="week-dots" aria-label="Daily log consistency">
            <span
              v-for="offset in [6, 5, 4, 3, 2, 1, 0]"
              :key="offset"
              :class="{
                'week-dots__filled': recentLogs.some((log) => log.log_date === dateDaysAgo(offset)),
              }"
              :title="dateDaysAgo(offset)"
            ></span>
          </div>
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
    </template>
  </div>
</template>
