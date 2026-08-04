import type { DailyLog } from '@/types/health'
import type { WorkoutSessionBundle } from '@/types/workout'

/**
 * Pure analytics helpers for the dashboard. No Vue or Supabase imports so they
 * stay trivially unit-testable and reusable in any view.
 */

export interface WeightSummary {
  current: number | null
  starting: number | null
  goal: number | null
  /** current minus starting, in kilograms (null when either is missing) */
  changeFromStart: number | null
  /** percentage change relative to the starting weight (null when starting is 0/missing) */
  changePercentFromStart: number | null
  /** current minus goal, in kilograms (null when goal is missing) */
  goalDelta: number | null
  /** progress toward the goal as a 0–100 percentage (null when start === goal) */
  goalProgressPercent: number | null
  /** true when the current weight has reached or passed the goal */
  goalAttained: boolean
}

export function weightSummary(
  current: number | null,
  starting: number | null,
  goal: number | null,
): WeightSummary {
  const changeFromStart =
    current !== null && starting !== null ? Number((current - starting).toFixed(2)) : null
  const changePercentFromStart =
    current !== null && starting !== null && starting !== 0
      ? Math.round((current / starting - 1) * 100)
      : null
  const goalDelta = current !== null && goal !== null ? Number((current - goal).toFixed(2)) : null
  let goalProgressPercent: number | null = null
  if (current !== null && starting !== null && goal !== null && starting !== goal) {
    const ratio = (current - starting) / (goal - starting)
    goalProgressPercent = Math.min(100, Math.max(0, Math.round(ratio * 100)))
  }
  const goalAttained =
    current !== null && goal !== null && starting !== null
      ? goal <= starting
        ? current <= goal
        : current >= goal
      : false

  return {
    current,
    starting,
    goal,
    changeFromStart,
    changePercentFromStart,
    goalDelta,
    goalProgressPercent,
    goalAttained,
  }
}

/**
 * Number of consecutive days with a daily log, counting backwards from today.
 * If today is not yet logged, the streak is measured up to yesterday so a
 * missed-but-not-yet-finished day does not instantly reset the count.
 */
export function currentStreak(logDates: string[]): number {
  const logged = new Set(logDates)
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!logged.has(localDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!logged.has(localDate(cursor))) return 0
  }

  let streak = 0
  while (logged.has(localDate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * Per-day logging adherence for the last `days` days ending today.
 */
export function dailyAdherence(logs: DailyLog[], days = 7): { date: string; logged: boolean }[] {
  const logged = new Set(logs.map((log) => log.log_date))
  const result: { date: string; logged: boolean }[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(cursor)
    date.setDate(cursor.getDate() - offset)
    const iso = localDate(date)
    result.push({ date: iso, logged: logged.has(iso) })
  }
  return result
}

function localDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Estimated one-rep max using the Epley formula: weight × (1 + reps / 30).
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 0) return 0
  return Number((weight * (1 + reps / 30)).toFixed(1))
}

export interface StrengthImprovement {
  exercise: string
  previousOneRepMax: number | null
  latestOneRepMax: number | null
  deltaOneRepMax: number | null
  percent: number | null
  latestDate: string
}

/**
 * Recent strength improvements: for each exercise, compares the best estimated
 * one-rep max from the athlete's latest completed session against the previous
 * completed session, returning the largest gains first.
 */
export function strengthImprovements(
  workouts: WorkoutSessionBundle[],
  limit = 5,
): StrengthImprovement[] {
  const completed = workouts
    .filter((workout) => workout.status === 'completed' && workout.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  const sessionOneRepMax = new Map<string, Map<string, number>>()
  const sessionDate = new Map<string, string>()
  for (const workout of completed) {
    const exerciseBest = new Map<string, number>()
    for (const exercise of workout.exercises) {
      const best = exercise.sets
        .filter((set) => set.status === 'completed' && set.actual_reps && set.actual_weight)
        .reduce((max, set) => {
          const est = estimatedOneRepMax(Number(set.actual_weight), Number(set.actual_reps))
          return est > max ? est : max
        }, 0)
      if (best > 0) exerciseBest.set(exercise.exercise_name, best)
    }
    sessionOneRepMax.set(workout.id, exerciseBest)
    sessionDate.set(workout.id, localDate(new Date(workout.completed_at!)))
  }

  const sessionIds = [...sessionOneRepMax.keys()]
  const improvements: StrengthImprovement[] = []

  for (const latestId of sessionIds) {
    const latestMap = sessionOneRepMax.get(latestId)!
    const latestDate = sessionDate.get(latestId)!
    for (const [exercise, latest] of latestMap) {
      const previous = previousSessionValue(sessionIds, latestId, sessionOneRepMax, exercise)
      if (previous === null) continue
      const delta = Number((latest - previous).toFixed(1))
      if (delta <= 0) continue
      const percent = previous !== 0 ? Math.round((delta / previous) * 100) : null
      improvements.push({
        exercise,
        previousOneRepMax: previous,
        latestOneRepMax: latest,
        deltaOneRepMax: delta,
        percent,
        latestDate,
      })
    }
  }

  return improvements
    .sort((a, b) => (b.deltaOneRepMax ?? 0) - (a.deltaOneRepMax ?? 0))
    .slice(0, limit)
}

function previousSessionValue(
  sessionIds: string[],
  latestId: string,
  sessionOneRepMax: Map<string, Map<string, number>>,
  exercise: string,
): number | null {
  const latestIndex = sessionIds.indexOf(latestId)
  for (let index = latestIndex + 1; index < sessionIds.length; index += 1) {
    const value = sessionOneRepMax.get(sessionIds[index])?.get(exercise)
    if (value !== undefined) return value
  }
  return null
}
