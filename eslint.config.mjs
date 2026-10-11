import tseslint from 'typescript-eslint'
import solid from 'eslint-plugin-solid'
import importX from 'eslint-plugin-import-x'

// CONSTITUTION.md §6.7: strict equality against only one of null/undefined lets the
// other slip through (e.g. `null` from imported JSON passing a `!== undefined` check).
// `== null` / `!= null` / `??` cover both.
const NULLISH_STRICT_EQUALITY = {
  selector: "BinaryExpression:matches([operator='==='], [operator='!==']) > :matches(Literal[raw='null'], Identifier[name='undefined'])",
  message: 'Use `== null` / `!= null` (or `??`) to check for nullish values; strict equality misses either null or undefined.',
}

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
      '@typescript-eslint/no-explicit-any': 'error',
      // `declare module "solid-js" { namespace JSX { ... } }` is the standard way to
      // augment Solid's JSX.Directives for a custom directive (see TabSettings.tsx) —
      // not a stray namespace that should be ES modules.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      'no-restricted-syntax': ['error', NULLISH_STRICT_EQUALITY],
    },
  },
  {
    // CONSTITUTION.md §6.8–9: `data-test` and `data-sem` are stripped from production builds, so
    // app code that looks an element up by either works in dev and tests and silently fails in
    // production. Tests are exempt — selecting by `data-test` is what the attribute is for.
    // Repeats the nullish rule because a later `no-restricted-syntax` replaces the earlier one.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/tests/**'],
    rules: {
      'no-restricted-syntax': ['error', NULLISH_STRICT_EQUALITY, {
        selector: ':matches(Literal[value=/\\[data-(test|sem)/], TemplateElement[value.raw=/\\[data-(test|sem)/])',
        message: '`data-test` and `data-sem` are stripped from production builds; hold a ref to the element instead of selecting by them.',
      }],
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: { solid },
    rules: {
      ...solid.configs.recommended.rules,
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
