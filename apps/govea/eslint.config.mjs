import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import jsxA11y from 'eslint-plugin-jsx-a11y'

const config = [
  { ignores: ['.next/**'] },
  ...coreWebVitals,
  ...nextTypescript,
  // #766 — WCAG 2.1 AA (Washington Policy 188). eslint-config-next wires only
  // a subset of jsx-a11y rules; this enables the full recommended rule set as
  // errors so violations fail the CI lint gate. Rules only — the plugin itself
  // is already registered by eslint-config-next and cannot be redefined.
  { rules: jsxA11y.flatConfigs.recommended.rules },
  {
    rules: {
      // Focus moves in this app are user-initiated (opening an inline editor,
      // a rename field, a search page the user navigated to) — WCAG 3.2.1
      // permits focus set in response to a user action; the rule targets
      // unsolicited focus steals on page load.
      'jsx-a11y/no-autofocus': 'off',
      // Label text in settings forms sits inside a div+span wrapper next to
      // the checkbox; raise the search depth so the rule sees it.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
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
