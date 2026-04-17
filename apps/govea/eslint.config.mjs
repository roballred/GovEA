import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**'] },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Hydrating React state from localStorage after mount (empty-dep useEffect)
      // is intentional and doesn't cause cascading renders — downgrade to warn.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]

export default config
