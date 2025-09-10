// Lightweight rules to catch breakage but avoid churn
const { configs } = require('@eslint/js');

module.exports = {
root: true,
languageOptions: {
ecmaVersion: 2022,
sourceType: 'script',
globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly' }
},
env: { browser: true, es2022: true },
rules: {
'no-unused-vars': ['warn', { args: 'none', vars: 'all' }],
'no-undef': 'error'
},
overrides: [{ files: ['**/*.test.js'], env: { node: true } }],
extends: [configs.recommended]
};