import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = join(root, 'dist');
if (!existsSync(join(outputDir, 'index.html'))) {
  console.error('Web bundle check failed: dist/index.html is missing.');
  process.exit(1);
}

const privateEnvNames = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'IYZICO_API_KEY',
  'IYZICO_SECRET_KEY',
  'YURTICI_USER',
  'YURTICI_PASS',
  'YURTICI_CUSTOMER_KEY',
];

const envValues = new Map();
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && privateEnvNames.includes(match[1])) {
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (value.length >= 8) envValues.set(match[1], value);
    }
  }
}

for (const name of privateEnvNames) {
  const value = process.env[name]?.trim();
  if (value && value.length >= 8) envValues.set(name, value);
}

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
};
walk(outputDir);

const findings = [];
for (const file of files) {
  const bytes = readFileSync(file);
  const text = bytes.toString('utf8');
  for (const [name, value] of envValues) {
    if (text.includes(value)) findings.push(`${file}: ${name} value`);
  }
  if (/\b(?:R2_SECRET_ACCESS_KEY|SUPABASE_SERVICE_ROLE_KEY|IYZICO_SECRET_KEY|YURTICI_PASS)\b/.test(text)) {
    findings.push(`${file}: private environment variable name`);
  }
}

if (findings.length > 0) {
  console.error('Web bundle check failed:\n' + findings.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Web bundle check passed: ${files.length} files, no configured private values or names found.`);
