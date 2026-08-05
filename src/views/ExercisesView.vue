<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import DropdownSelect from '@/components/DropdownSelect.vue'
import {
  createExercise,
  deleteExercise,
  listExercises,
  setExerciseArchived,
  updateExercise,
} from '@/services/exercises'
import { useAuthStore } from '@/stores/auth'
import type { Exercise } from '@/types/training'
import { getErrorMessage } from '@/utils/errors'
import {
  EQUIPMENT_OPTIONS,
  exerciseSchema,
  MUSCLE_GROUPS,
  type ExerciseInput,
} from '@/validation/training'

const auth = useAuthStore()
const exercises = ref<Exercise[]>([])
const loading = ref(true)
const saving = ref(false)
const exerciseFilter = ref<'all' | 'archived'>('all')
const search = ref('')
const searchFocused = ref(false)
const searchInput = ref<{ blur: () => void } | null>(null)
const editing = ref<Exercise | null>(null)
const draggingExerciseId = ref<string | null>(null)
const swipeOffset = ref(0)
const confirmingDeleteId = ref<string | null>(null)
const editorOpen = ref(false)
const errorMessage = ref('')
const formErrors = ref<Record<string, string>>({})
const savedFormSnapshot = ref('')
type ExerciseForm = Omit<ExerciseInput, 'muscle_group' | 'equipment'> & {
  muscle_group: ExerciseInput['muscle_group'] | ''
  equipment: ExerciseInput['equipment'] | ''
}
const form = reactive<ExerciseForm>({
  name: '',
  muscle_group: '',
  equipment: '',
  notes: '',
})
const filterOptions = [
  { value: 'all', label: 'All exercises' },
  { value: 'archived', label: 'Archive' },
]
const muscleGroupOptions = MUSCLE_GROUPS.map((group) => ({ value: group, label: group }))
const equipmentOptions = EQUIPMENT_OPTIONS.map((option) => ({ value: option, label: option }))
const MAX_SWIPE_DISTANCE = 112
const SWIPE_TRIGGER_DISTANCE = 72
let swipeStartX = 0
let suppressCardClick = false

type SwipePointerEvent = {
  clientX: number
  pointerId: number
  currentTarget: unknown
}

function createExerciseFormSnapshot() {
  return JSON.stringify({
    name: form.name.trim(),
    muscle_group: form.muscle_group,
    equipment: form.equipment,
    notes: form.notes?.trim() ?? '',
  })
}

const exerciseFormDirty = computed(
  () => savedFormSnapshot.value !== '' && createExerciseFormSnapshot() !== savedFormSnapshot.value,
)
const exerciseFormReady = computed(() =>
  Boolean(form.name.trim() && form.muscle_group && form.equipment),
)
const canSubmitExercise = computed(() => {
  if (saving.value) return false
  return editing.value ? exerciseFormDirty.value : exerciseFormReady.value
})

const filteredExercises = computed(() => {
  const query = search.value.trim().toLowerCase()
  const visibleExercises = exercises.value.filter((exercise) =>
    exerciseFilter.value === 'archived' ? exercise.is_archived : !exercise.is_archived,
  )
  if (!query) return visibleExercises
  return visibleExercises.filter((exercise) =>
    [exercise.name, exercise.muscle_group, exercise.equipment].some((value) =>
      value.toLowerCase().includes(query),
    ),
  )
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    exercises.value = await listExercises(true)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to load exercises.')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    name: '',
    muscle_group: '',
    equipment: '',
    notes: '',
  })
  formErrors.value = {}
  savedFormSnapshot.value = createExerciseFormSnapshot()
  editorOpen.value = true
}

function openEdit(exercise: Exercise) {
  editing.value = exercise
  Object.assign(form, {
    name: exercise.name,
    muscle_group: exercise.muscle_group as ExerciseInput['muscle_group'],
    equipment: exercise.equipment as ExerciseInput['equipment'],
    notes: exercise.notes ?? '',
  })
  formErrors.value = {}
  savedFormSnapshot.value = createExerciseFormSnapshot()
  editorOpen.value = true
}

async function save() {
  if (!canSubmitExercise.value) return
  formErrors.value = {}
  errorMessage.value = ''
  const result = exerciseSchema.safeParse(form)
  if (!result.success) {
    formErrors.value = Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    )
    if (!form.muscle_group) formErrors.value.muscle_group = 'Choose a muscle group.'
    if (!form.equipment) formErrors.value.equipment = 'Choose equipment.'
    return
  }

  if (!auth.user) return
  saving.value = true
  try {
    if (editing.value) {
      await updateExercise(editing.value.id, result.data)
    } else {
      await createExercise(auth.user.id, result.data)
    }
    editorOpen.value = false
    await load()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to save the exercise.')
  } finally {
    saving.value = false
  }
}

async function toggleArchived(exercise: Exercise) {
  errorMessage.value = ''
  try {
    await setExerciseArchived(exercise.id, !exercise.is_archived)
    await load()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to update the exercise.')
  }
}

