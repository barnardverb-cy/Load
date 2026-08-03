<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DropdownSelect from '@/components/DropdownSelect.vue'
import { listExercises } from '@/services/exercises'
import { getTemplate, saveTemplateExercises, updateTemplate } from '@/services/templates'
import type {
  EditableTemplateExercise,
  EditableTemplateSet,
  Exercise,
  WorkoutTemplate,
} from '@/types/training'
import { moveItem } from '@/utils/array'
import { getErrorMessage } from '@/utils/errors'
import {
  cloneExercisePrescription,
  createExercisePrescriptionSnapshot,
  createProgramDetailsSnapshot,
} from '@/utils/program'
import { templateExerciseSchema, workoutTemplateSchema } from '@/validation/training'

const route = useRoute()
const router = useRouter()
const templateId = String(route.params.id)
const template = ref<WorkoutTemplate | null>(null)
const exerciseLibrary = ref<Exercise[]>([])
const configuredExercises = ref<EditableTemplateExercise[]>([])
const selectedExerciseId = ref('')
const loading = ref(true)
const savingDetails = ref(false)
const savingExercises = ref(false)
const toastMessage = ref('')
let toastTimer: ReturnType<typeof globalThis.setTimeout> | undefined
const errorMessage = ref('')
const detailsEditing = ref(false)
const exercisesEditing = ref(false)
const savedDetailsSnapshot = ref('')
const savedExercisesSnapshot = ref('')
const savedExercises = ref<EditableTemplateExercise[]>([])
const form = reactive({ name: '', description: '' })

const availableExercises = computed(() => {
  const configuredIds = new Set(configuredExercises.value.map((item) => item.exercise_id))
  return exerciseLibrary.value.filter((exercise) => !configuredIds.has(exercise.id))
})
const exercisePickerOptions = computed(() =>
  availableExercises.value.map((exercise) => ({
    value: exercise.id,
    label: exercise.name + ' · ' + exercise.muscle_group,
  })),
)

const totalSets = computed(() =>
  configuredExercises.value.reduce((total, item) => total + item.sets.length, 0),
)

const detailsDirty = computed(
  () =>
    savedDetailsSnapshot.value !== '' &&
    createProgramDetailsSnapshot(form.name, form.description) !== savedDetailsSnapshot.value,
)
const exercisesDirty = computed(
  () =>
    savedExercisesSnapshot.value !== '' &&
    createExercisePrescriptionSnapshot(configuredExercises.value) !== savedExercisesSnapshot.value,
)

function createDefaultSet(source?: EditableTemplateSet): EditableTemplateSet {
  return {
    min_reps: source?.min_reps ?? 10,
    max_reps: source?.max_reps ?? 15,
    starting_weight: source?.starting_weight ?? 0,
    weight_increment: source?.weight_increment ?? 2.5,
    rest_seconds: source?.rest_seconds ?? 90,
    progression_type: 'double_progression',
  }
}

function showToast(message: string) {
  if (toastTimer) globalThis.clearTimeout(toastTimer)
  toastMessage.value = message
  toastTimer = globalThis.setTimeout(() => {
    toastMessage.value = ''
    toastTimer = undefined
  }, 3000)
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [bundle, exercises] = await Promise.all([getTemplate(templateId), listExercises()])
    template.value = bundle.template
    exerciseLibrary.value = exercises
    form.name = bundle.template.name
    form.description = bundle.template.description ?? ''
    configuredExercises.value = bundle.exercises.map((item) => ({
      id: item.id,
      exercise_id: item.exercise_id,
      exercise: item.exercise,
      sets: item.sets.map((set) => ({
        id: set.id,
        min_reps: set.min_reps,
        max_reps: set.max_reps,
        starting_weight: Number(set.starting_weight),
        weight_increment: Number(set.weight_increment),
        rest_seconds: set.rest_seconds,
        progression_type: set.progression_type,
      })),
    }))
    savedDetailsSnapshot.value = createProgramDetailsSnapshot(form.name, form.description)
    savedExercisesSnapshot.value = createExercisePrescriptionSnapshot(configuredExercises.value)
    savedExercises.value = cloneExercisePrescription(configuredExercises.value)
    detailsEditing.value = false
    exercisesEditing.value = false
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to load this program.')
  } finally {
    loading.value = false
  }
}

