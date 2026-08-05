import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

// Minimal browser globals so DOM type references (HTMLElement, MouseEvent, Node,
// document, window) don't trip no-undef inside .vue/.ts without pulling in a
// dependency. Keep in sync with what the app actually touches.
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  globalThis: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  MouseEvent: 'readonly',
  KeyboardEvent: 'readonly',
  PointerEvent: 'readonly',
  Event: 'readonly',
  Node: 'readonly',
  CustomEvent: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  location: 'readonly',
}

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'public/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.vue', '**/*.ts'],
    languageOptions: {
      globals: { ...browserGlobals },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: { ...browserGlobals, process: 'readonly' },
    },
  },
)
