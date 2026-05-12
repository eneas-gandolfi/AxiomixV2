// ESLint flat config — Next.js 16 removeu `next lint`; usamos `eslint .` diretamente.
// `eslint-config-next@16` exporta os presets como flat config (subpath exports),
// então importamos como arrays e espalhamos — sem `FlatCompat`.

import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescriptConfig from 'eslint-config-next/typescript'

export default [
  {
    ignores: [
      '.next/**',
      '.netlify/**',
      '.vercel/**',
      'out/**',
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'next-env.d.ts',
      // Saídas e diretórios de tooling externos
      '_bmad/**',
      '_bmad-output/**',
      '.agents/**',
      'supabase/.temp/**',
      'verify-output.txt',
      // Migrations SQL não são JS/TS
      'supabase/migrations/**',
      'database/**',
    ],
  },
  ...coreWebVitals,
  ...typescriptConfig,

  // Regras experimentais do eslint-plugin-react-hooks@7 (aware do React Compiler):
  // ainda não rodamos React Compiler, então rebaixamos pra warn pra não bloquear CI
  // sem perder o sinal. exhaustive-deps e rules-of-hooks continuam como error (padrão).
  {
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
    },
  },

  // Scripts Node CJS (não passam por bundler): permitir require() e imagens via <img>.
  {
    files: ['scripts/**/*.{js,cjs,mjs,ts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Testes: dynamic require() é comum pra mocks; some unused vars vêm de fixtures.
  {
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
