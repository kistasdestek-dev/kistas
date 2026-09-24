import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing Supabase response adapters still contain explicit `any` types.
      // Keep strict TypeScript enabled and remove this debt during package-boundary work.
      '@typescript-eslint/no-explicit-any': 'off',

      // React 19 compiler rules reject several established data-loading effects and
      // request-time timestamps. Refactor those flows component-by-component instead
      // of applying broad behavior changes inside the lint migration.
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',

      // vinext currently serves next/image unoptimized without a Cloudflare Images
      // binding. Existing remote/user images remain on <img> until that binding lands.
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    '.vinext/**',
    '.wrangler/**',
    'dist/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);
