import { toSafeHttpsUrl } from '../../src/core/security/ExternalUrl.ts';

const cases = [
  { value: 'https://example.com/path?q=1', accepted: true },
  { value: 'example.com/path', accepted: true },
  { value: 'javascript:alert(1)', accepted: false },
  { value: 'data:text/html,<script>alert(1)</script>', accepted: false },
  { value: 'vbscript:msgbox(1)', accepted: false },
  { value: 'http://example.com', accepted: false },
  { value: '//example.com/path', accepted: false },
  { value: 'https://user:pass@example.com', accepted: false },
  { value: 'https://localhost/test', accepted: false },
  { value: 'https://127.0.0.1/test', accepted: false },
  { value: 'https://example.com\\@evil.test', accepted: false },
  { value: 'https://example.com/\njavascript:alert(1)', accepted: false },
];

for (const testCase of cases) {
  const actual = Boolean(toSafeHttpsUrl(testCase.value));
  if (actual !== testCase.accepted) {
    throw new Error(`Unexpected URL decision for: ${JSON.stringify(testCase.value)}`);
  }
}

const trustedHost = toSafeHttpsUrl('https://project.supabase.co/auth/v1/authorize', {
  allowedHosts: ['project.supabase.co'],
});
const untrustedHost = toSafeHttpsUrl('https://evil.example/auth/v1/authorize', {
  allowedHosts: ['project.supabase.co'],
});

if (!trustedHost || untrustedHost) {
  throw new Error('Trusted OAuth host validation failed.');
}

console.log(`External URL tests passed: ${cases.length + 2}`);