function cardOffset(id: string) {
  if (draggingExerciseId.value === id) return swipeOffset.value
  return 0
}

function startSwipe(id: string, event: SwipePointerEvent) {
  const target = event.currentTarget as { setPointerCapture?: (pointerId: number) => void }
  target.setPointerCapture?.(event.pointerId)
  draggingExerciseId.value = id
  swipeStartX = event.clientX
  swipeOffset.value = 0
  suppressCardClick = false
  confirmingDeleteId.value = null
}

function moveSwipe(event: SwipePointerEvent) {
  if (!draggingExerciseId.value) return
  const delta = event.clientX - swipeStartX
  if (Math.abs(delta) > 6) suppressCardClick = true
  swipeOffset.value = Math.min(MAX_SWIPE_DISTANCE, Math.max(-MAX_SWIPE_DISTANCE, delta))
}

function finishSwipe(exercise: Exercise) {
  if (!draggingExerciseId.value) return
  const shouldDelete = swipeOffset.value >= SWIPE_TRIGGER_DISTANCE
  const shouldArchive = swipeOffset.value <= -SWIPE_TRIGGER_DISTANCE
  draggingExerciseId.value = null
  swipeOffset.value = 0
  if (shouldDelete) confirmingDeleteId.value = exercise.id
  else if (shouldArchive) void toggleArchived(exercise)
}

function cancelSwipe() {
  draggingExerciseId.value = null
  swipeOffset.value = 0
}

async function deleteExerciseItem(exercise: Exercise) {
  errorMessage.value = ''
  try {
    await deleteExercise(exercise.id)
    confirmingDeleteId.value = null
    await load()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to delete the exercise.')
  }
}

const exerciseToDelete = computed(
  () => exercises.value.find((item) => item.id === confirmingDeleteId.value) ?? null,
)

function confirmDeleteExercise() {
  if (exerciseToDelete.value) void deleteExerciseItem(exerciseToDelete.value)
}

function openExerciseCard(exercise: Exercise) {
  if (suppressCardClick) {
    suppressCardClick = false
    return
  }
  openEdit(exercise)
}

function cancelSearch() {
  search.value = ''
  searchFocused.value = false
  searchInput.value?.blur()
}

function setExerciseFilter(value: string) {
  exerciseFilter.value = value as 'all' | 'archived'
}

function setMuscleGroup(value: string) {
  form.muscle_group = value as ExerciseInput['muscle_group']
  delete formErrors.value.muscle_group
}

