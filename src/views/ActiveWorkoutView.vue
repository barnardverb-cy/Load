<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useWorkoutStore } from '@/stores/workout'
import type { WorkoutSessionSet } from '@/types/workout'
import { getErrorMessage } from '@/utils/errors'
import { formatDuration, workoutDurationSeconds } from '@/utils/workout'

type SetDraft = { reps: number | null; weight: number | null }

const route = useRoute()
const router = useRouter()
const store = useWorkoutStore()
const drafts = reactive<Record<string, SetDraft>>({})
const now = ref(Date.now())
const savingSetId = ref('')
const errorMessage = ref('')
const notes = ref('')
const notesSaved = ref(true)
const restRemaining = ref(0)
const restRunning = ref(false)
const currentExerciseIndex = ref(0)
const cancelDialogOpen = ref(false)
const cancelling = ref(false)
const finishDialogOpen = ref(false)
const finishing = ref(false)
let ticker: ReturnType<typeof globalThis.setInterval> | undefined

const sessionId = computed(() => String(route.params.id))
const elapsed = computed(() =>
  store.workout
    ? formatDuration(
        workoutDurationSeconds(store.workout.started_at, store.workout.completed_at, now.value),
      )
    : '0:00',
)
const currentExercise = computed(() => store.workout?.exercises[currentExerciseIndex.value] ?? null)
const currentSet = computed(
  () => currentExercise.value?.sets.find((set) => set.status === 'pending') ?? null,
)
const actionTimer = computed(() =>
  formatDuration(restRemaining.value || store.workout?.rest_between_exercises_seconds || 0),
)

function seedDrafts() {
  for (const set of store.sets) {
    drafts[set.id] = {
      reps: set.actual_reps ?? set.target_reps,
      weight: set.actual_weight ?? Number(set.target_weight),
    }
  }
  notes.value = store.workout?.notes ?? ''
}

async function load() {
  errorMessage.value = ''
  try {
    await store.load(sessionId.value)
    if (store.workout?.status === 'completed') {
      await router.replace(`/workouts/${sessionId.value}/summary`)
      return
    }
    if (store.workout?.status === 'cancelled') {
      await router.replace('/programs')
      return
    }
    if (!store.workout) return
    seedDrafts()
    const firstPendingExercise = store.workout.exercises.findIndex((exercise) =>
      exercise.sets.some((set) => set.status === 'pending'),
    )
    currentExerciseIndex.value = Math.max(0, firstPendingExercise)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to load this workout.')
  }
}

function startRestTimer(seconds: number) {
  restRemaining.value = seconds
  restRunning.value = seconds > 0
}

function advanceAfterResolvedExercise() {
  const exercise = currentExercise.value
  if (!exercise || exercise.sets.some((set) => set.status === 'pending')) return false
  const exercises = store.workout?.exercises ?? []
  const nextPendingIndex = exercises.findIndex(
    (item, index) =>
      index > currentExerciseIndex.value && item.sets.some((set) => set.status === 'pending'),
  )
  if (nextPendingIndex < 0) return false
  currentExerciseIndex.value = nextPendingIndex
  return true
}

function toggleRestTimer() {
  if (restRemaining.value > 0) {
    restRunning.value = !restRunning.value
    return
  }
  const restSeconds = store.workout?.rest_between_exercises_seconds ?? 0
  if (currentSet.value) startRestTimer(restSeconds)
}

