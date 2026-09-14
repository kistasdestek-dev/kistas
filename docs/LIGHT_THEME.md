# Light Theme

- Shared palette: `src/core/theme/colors.ts`.
- Canvas: white. Main text: ink (#252333). Secondary text: #686474.
- Interactive accents: logo-inspired blue (#3269C7), hover #2858AA; success: green; destructive actions: red.
- Pale blue surfaces: #EAF2FC; subtle borders: #D5E2F2. Keep the page canvas white.
- Category surfaces use distinct pale colors with dark labels.
- Preserve uploaded product imagery and brand logos unchanged.
- New screens must use light surfaces, visible focus states, and readable disabled states.
- Verify desktop and mobile widths before changing shared colors. Do not invert colors globally with CSS filters.
- Browser smoke checks: `scripts/verify-light-theme.cjs` (set PLAYWRIGHT_MODULE to an installed Playwright module).

## Authentication

- Login and registration share `AuthExperience.tsx`: unframed serif heading, glass fields and staged forms.
- Keep real AuthService calls and existing consent requirements; never use timers to simulate authentication success.
- The decorative background uses a slow CSS transform on web and a static native gradient. Reduced-motion disables continuous animation.
- `scripts/verify-auth-design.cjs` checks 1440/390/320px layouts, invalid input, password mismatch, required consent and duplicate-submit prevention with a mocked login error. It does not create accounts or prove successful OAuth/email delivery.
