import tseslint from 'typescript-eslint'
import solid from 'eslint-plugin-solid'
import importX from 'eslint-plugin-import-x'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'tests/visual/__snapshots__/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // CONSTITUTION.md §6.2 permits `any` with a justifying inline comment rather than
      // banning it outright; downgraded to warn until the Phase 4 cleanup adds comments
      // or removes each remaining use (tracked in the constitutional-alignment plan).
      '@typescript-eslint/no-explicit-any': 'warn',
      // `declare module "solid-js" { namespace JSX { ... } }` is the standard way to
      // augment Solid's JSX.Directives for a custom directive (see TabSettings.tsx) —
      // not a stray namespace that should be ES modules.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      // CONSTITUTION.md §6.7: strict equality against only one of null/undefined lets the
      // other slip through (e.g. `null` from imported JSON passing a `!== undefined` check).
      // `== null` / `!= null` / `??` cover both.
      'no-restricted-syntax': ['error', {
        selector: "BinaryExpression:matches([operator='==='], [operator='!==']) > :matches(Literal[raw='null'], Identifier[name='undefined'])",
        message: 'Use `== null` / `!= null` (or `??`) to check for nullish values; strict equality misses either null or undefined.',
      }],
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: { solid },
    rules: {
      ...solid.configs.recommended.rules,
      // 5 existing call sites (character-notes-module.tsx, equipment-inventory-module.tsx)
      // render lists via Array#map instead of Solid's <For>. Converting is a real,
      // behavior-sensitive rendering refactor, not lint-infra setup — downgraded to warn
      // and tracked as a follow-up rather than rewritten here.
      'solid/prefer-for': 'warn',
    },
  },
  {
    // CONSTITUTION.md §6.18: external packages, then internal `@/` absolute imports, then
    // relative imports, each group separated by a blank line.
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/order': ['error', {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
      }],
    },
  },
)