async function completeSet(set: WorkoutSessionSet) {
  const draft = drafts[set.id]
  if (
    !draft ||
    draft.reps === null ||
    draft.weight === null ||
    draft.reps < 0 ||
    draft.weight < 0
  ) {
    errorMessage.value = 'Enter valid reps and weight before completing the set.'
    return
  }
  savingSetId.value = set.id
  errorMessage.value = ''
  try {
    await store.updateSet(set.id, {
      status: 'completed',
      actual_reps: Math.round(draft.reps),
      actual_weight: draft.weight,
    })
    if (advanceAfterResolvedExercise()) {
      startRestTimer(store.workout?.rest_between_exercises_seconds ?? 0)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to save this set.')
  } finally {
    savingSetId.value = ''
  }
}

async function skipSet(set: WorkoutSessionSet) {
  savingSetId.value = set.id
  errorMessage.value = ''
  try {
    await store.updateSet(set.id, { status: 'skipped', actual_reps: null, actual_weight: null })
    if (advanceAfterResolvedExercise()) {
      startRestTimer(store.workout?.rest_between_exercises_seconds ?? 0)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to skip this set.')
  } finally {
    savingSetId.value = ''
  }
}

async function saveNotes() {
  if (notes.value === (store.workout?.notes ?? '')) return
  try {
    await store.saveNotes(notes.value)
    notesSaved.value = true
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to save the workout notes.')
  }
}

async function finish() {
  if (!store.canFinish) return
  finishing.value = true
  try {
    await saveNotes()
    await store.finish()
    finishDialogOpen.value = false
    await router.replace(`/workouts/${sessionId.value}/summary`)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to finish this workout.')
    finishDialogOpen.value = false
  } finally {
    finishing.value = false
  }
}

async function cancel() {
  cancelling.value = true
  try {
    await store.cancel()
    cancelDialogOpen.value = false
    await router.replace('/programs')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to cancel this workout.')
    cancelDialogOpen.value = false
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  void load()
  ticker = globalThis.setInterval(() => {
    now.value = Date.now()
    if (restRunning.value && restRemaining.value > 0) restRemaining.value -= 1
    if (restRemaining.value <= 0) restRunning.value = false
  }, 1000)
})

onBeforeUnmount(() => {
  if (ticker) globalThis.clearInterval(ticker)
  store.clear()
})
</script>

<template>
  <div class="page page--workout">
    <div v-if="store.loading" class="empty-state">Loading workout…</div>
    <template v-else-if="store.workout">
      <header class="workout-header">
        <div>
          <p class="eyebrow">Workout in progress</p>
          <h1>{{ store.workout.program_name }}</h1>
          <p>{{ elapsed }} elapsed</p>
        </div>
      </header>

      <div
        class="workout-progress"
        role="progressbar"
        aria-label="Workout progress"
        :aria-valuenow="store.resolvedSetCount"
        aria-valuemin="0"
        :aria-valuemax="store.sets.length"
      >
        <span class="sr-only">{{ store.resolvedSetCount }} of {{ store.sets.length }} sets</span>
        <span
          v-for="set in store.sets"
          :key="set.id"
          :class="[
            'workout-progress__segment',
            { 'workout-progress__segment--resolved': set.status !== 'pending' },
            { 'workout-progress__segment--current': set.id === currentSet?.id },
          ]"
        ></span>
      </div>

      <p v-if="errorMessage" class="alert alert--error" role="alert">{{ errorMessage }}</p>

      <section v-if="currentExercise" class="workout-exercises">
        <article :key="currentExercise.id" class="workout-exercise">
          <header>
            <span>{{ String(currentExercise.position).padStart(2, '0') }}</span>
            <div>
              <h2>{{ currentExercise.exercise_name }}</h2>
              <p>{{ currentExercise.muscle_group }} · {{ currentExercise.equipment }}</p>
            </div>
          </header>

          <div class="workout-set-list">
            <div
              v-for="set in currentExercise.sets"
              :key="set.id"
              :class="[
                'workout-set',
                'workout-set--' + set.status,
                { 'workout-set--current': set.id === currentSet?.id },
                {
                  'workout-set--upcoming': set.status === 'pending' && set.id !== currentSet?.id,
                },
              ]"
            >
              <div class="workout-set__target">
                <strong>Set {{ set.position }}</strong>
                <span>{{ set.target_reps }} reps × {{ Number(set.target_weight) }} kg</span>
              </div>

              <template v-if="set.id === currentSet?.id && drafts[set.id]">
                <label
                  >Reps<input
                    v-model.number="drafts[set.id]!.reps"
                    type="number"
                    min="0"
                    inputmode="numeric"
                    placeholder="0"
                /></label>
                <label
                  >Weight<input
                    v-model.number="drafts[set.id]!.weight"
                    type="number"
                    min="0"
                    step="0.25"
                    inputmode="decimal"
                  /><small>kg</small></label
                >
              </template>
              <template v-else-if="set.status !== 'pending'">
                <div class="workout-set__result">
                  <strong>{{
                    set.status === 'completed'
                      ? set.actual_reps + ' reps × ' + Number(set.actual_weight) + ' kg'
                      : 'Skipped'
                  }}</strong>
                  <span>{{ set.status === 'completed' ? 'Completed' : 'Not performed' }}</span>
                </div>
                <span class="workout-set__status" :aria-label="set.status">
                  <svg v-if="set.status === 'completed'" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m5 12 4.5 4.5L19 7" />
                  </svg>
                  <svg v-else aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m7 7 10 10M17 7 7 17" />
                  </svg>
                </span>
              </template>
              <template v-else>
                <div class="workout-set__preview">
                  <strong>{{ drafts[set.id]?.reps }}</strong
                  ><span>Reps</span>
                </div>
                <div class="workout-set__preview">
                  <strong>{{ drafts[set.id]?.weight }}</strong
                  ><span>kg</span>
                </div>
              </template>
            </div>
          </div>
        </article>
      </section>

      <section class="workout-notes">
        <label for="workout-notes">Workout notes <span>Optional</span></label>
        <textarea
          id="workout-notes"
          v-model="notes"
          rows="3"
          placeholder="How did the session feel?"
          @input="notesSaved = false"
          @blur="saveNotes"
        ></textarea>
        <small>{{ notesSaved ? 'Saved' : 'Saving when you leave this field…' }}</small>
      </section>

      <button class="cancel-workout-action" type="button" @click="cancelDialogOpen = true">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>
        <span>Cancel workout</span>
      </button>

      <footer v-if="!currentSet" class="workout-finish-bar">
        <div>
          <strong>{{ store.completedSetCount }} completed</strong
          ><span v-if="!store.canFinish">Complete or skip every set to finish.</span>
        </div>
        <button
          class="button button--primary"
          type="button"
          :disabled="!store.canFinish"
          @click="finishDialogOpen = true"
        >
          Finish workout
        </button>
      </footer>

      <div v-if="currentSet" class="workout-action-dock" aria-label="Current set controls">
        <button
          class="set-control set-control--skip"
          type="button"
          aria-label="Skip current set"
          :disabled="Boolean(savingSetId)"
          @click="skipSet(currentSet)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>
        </button>
        <button
          class="set-control set-control--timer"
          type="button"
          :aria-label="restRunning ? 'Pause rest timer' : 'Start or resume rest timer'"
          @click="toggleRestTimer"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="13" r="7" />
            <path d="M12 10v4l2.5 1.5M9 3h6" />
          </svg>
          <strong>{{ actionTimer }}</strong>
        </button>
        <button
          class="set-control set-control--done"
          type="button"
          aria-label="Complete current set"
          :disabled="Boolean(savingSetId)"
          @click="completeSet(currentSet)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" /></svg>
          <span>Done</span>
        </button>
      </div>
    </template>
    <p v-else-if="errorMessage" class="alert alert--error" role="alert">{{ errorMessage }}</p>

    <div
      v-if="cancelDialogOpen"
      class="modal-backdrop confirmation-backdrop"
      @click.self="cancelDialogOpen = false"
    >
      <section
        class="modal confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-workout-title"
        aria-describedby="cancel-workout-description"
      >
        <div class="confirmation-dialog__icon" aria-hidden="true">!</div>
        <h2 id="cancel-workout-title">Cancel this workout?</h2>
        <p id="cancel-workout-description">Logged sets will remain in your history.</p>
        <div class="modal__actions confirmation-dialog__actions">
          <button
            class="button button--secondary"
            type="button"
            :disabled="cancelling"
            autofocus
            @click="cancelDialogOpen = false"
          >
            Cancel
          </button>
          <button
            class="button button--danger"
            type="button"
            :disabled="cancelling"
            @click="cancel"
          >
            {{ cancelling ? 'Cancelling…' : 'OK' }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="finishDialogOpen"
      class="modal-backdrop confirmation-backdrop"
      @click.self="finishDialogOpen = false"
    >
      <section
        class="modal confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="finish-workout-title"
        aria-describedby="finish-workout-description"
      >
        <div class="confirmation-dialog__icon confirmation-dialog__icon--finish" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" /></svg>
        </div>
        <h2 id="finish-workout-title">Finish this workout?</h2>
        <p id="finish-workout-description">
          Your completed sets will be saved. You won&rsquo;t be able to edit this workout afterward.
        </p>
        <div class="modal__actions confirmation-dialog__actions">
          <button
            class="button button--secondary"
            type="button"
            :disabled="finishing"
            autofocus
            @click="finishDialogOpen = false"
          >
            Keep working
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="finishing"
            @click="finish"
          >
            {{ finishing ? 'Finishing…' : 'Finish workout' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