function setEquipment(value: string) {
  form.equipment = value as ExerciseInput['equipment']
  delete formErrors.value.equipment
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-header page-header--actions">
      <div>
        <p class="eyebrow">Exercise library</p>
        <h1>Your movements</h1>
        <p>Create reusable exercises before adding them to a workout program.</p>
      </div>
      <button class="button button--primary" type="button" @click="openCreate">
        + Add exercise
      </button>
    </header>

    <section class="toolbar exercise-toolbar">
      <div class="exercise-search-row">
        <label :class="['search-field', { 'search-field--focused': searchFocused }]">
          <span class="sr-only">Search exercises</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            placeholder="Search"
            autocomplete="off"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
        </label>
        <button
          v-if="searchFocused || search"
          class="search-cancel"
          type="button"
          @mousedown.prevent
          @click="cancelSearch"
        >
          Cancel
        </button>
        <DropdownSelect
          :model-value="exerciseFilter"
          :options="filterOptions"
          label="Filter exercises"
          icon-only
          @update:model-value="setExerciseFilter"
        >
          <template #trigger>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </template>
        </DropdownSelect>
      </div>
    </section>

    <p v-if="errorMessage" class="alert alert--error" role="alert">{{ errorMessage }}</p>

    <div v-if="loading" class="empty-state">Loading your exercises…</div>
    <div v-else-if="filteredExercises.length === 0" class="empty-state">
      <span class="empty-state__icon">◇</span>
      <h2>
        {{
          search
            ? 'No matching exercises'
            : exerciseFilter === 'archived'
              ? 'Your archive is empty'
              : 'Build your exercise library'
        }}
      </h2>
      <p>
        {{
          search
            ? 'Try a different search.'
            : exerciseFilter === 'archived'
              ? 'Archived exercises will appear here.'
              : 'Start with a movement you perform regularly.'
        }}
      </p>
      <button
        v-if="!search && exerciseFilter === 'all'"
        class="button button--primary"
        type="button"
        @click="openCreate"
      >
        Add your first exercise
      </button>
    </div>

    <section v-else class="item-grid" aria-label="Exercises">
      <div
        v-for="exercise in filteredExercises"
        :key="exercise.id"
        :class="['swipe-card', { 'swipe-card--dragging': draggingExerciseId === exercise.id }]"
      >
        <div class="swipe-card__indicator swipe-card__indicator--delete" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" />
          </svg>
          <span>Delete</span>
        </div>
        <div
          :class="[
            'swipe-card__indicator swipe-card__indicator--archive',
            { 'swipe-card__indicator--restore': exercise.is_archived },
          ]"
          aria-hidden="true"
        >
          <svg v-if="exercise.is_archived" viewBox="0 0 24 24">
            <path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7" />
            <path d="M4 4v4.7h4.7" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="M5 8h14v11H5zM4 4h16v4H4zM9 12h6" />
          </svg>
          <span>{{ exercise.is_archived ? 'Restore' : 'Archive' }}</span>
        </div>

        <article
          :class="[
            'item-card item-card--clickable',
            { 'item-card--archived': exercise.is_archived },
          ]"
          :style="{ transform: 'translateX(' + cardOffset(exercise.id) + 'px)' }"
          role="button"
          tabindex="0"
          :aria-label="
            'Edit ' +
            exercise.name +
            '. Swipe left to delete, or swipe right to ' +
            (exercise.is_archived ? 'restore.' : 'archive.')
          "
          @click="openExerciseCard(exercise)"
          @keydown.enter.prevent="openEdit(exercise)"
          @keydown.space.prevent="openEdit(exercise)"
          @pointerdown="startSwipe(exercise.id, $event)"
          @pointermove="moveSwipe"
          @pointerup="finishSwipe(exercise)"
          @pointercancel="cancelSwipe"
          @dragstart.prevent
        >
          <div class="item-card__content">
            <div class="item-card__heading">
              <h2>{{ exercise.name }}</h2>
              <span class="item-card__badges">
                <span class="category-badge">{{ exercise.muscle_group }}</span>
                <span v-if="exercise.is_archived" class="archive-badge">Archived</span>
              </span>
            </div>
            <p class="item-card__meta">{{ exercise.equipment }}</p>
            <p v-if="exercise.notes" class="item-card__notes">{{ exercise.notes }}</p>
          </div>
        </article>
      </div>
    </section>

    <div v-if="editorOpen" class="modal-backdrop" @click.self="editorOpen = false">
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-editor-title"
      >
        <div class="modal__heading">
          <div>
            <p class="eyebrow">{{ editing ? 'Edit movement' : 'New movement' }}</p>
            <h2 id="exercise-editor-title">{{ editing ? editing.name : 'Add an exercise' }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Close" @click="editorOpen = false">
            ×
          </button>
        </div>

        <form class="form" novalidate @submit.prevent="save">
          <div class="field">
            <label for="exercise-name">Exercise name</label>
            <input id="exercise-name" v-model="form.name" type="text" autofocus />
            <p v-if="formErrors.name" class="field-error">{{ formErrors.name }}</p>
          </div>

          <div class="field-grid">
            <div class="field">
              <label for="muscle-group">Muscle group</label>
              <DropdownSelect
                input-id="muscle-group"
                :model-value="form.muscle_group"
                :options="muscleGroupOptions"
                placeholder="Select muscle group"
                label="Muscle group"
                @update:model-value="setMuscleGroup"
              />
              <p v-if="formErrors.muscle_group" class="field-error">
                {{ formErrors.muscle_group }}
              </p>
            </div>
            <div class="field">
              <label for="equipment">Equipment</label>
              <DropdownSelect
                input-id="equipment"
                :model-value="form.equipment"
                :options="equipmentOptions"
                placeholder="Select equipment"
                label="Equipment"
                @update:model-value="setEquipment"
              />
              <p v-if="formErrors.equipment" class="field-error">
                {{ formErrors.equipment }}
              </p>
            </div>
          </div>

          <div class="field">
            <label for="exercise-notes">Notes <span class="optional">Optional</span></label>
            <textarea id="exercise-notes" v-model="form.notes" rows="3"></textarea>
          </div>

          <div class="modal__actions">
            <button class="button button--secondary" type="button" @click="editorOpen = false">
              Cancel
            </button>
            <button class="button button--primary" type="submit" :disabled="!canSubmitExercise">
              {{ saving ? 'Saving…' : editing ? 'Save changes' : 'Add exercise' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div
      v-if="exerciseToDelete"
      class="modal-backdrop confirmation-backdrop"
      @click.self="confirmingDeleteId = null"
    >
      <section
        class="modal confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-exercise-title"
        aria-describedby="delete-exercise-description"
      >
        <div class="confirmation-dialog__icon confirmation-dialog__icon--danger" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" />
          </svg>
        </div>
        <h2 id="delete-exercise-title">Are you sure you want to delete this exercise?</h2>
        <p id="delete-exercise-description">
          <strong>{{ exerciseToDelete.name }}</strong> will be permanently removed. This cannot be
          undone.
        </p>
        <div class="modal__actions confirmation-dialog__actions">
          <button class="button button--secondary" type="button" @click="confirmingDeleteId = null">
            Cancel
          </button>
          <button class="button button--danger" type="button" @click="confirmDeleteExercise">
            Yes, delete
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
