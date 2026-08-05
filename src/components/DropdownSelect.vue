<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type DropdownOption = {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: DropdownOption[]
    placeholder?: string
    label: string
    inputId?: string
    iconOnly?: boolean
  }>(),
  {
    placeholder: 'Select an option',
    inputId: undefined,
    iconOnly: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const selectedLabel = computed(
  () =>
    props.options.find((option) => option.value === props.modelValue)?.label ?? props.placeholder,
)

function toggle() {
  open.value = !open.value
}

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  globalThis.document.addEventListener('click', onDocumentClick, true)
})

onBeforeUnmount(() => {
  globalThis.document.removeEventListener('click', onDocumentClick, true)
})
</script>

<template>
  <div ref="root" :class="['dropdown-select', { 'dropdown-select--field': !iconOnly }]">
    <button
      :id="inputId"
      :class="[
        iconOnly ? 'filter-icon-button' : 'dropdown-select__trigger',
        {
          'filter-icon-button--active': iconOnly && modelValue !== options[0]?.value,
          'dropdown-select__trigger--open': !iconOnly && open,
          'dropdown-select__trigger--placeholder': !iconOnly && !modelValue,
        },
      ]"
      type="button"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <slot name="trigger" :selected-label="selectedLabel">
        <span>{{ selectedLabel }}</span>
        <svg aria-hidden="true" class="dropdown-select__chevron" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" />
        </svg>
      </slot>
    </button>

    <div
      v-if="open"
      :class="['filter-menu', { 'filter-menu--field': !iconOnly }]"
      role="listbox"
      :aria-label="label"
    >
      <button
        v-for="option in options"
        :key="option.value"
        :class="{ 'filter-menu__option--active': modelValue === option.value }"
        type="button"
        role="option"
        :aria-selected="modelValue === option.value"
        @click="select(option.value)"
      >
        <span>{{ option.label }}</span
        ><span v-if="modelValue === option.value">✓</span>
      </button>
    </div>
  </div>
</template>