function addExercise() {
  const exercise = exerciseLibrary.value.find((item) => item.id === selectedExerciseId.value)
  if (!exercise) return

  configuredExercises.value.push({
    exercise_id: exercise.id,
    exercise,
    sets: [createDefaultSet()],
  })
  selectedExerciseId.value = ''
}

function removeExercise(index: number) {
  configuredExercises.value.splice(index, 1)
}

function moveExercise(from: number, to: number) {
  configuredExercises.value = moveItem(configuredExercises.value, from, to)
}

function addSet(exerciseIndex: number) {
  const exercise = configuredExercises.value[exerciseIndex]
  if (!exercise || exercise.sets.length >= 20) return
  exercise.sets.push(createDefaultSet(exercise.sets.at(-1)))
}

function removeSet(exerciseIndex: number, setIndex: number) {
  const exercise = configuredExercises.value[exerciseIndex]
  if (!exercise || exercise.sets.length <= 1) return
  exercise.sets.splice(setIndex, 1)
}

function moveSet(exerciseIndex: number, from: number, to: number) {
  const exercise = configuredExercises.value[exerciseIndex]
  if (!exercise) return
  exercise.sets = moveItem(exercise.sets, from, to)
}

function beginDetailsEditing() {
  detailsEditing.value = true
}

function cancelDetailsEditing() {
  if (!template.value) return
  form.name = template.value.name
  form.description = template.value.description ?? ''
  detailsEditing.value = false
}

function beginExercisesEditing() {
  exercisesEditing.value = true
}

function cancelExercisesEditing() {
  configuredExercises.value = cloneExercisePrescription(savedExercises.value)
  selectedExerciseId.value = ''
  exercisesEditing.value = false
}

async function saveDetails() {
  if (!detailsDirty.value || savingDetails.value) return
  errorMessage.value = ''

  const templateResult = workoutTemplateSchema.safeParse(form)
  if (!templateResult.success) {
    errorMessage.value = templateResult.error.issues[0]?.message ?? 'Check the program details.'
    return
  }

  savingDetails.value = true
  try {
    template.value = await updateTemplate(templateId, templateResult.data)
    savedDetailsSnapshot.value = createProgramDetailsSnapshot(form.name, form.description)
    detailsEditing.value = false
    showToast('Program details saved.')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to save the program details.')
  } finally {
    savingDetails.value = false
  }
}

