import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.cwd();
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const sourceRoots = ['src', 'supabase/functions'];
const rootSourceFiles = ['App.tsx', 'index.ts'];
const findings = [];

const rules = [
  {
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/g,
    reason: 'Raw HTML injection sink is forbidden.',
    unsafeExample: 'element.innerHTML = userInput',
    safeExample: 'element.textContent = userInput',
  },
  {
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(/g,
    reason: 'Dynamic JavaScript execution is forbidden.',
    unsafeExample: 'eval(userInput)',
    safeExample: 'JSON.parse(input)',
  },
  {
    pattern: /Linking\.openURL\(\s*(?!safe[A-Z])[A-Za-z_$][\w$]*/g,
    reason: 'Linking.openURL() requires a value returned by toSafeHttpsUrl().',
    unsafeExample: 'Linking.openURL(project.webUrl)',
    safeExample: 'Linking.openURL(safeUrl)',
  },
  {
    pattern: /window\.location\.href\s*=\s*(?!safe[A-Z])[A-Za-z_$][\w$]*/g,
    reason: 'Browser redirects require a value returned by toSafeHttpsUrl().',
    unsafeExample: 'window.location.href = data.url',
    safeExample: 'window.location.href = safeAuthUrl',
  },
  {
    pattern: /<a\b[^>]*\bhref\s*=\s*\{(?!\s*safe[A-Z])[^}]+\}/g,
    reason: 'Dynamic anchor URLs require a value returned by toSafeHttpsUrl().',
    unsafeExample: '<a href={userUrl}>Open</a>',
    safeExample: '<a href={safeUrl}>Open</a>',
  },
];

const walk = (directory) => readdirSync(join(root, directory)).flatMap((entry) => {
  const path = join(directory, entry);
  return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
});

const violates = (text, rule) => Array.from(text.matchAll(rule.pattern)).length > 0;
const lineNumberAt = (text, index) => text.slice(0, index).split('\n').length;

for (const rule of rules) {
  if (!violates(rule.unsafeExample, rule) || violates(rule.safeExample, rule)) {
    console.error(`XSS guard self-test failed: ${rule.reason}`);
    process.exit(2);
  }
}

const sourceFiles = [
  ...sourceRoots.flatMap(walk),
  ...rootSourceFiles,
].filter((path) => sourceExtensions.has(extname(path)));

for (const path of sourceFiles) {
  const text = readFileSync(join(root, path), 'utf8');
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      findings.push(`${path}:${lineNumberAt(text, match.index)} ${rule.reason}`);
    }
  }
}

if (findings.length > 0) {
  console.error('XSS guard failed:\n');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('XSS guard passed: no unsafe HTML, script, or navigation sinks found.');
