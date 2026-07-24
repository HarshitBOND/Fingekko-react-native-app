// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // `lucide-icon/*` is a Metro resolver alias (see metro.config.js), not a
    // package — eslint-plugin-import can't follow it, and adding a resolver
    // plugin just to satisfy one file isn't worth the dependency. Metro and
    // TypeScript both resolve these; the wildcard types live in svg.d.ts.
    files: ['components/ui/lucide-icons.ts'],
    rules: { 'import/no-unresolved': 'off' },
  },
]);
