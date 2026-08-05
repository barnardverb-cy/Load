<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import DropdownSelect from '@/components/DropdownSelect.vue'
import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  listTemplates,
  setTemplateArchived,
} from '@/services/templates'
import { getActiveWorkout, startWorkout } from '@/services/workouts'
import { useAuthStore } from '@/stores/auth'
import type { TemplateSummary } from '@/types/training'
import type { WorkoutSession } from '@/types/workout'
import { getErrorMessage } from '@/utils/errors'
import { workoutTemplateSchema } from '@/validation/training'

const auth = useAuthStore()
const router = useRouter()
const templates = ref<TemplateSummary[]>([])
const loading = ref(true)
const saving = ref(false)
const programFilter = ref<'all' | 'archived'>('all')
const search = ref('')
const searchFocused = ref(false)
const searchInput = ref<{ blur: () => void } | null>(null)
const creatorOpen = ref(false)
const errorMessage = ref('')
const formError = ref('')
const form = reactive({ name: '', description: '' })
const activeWorkout = ref<WorkoutSession | null>(null)
const startingId = ref('')
const restPickerOpen = ref(false)
const pendingStartTemplate = ref<TemplateSummary | null>(null)
const restMinutes = ref(1)
const restSeconds = ref(30)
type TimeWheelElement = {
  children: { item: (index: number) => unknown }
  scrollTop: number
}
type WheelScrollEvent = { currentTarget: unknown }
const minuteWheel = ref<TimeWheelElement | null>(null)
const secondWheel = ref<TimeWheelElement | null>(null)
const timeOptions = Array.from({ length: 60 }, (_, value) => value)
const draggingProgramId = ref<string | null>(null)
const programSwipeOffset = ref(0)
const confirmingDeleteId = ref<string | null>(null)
const programFilterOptions = [
  { value: 'all', label: 'All programs' },
  { value: 'archived', label: 'Archive' },
]
const filteredPrograms = computed(() => {
  const query = search.value.trim().toLowerCase()
  const visiblePrograms = templates.value.filter((template) =>
    programFilter.value === 'archived' ? template.is_archived : !template.is_archived,
  )
  if (!query) return visiblePrograms
  return visiblePrograms.filter((template) =>
    [template.name, template.description ?? ''].some((value) =>
      value.toLowerCase().includes(query),
    ),
  )
})
const MAX_SWIPE_DISTANCE = 112
const SWIPE_TRIGGER_DISTANCE = 72
let programSwipeStartX = 0
let suppressProgramClick = false

type SwipePointerEvent = {
  clientX: number
  pointerId: number
  currentTarget: unknown
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [programs, active] = await Promise.all([listTemplates(true), getActiveWorkout()])
    templates.value = programs
    activeWorkout.value = active
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to load programs.')
  } finally {
    loading.value = false
  }
}

function centerWheel(element: TimeWheelElement | null, value: number) {
  const option = element?.children.item(value) as {
    scrollIntoView: (options: { block: string }) => void
  } | null
  option?.scrollIntoView({ block: 'center' })
}

function selectRestMinute(value: number) {
  restMinutes.value = value
  centerWheel(minuteWheel.value, value)
}

function selectRestSecond(value: number) {
  restSeconds.value = value
  centerWheel(secondWheel.value, value)
}

function updateRestFromScroll(unit: 'minutes' | 'seconds', event: WheelScrollEvent) {
  const wheel = event.currentTarget as { scrollTop: number }
  const value = Math.max(0, Math.min(59, Math.round(wheel.scrollTop / 48)))
  if (unit === 'minutes') restMinutes.value = value
  else restSeconds.value = value
}

function start(template: TemplateSummary) {
  if (activeWorkout.value) {
    void router.push(`/workouts/${activeWorkout.value.id}`)
    return
  }
  pendingStartTemplate.value = template
  restMinutes.value = 1
  restSeconds.value = 30
  restPickerOpen.value = true
  void nextTick(() => {
    centerWheel(minuteWheel.value, restMinutes.value)
    centerWheel(secondWheel.value, restSeconds.value)
  })
}

