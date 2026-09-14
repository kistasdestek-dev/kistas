import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
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
const forbiddenPaths = /^(?:backups|dist|dist-web|node_modules|scratch|\.tools|\.agents|\.gemini|\.expo)\//;
const forbiddenFiles = /(^|\/)\.env(?!\.example$)(?:\.|$)|(^|\/)\.backup_staging\//;

const secretValues = new Map();
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && privateEnvNames.includes(match[1])) {
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (value.length >= 8) secretValues.set(match[1], value);
    }
  }
}
for (const name of privateEnvNames) {
  const value = process.env[name]?.trim();
  if (value && value.length >= 8) secretValues.set(name, value);
}

function getGitCommand() {
  const candidates = [
    'git',
    join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'cmd', 'git.exe'),
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe'),
    join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'native', 'git', 'cmd', 'git.exe'),
  ];
  for (const cmd of candidates) {
    try {
      execFileSync(cmd, ['--version'], { stdio: 'ignore' });
      return cmd;
    } catch {}
  }
  return 'git';
}

const gitCmd = getGitCommand();
const safeDir = root.replace(/\\/g, '/');
const files = execFileSync(gitCmd, ['-c', `safe.directory=${safeDir}`, 'ls-files', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(Boolean);
if (files.length === 0) {
  console.error('Repository secret check failed: no staged or tracked files.');
  process.exit(1);
}

const findings = [];
for (const relativePath of files) {
  if (forbiddenPaths.test(relativePath) || forbiddenFiles.test(relativePath)) {
    findings.push(`${relativePath}: excluded local path is tracked`);
    continue;
  }
  const path = join(root, relativePath);
  if (!existsSync(path) || statSync(path).size > 5 * 1024 * 1024) continue;
  const text = readFileSync(path).toString('utf8');
  for (const [name, value] of secretValues) {
    if (text.includes(value)) findings.push(`${relativePath}: ${name} value`);
  }
  if (/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{40,}/.test(text)) {
    findings.push(`${relativePath}: private key material`);
  }
}

if (findings.length > 0) {
  console.error('Repository secret check failed:\n' + findings.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Repository secret check passed: ${files.length} staged or tracked files, no local secrets found.`);