async function saveExercises() {
  if (!exercisesDirty.value || savingExercises.value) return
  errorMessage.value = ''

  for (const [index, item] of configuredExercises.value.entries()) {
    const result = templateExerciseSchema.safeParse(item)
    if (!result.success) {
      const issue = result.error.issues[0]
      const setNumber = typeof issue?.path[1] === 'number' ? `, set ${issue.path[1] + 1}` : ''
      errorMessage.value = `${item.exercise.name}${setNumber}: ${issue?.message ?? `check exercise ${index + 1}`}`
      return
    }
  }

  savingExercises.value = true
  try {
    await saveTemplateExercises(templateId, configuredExercises.value)
    savedExercisesSnapshot.value = createExercisePrescriptionSnapshot(configuredExercises.value)
    savedExercises.value = cloneExercisePrescription(configuredExercises.value)
    exercisesEditing.value = false
    showToast('Exercise prescription saved.')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to save the exercise prescription.')
  } finally {
    savingExercises.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => {
  if (toastTimer) globalThis.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="page page--editor">
    <div v-if="loading" class="empty-state">Loading program&hellip;</div>

    <template v-else-if="template">
      <Transition name="toast">
        <div v-if="toastMessage" class="toast-notification" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {{ toastMessage }}
        </div>
      </Transition>

      <header class="editor-header">
        <div>
          <button class="back-link" type="button" @click="router.push('/programs')">
            &larr; Programs
          </button>
          <p class="eyebrow">Program builder</p>
          <h1>{{ form.name || 'Untitled workout' }}</h1>
        </div>
      </header>

      <p v-if="errorMessage" class="alert alert--error" role="alert">{{ errorMessage }}</p>

      <section class="panel editable-section editor-details">
        <div class="editable-section-heading">
          <div>
            <p class="eyebrow">Program details</p>
            <h2>Name and description</h2>
          </div>
          <div class="editable-section-actions">
            <button
              v-if="!detailsEditing"
              class="button button--secondary edit-details-button"
              type="button"
              :disabled="exercisesEditing"
              @click="beginDetailsEditing"
            >
              <span aria-hidden="true">✎</span>
              Edit details
            </button>
            <template v-else>
              <span class="save-state" :class="{ 'save-state--dirty': detailsDirty }">
                {{ detailsDirty ? 'Unsaved changes' : 'No changes' }}
              </span>
              <button class="button button--secondary" type="button" @click="cancelDetailsEditing">
                Cancel
              </button>
              <button
                class="button button--primary"
                type="button"
                :disabled="savingDetails || !detailsDirty"
                @click="saveDetails"
              >
                {{ savingDetails ? 'Saving…' : 'Save changes' }}
              </button>
            </template>
          </div>
        </div>

        <div class="editor-details__content">
          <div v-if="detailsEditing" class="details-editor">
            <div class="field-grid">
              <div class="field">
                <label for="editor-name">Program name</label>
                <input id="editor-name" v-model="form.name" type="text" maxlength="100" />
              </div>
              <div class="field">
                <label for="editor-description">
                  Description <span class="optional">Optional</span>
                </label>
                <input
                  id="editor-description"
                  v-model="form.description"
                  type="text"
                  maxlength="500"
                />
              </div>
            </div>
          </div>

          <dl v-else class="details-summary">
            <div>
              <dt>Program name</dt>
              <dd>{{ form.name }}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{{ form.description || 'No description' }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel editable-section builder-section">
        <div class="section-heading editable-section-heading">
          <div>
            <p class="eyebrow">Exercise order</p>
            <h2>Workout prescription</h2>
          </div>
          <div class="editable-section-actions">
            <span class="count-badge">
              {{ configuredExercises.length }} exercises &middot; {{ totalSets }} sets
            </span>
            <button
              v-if="!exercisesEditing"
              class="button button--secondary edit-details-button"
              type="button"
              :disabled="detailsEditing"
              @click="beginExercisesEditing"
            >
              <span aria-hidden="true">✎</span>
              Edit details
            </button>
            <template v-else>
              <span class="save-state" :class="{ 'save-state--dirty': exercisesDirty }">
                {{ exercisesDirty ? 'Unsaved changes' : 'No changes' }}
              </span>
              <button
                class="button button--secondary"
                type="button"
                @click="cancelExercisesEditing"
              >
                Cancel
              </button>
              <button
                class="button button--primary"
                type="button"
                :disabled="savingExercises || !exercisesDirty"
                @click="saveExercises"
              >
                {{ savingExercises ? 'Saving…' : 'Save changes' }}
              </button>
            </template>
          </div>
        </div>

        <div v-if="exercisesEditing" class="add-exercise-row">
          <DropdownSelect
            v-model="selectedExerciseId"
            :options="exercisePickerOptions"
            placeholder="Choose an exercise…"
            label="Choose an exercise"
          />
          <button
            class="button button--secondary"
            type="button"
            :disabled="!selectedExerciseId"
            @click="addExercise"
          >
            Add to workout
          </button>
          <RouterLink v-if="exerciseLibrary.length === 0" class="text-link" to="/exercises">
            Create an exercise first
          </RouterLink>
        </div>

        <div v-if="configuredExercises.length === 0" class="empty-state empty-state--compact">
          <h2>No exercises yet</h2>
          <p>
            {{
              exercisesEditing
                ? 'Add exercises from your library to configure this workout.'
                : 'Select Edit exercises to build this workout.'
            }}
          </p>
        </div>

        <div v-else class="prescription-list">
          <article
            v-for="(item, index) in configuredExercises"
            :key="item.id ?? item.exercise_id"
            class="prescription-card"
          >
            <div class="prescription-card__order">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <div v-if="exercisesEditing" class="order-buttons">
                <button
                  type="button"
                  :disabled="index === 0"
                  :aria-label="`Move ${item.exercise.name} up`"
                  @click="moveExercise(index, index - 1)"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  :disabled="index === configuredExercises.length - 1"
                  :aria-label="`Move ${item.exercise.name} down`"
                  @click="moveExercise(index, index + 1)"
                >
                  &darr;
                </button>
              </div>
            </div>

            <div class="prescription-card__body">
              <div class="prescription-card__heading">
                <div>
                  <h3>{{ item.exercise.name }}</h3>
                  <p>{{ item.exercise.muscle_group }} &middot; {{ item.exercise.equipment }}</p>
                </div>
                <button
                  v-if="exercisesEditing"
                  class="text-button text-button--danger"
                  type="button"
                  @click="removeExercise(index)"
                >
                  Remove exercise
                </button>
              </div>

              <div class="set-prescriptions">
                <div v-for="(set, setIndex) in item.sets" :key="set.id ?? setIndex" class="set-row">
                  <div class="set-row__number">
                    <strong>Set {{ setIndex + 1 }}</strong>
                    <div v-if="exercisesEditing" class="set-order-buttons">
                      <button
                        type="button"
                        :disabled="setIndex === 0"
                        :aria-label="`Move set ${setIndex + 1} up`"
                        @click="moveSet(index, setIndex, setIndex - 1)"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        :disabled="setIndex === item.sets.length - 1"
                        :aria-label="`Move set ${setIndex + 1} down`"
                        @click="moveSet(index, setIndex, setIndex + 1)"
                      >
                        &darr;
                      </button>
                    </div>
                  </div>

                  <div class="field field--compact">
                    <label :for="`min-reps-${index}-${setIndex}`">Min reps</label>
                    <input
                      :id="`min-reps-${index}-${setIndex}`"
                      v-model.number="set.min_reps"
                      type="number"
                      :disabled="!exercisesEditing"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="field field--compact">
                    <label :for="`max-reps-${index}-${setIndex}`">Max reps</label>
                    <input
                      :id="`max-reps-${index}-${setIndex}`"
                      v-model.number="set.max_reps"
                      type="number"
                      :disabled="!exercisesEditing"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div class="field field--compact">
                    <label :for="`weight-${index}-${setIndex}`">Weight</label>
                    <div class="input-suffix">
                      <input
                        :id="`weight-${index}-${setIndex}`"
                        v-model.number="set.starting_weight"
                        type="number"
                        :disabled="!exercisesEditing"
                        min="0"
                        max="10000"
                        step="0.25"
                      />
                      <span>kg</span>
                    </div>
                  </div>
                  <div class="field field--compact">
                    <label :for="`increment-${index}-${setIndex}`">Increment</label>
                    <div class="input-suffix">
                      <input
                        :id="`increment-${index}-${setIndex}`"
                        v-model.number="set.weight_increment"
                        type="number"
                        :disabled="!exercisesEditing"
                        min="0.01"
                        max="1000"
                        step="0.25"
                      />
                      <span>kg</span>
                    </div>
                  </div>
                  <button
                    v-if="exercisesEditing"
                    class="icon-button icon-button--danger"
                    type="button"
                    :disabled="item.sets.length === 1"
                    :aria-label="`Remove set ${setIndex + 1}`"
                    @click="removeSet(index, setIndex)"
                  >
                    &times;
                  </button>

                  <div class="set-row__preview">
                    {{ set.min_reps }}&ndash;{{ set.max_reps }} reps @ {{ set.starting_weight }} kg
                    &middot; add {{ set.weight_increment }} kg after reaching the top target
                  </div>
                </div>

                <button
                  v-if="exercisesEditing"
                  class="add-set-button"
                  type="button"
                  :disabled="item.sets.length >= 20"
                  @click="addSet(index)"
                >
                  + Add set
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>

    <div v-else class="empty-state">
      <h2>Program unavailable</h2>
      <p>{{ errorMessage || 'This program could not be found.' }}</p>
      <RouterLink class="button button--secondary" to="/programs">Back to programs</RouterLink>
    </div>
  </div>
</template>