function closeRestPicker() {
  if (startingId.value) return
  restPickerOpen.value = false
  pendingStartTemplate.value = null
}

async function confirmStart() {
  const template = pendingStartTemplate.value
  if (!template) return
  errorMessage.value = ''
  startingId.value = template.id
  try {
    const restBetweenExercises = restMinutes.value * 60 + restSeconds.value
    const sessionId = await startWorkout(template.id, restBetweenExercises)
    restPickerOpen.value = false
    await router.push(`/workouts/${sessionId}`)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to start the workout.')
  } finally {
    startingId.value = ''
  }
}

function openCreate() {
  Object.assign(form, { name: '', description: '' })
  formError.value = ''
  creatorOpen.value = true
}

async function create() {
  formError.value = ''
  const result = workoutTemplateSchema.safeParse(form)
  if (!result.success) {
    formError.value = result.error.issues[0]?.message ?? 'Check the program details.'
    return
  }
  if (!auth.user) return

  saving.value = true
  try {
    const template = await createTemplate(auth.user.id, result.data)
    creatorOpen.value = false
    await router.push(`/programs/${template.id}`)
  } catch (error) {
    formError.value = getErrorMessage(error, 'Unable to create the program.')
  } finally {
    saving.value = false
  }
}

async function toggleArchived(template: TemplateSummary) {
  try {
    await setTemplateArchived(template.id, !template.is_archived)
    await load()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to update the program.')
  }
}

function programCardOffset(id: string) {
  return draggingProgramId.value === id ? programSwipeOffset.value : 0
}

function startProgramSwipe(id: string, event: SwipePointerEvent) {
  const target = event.currentTarget as { setPointerCapture?: (pointerId: number) => void }
  target.setPointerCapture?.(event.pointerId)
  draggingProgramId.value = id
  programSwipeStartX = event.clientX
  programSwipeOffset.value = 0
  suppressProgramClick = false
  confirmingDeleteId.value = null
}

function moveProgramSwipe(event: SwipePointerEvent) {
  if (!draggingProgramId.value) return
  const delta = event.clientX - programSwipeStartX
  if (Math.abs(delta) > 6) suppressProgramClick = true
  programSwipeOffset.value = Math.min(MAX_SWIPE_DISTANCE, Math.max(-MAX_SWIPE_DISTANCE, delta))
}

function finishProgramSwipe(template: TemplateSummary) {
  if (!draggingProgramId.value) return
  const shouldArchive = programSwipeOffset.value >= SWIPE_TRIGGER_DISTANCE
  const shouldDelete = programSwipeOffset.value <= -SWIPE_TRIGGER_DISTANCE
  draggingProgramId.value = null
  programSwipeOffset.value = 0
  if (shouldArchive) void toggleArchived(template)
  else if (shouldDelete) confirmingDeleteId.value = template.id
}

function cancelProgramSwipe() {
  draggingProgramId.value = null
  programSwipeOffset.value = 0
}

async function deleteTemplateItem(template: TemplateSummary) {
  errorMessage.value = ''
  try {
    await deleteTemplate(template.id)
    confirmingDeleteId.value = null
    await load()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to delete the program.')
  }
}

function openProgramCard(template: TemplateSummary) {
  if (suppressProgramClick) {
    suppressProgramClick = false
    return
  }
  void router.push('/programs/' + template.id)
}

async function duplicate(template: TemplateSummary) {
  if (!auth.user) return
  errorMessage.value = ''
  try {
    const copy = await duplicateTemplate(template, auth.user.id)
    await router.push(`/programs/${copy.id}`)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to duplicate the program.')
  }
}

function setProgramFilter(value: string) {
  programFilter.value = value as 'all' | 'archived'
}

