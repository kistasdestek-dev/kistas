import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const sourceRoots = ['src', 'supabase/functions'];
const migrationRoot = 'supabase/migrations';
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const findings = [];
const sourceRules = [
  {
    pattern: /\bsupabase\s*\.\s*(?:from|rpc)\(\s*(?!['"`])[^)]+\)/g,
    reason: 'Database relation and RPC names must be string literals.',
    unsafeExample: 'supabase.rpc(rpcName, params)',
    safeExample: "supabase.rpc('fixed_rpc', params)",
  },
  {
    pattern: /\.(?:or|filter)\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*\)/g,
    reason: 'Interpolated PostgREST filters require toPostgrestUuid().',
    allow: (value) => value.includes('toPostgrestUuid(') || /\$\{safe[A-Z][A-Za-z0-9]*Id\}/.test(value),
    unsafeExample: '.or(`owner_id.eq.${userInput}`)',
    safeExample: '.or(`owner_id.eq.${safeUserId}`)',
  },
  {
    pattern: /filter\s*:\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
    reason: 'Interpolated Realtime filters require a safe UUID variable.',
    allow: (value) => /\$\{safe[A-Z][A-Za-z0-9]*Id\}/.test(value),
    unsafeExample: 'filter: `listing_id=eq.${listingId}`',
    safeExample: 'filter: `listing_id=eq.${safeListingId}`',
  },
  {
    pattern: /\b(?:query|execute|raw)\(\s*`[^`]*\$\{/g,
    reason: 'Do not interpolate values into raw SQL.',
    unsafeExample: 'query(`SELECT * FROM users WHERE id = ${userInput}`)',
    safeExample: "query('SELECT * FROM users WHERE id = $1', [userId])",
  },
];
const sqlRules = [
  {
    pattern: /^\s*EXECUTE\s+(?!FUNCTION\b)[^;]*;/gim,
    reason: 'Dynamic SQL requires a manual security review and USING parameters.',
    unsafeExample: "EXECUTE 'SELECT * FROM users WHERE name = ' || input;",
    safeExample: 'FOR EACH ROW EXECUTE FUNCTION public.audit_row();',
  },
];

const walk = (directory) => readdirSync(join(root, directory)).flatMap((entry) => {
  const path = join(directory, entry);
  return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
});

const lineNumberAt = (text, index) => text.slice(0, index).split('\n').length;

const reportMatches = (path, text, pattern, reason, allow = () => false) => {
  for (const match of text.matchAll(pattern)) {
    if (!allow(match[0])) {
      findings.push(`${path}:${lineNumberAt(text, match.index)} ${reason}`);
    }
  }
};

const violates = (text, rule) => Array.from(text.matchAll(rule.pattern))
  .some((match) => !(rule.allow || (() => false))(match[0]));

for (const rule of [...sourceRules, ...sqlRules]) {
  if (!violates(rule.unsafeExample, rule) || violates(rule.safeExample, rule)) {
    console.error(`SQL injection guard self-test failed: ${rule.reason}`);
    process.exit(2);
  }
}

for (const path of sourceRoots.flatMap(walk).filter((path) => sourceExtensions.has(extname(path)))) {
  const text = readFileSync(join(root, path), 'utf8');

  sourceRules.forEach((rule) => {
    reportMatches(path, text, rule.pattern, rule.reason, rule.allow);
  });
}

for (const path of walk(migrationRoot).filter((path) => extname(path) === '.sql')) {
  const text = readFileSync(join(root, path), 'utf8');
  sqlRules.forEach((rule) => {
    reportMatches(relative(root, join(root, path)), text, rule.pattern, rule.reason, rule.allow);
  });
}

if (findings.length > 0) {
  console.error('SQL injection guard failed:\n');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('SQL injection guard passed: no unsafe query construction patterns found.');