function cancelSearch() {
  search.value = ''
  searchFocused.value = false
  searchInput.value?.blur()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-header page-header--actions">
      <div>
        <p class="eyebrow">Workout programs</p>
        <h1>Your programs</h1>
        <p>Combine exercises into repeatable training days with clear targets.</p>
      </div>
      <button class="button button--primary" type="button" @click="openCreate">
        + New program
      </button>
    </header>

    <section class="toolbar exercise-toolbar" aria-label="Search and filter programs">
      <div class="exercise-search-row">
        <label :class="['search-field', { 'search-field--focused': searchFocused }]">
          <span class="sr-only">Search programs</span>
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
          :model-value="programFilter"
          :options="programFilterOptions"
          label="Filter programs"
          icon-only
          @update:model-value="setProgramFilter"
        >
          <template #trigger>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </template>
        </DropdownSelect>
      </div>
    </section>

    <RouterLink
      v-if="activeWorkout"
      class="active-workout-banner"
      :to="`/workouts/${activeWorkout.id}`"
    >
      <span
        ><strong>Workout in progress</strong><small>{{ activeWorkout.program_name }}</small></span
      >
      <span>Resume workout →</span>
    </RouterLink>

    <p v-if="errorMessage" class="alert alert--error" role="alert">{{ errorMessage }}</p>

    <div v-if="loading" class="empty-state">Loading your programs…</div>
    <div v-else-if="filteredPrograms.length === 0" class="empty-state">
      <span class="empty-state__icon">☷</span>
      <h2>
        {{
          search
            ? 'No matching programs'
            : programFilter === 'archived'
              ? 'Your archive is empty'
              : 'Create your first workout'
        }}
      </h2>
      <p>
        {{
          search
            ? 'Try a different search.'
            : programFilter === 'archived'
              ? 'Archived programs will appear here.'
              : 'Start with something familiar, such as Leg Day or Upper Body.'
        }}
      </p>
      <button
        v-if="!search && programFilter === 'all'"
        class="button button--primary"
        type="button"
        @click="openCreate"
      >
        Create program
      </button>
    </div>

    <section v-else class="template-list" aria-label="Workout programs">
      <div
        v-for="template in filteredPrograms"
        :key="template.id"
        :class="['swipe-card', { 'swipe-card--dragging': draggingProgramId === template.id }]"
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
            { 'swipe-card__indicator--restore': template.is_archived },
          ]"
          aria-hidden="true"
        >
          <svg v-if="template.is_archived" viewBox="0 0 24 24">
            <path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7" />
            <path d="M4 4v4.7h4.7" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="M5 8h14v11H5zM4 4h16v4H4zM9 12h6" />
          </svg>
          <span>{{ template.is_archived ? 'Restore' : 'Archive' }}</span>
        </div>

        <article
          :class="[
            'template-row template-row--clickable',
            { 'item-card--archived': template.is_archived },
          ]"
          :style="{ transform: 'translateX(' + programCardOffset(template.id) + 'px)' }"
          role="button"
          tabindex="0"
          :aria-label="
            'Edit ' +
            template.name +
            '. Swipe left to delete, or swipe right to ' +
            (template.is_archived ? 'restore.' : 'archive.')
          "
          @click="openProgramCard(template)"
          @keydown.enter.prevent="openProgramCard(template)"
          @keydown.space.prevent="openProgramCard(template)"
          @pointerdown="startProgramSwipe(template.id, $event)"
          @pointermove="moveProgramSwipe"
          @pointerup="finishProgramSwipe(template)"
          @pointercancel="cancelProgramSwipe"
          @dragstart.prevent
        >
          <div class="template-row__main">
            <span class="template-icon">☷</span>
            <span>
              <span class="template-row__title">
                {{ template.name }}
                <span v-if="template.is_archived" class="archive-badge">Archived</span>
              </span>
              <small>
                {{ template.exerciseCount }}
                {{ template.exerciseCount === 1 ? 'exercise' : 'exercises' }}
                <template v-if="template.description"> · {{ template.description }}</template>
              </small>
            </span>
          </div>
          <div class="card-actions">
            <button
              v-if="!template.is_archived"
              class="button button--primary button--compact"
              type="button"
              :disabled="Boolean(startingId) || template.exerciseCount === 0"
              @click.stop="start(template)"
            >
              {{ startingId === template.id ? 'Starting…' : activeWorkout ? 'Resume' : 'Start' }}
            </button>
            <button
              class="button button--secondary"
              type="button"
              @click.stop="duplicate(template)"
            >
              Duplicate
            </button>
          </div>
        </article>

        <div
          v-if="confirmingDeleteId === template.id"
          class="swipe-confirm"
          role="alertdialog"
          aria-label="Confirm delete"
        >
          <span>Delete {{ template.name }}?</span>
          <div class="swipe-confirm__actions">
            <button
              class="button button--secondary button--compact"
              type="button"
              @click="confirmingDeleteId = null"
            >
              Cancel
            </button>
            <button
              class="button button--danger button--compact"
              type="button"
              @click="deleteTemplateItem(template)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="creatorOpen" class="modal-backdrop" @click.self="creatorOpen = false">
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-creator-title"
      >
        <div class="modal__heading">
          <div>
            <p class="eyebrow">New program</p>
            <h2 id="template-creator-title">Create a workout program</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Close" @click="creatorOpen = false">
            ×
          </button>
        </div>

        <form class="form" novalidate @submit.prevent="create">
          <div class="field">
            <label for="template-name">Program name</label>
            <input
              id="template-name"
              v-model="form.name"
              type="text"
              autofocus
              placeholder="Leg Day"
            />
          </div>
          <div class="field">
            <label for="template-description"
              >Description <span class="optional">Optional</span></label
            >
            <textarea
              id="template-description"
              v-model="form.description"
              rows="3"
              placeholder="Posterior-chain focused session"
            ></textarea>
          </div>
          <p v-if="formError" class="alert alert--error" role="alert">{{ formError }}</p>
          <div class="modal__actions">
            <button class="button button--secondary" type="button" @click="creatorOpen = false">
              Cancel
            </button>
            <button class="button button--primary" type="submit" :disabled="saving">
              {{ saving ? 'Creating…' : 'Create and configure' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="restPickerOpen" class="modal-backdrop" @click.self="closeRestPicker">
      <section
        class="modal rest-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rest-picker-title"
      >
        <div class="modal__heading">
          <div>
            <p class="eyebrow">Before you begin</p>
            <h2 id="rest-picker-title">Rest between exercises</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Close" @click="closeRestPicker">
            &times;
          </button>
        </div>

        <p class="rest-picker-modal__hint">
          Choose how long the timer should run after finishing an exercise.
        </p>

        <div class="time-picker" aria-label="Rest duration">
          <div class="time-picker__group">
            <div
              ref="minuteWheel"
              class="time-picker__wheel"
              role="listbox"
              aria-label="Minutes"
              @scroll="updateRestFromScroll('minutes', $event)"
            >
              <button
                v-for="minute in timeOptions"
                :key="'minute-' + minute"
                type="button"
                role="option"
                :aria-selected="restMinutes === minute"
                :class="[
                  'time-picker__option',
                  { 'time-picker__option--selected': restMinutes === minute },
                ]"
                @click="selectRestMinute(minute)"
              >
                {{ String(minute).padStart(2, '0') }}
              </button>
            </div>
            <span>min</span>
          </div>
          <span class="time-picker__separator">:</span>
          <div class="time-picker__group">
            <div
              ref="secondWheel"
              class="time-picker__wheel"
              role="listbox"
              aria-label="Seconds"
              @scroll="updateRestFromScroll('seconds', $event)"
            >
              <button
                v-for="second in timeOptions"
                :key="'second-' + second"
                type="button"
                role="option"
                :aria-selected="restSeconds === second"
                :class="[
                  'time-picker__option',
                  { 'time-picker__option--selected': restSeconds === second },
                ]"
                @click="selectRestSecond(second)"
              >
                {{ String(second).padStart(2, '0') }}
              </button>
            </div>
            <span>sec</span>
          </div>
        </div>

        <div class="modal__actions">
          <button
            class="button button--secondary"
            type="button"
            :disabled="Boolean(startingId)"
            @click="closeRestPicker"
          >
            Cancel
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="Boolean(startingId)"
            @click="confirmStart"
          >
            {{ startingId ? 'Starting…' : 'Start workout' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
