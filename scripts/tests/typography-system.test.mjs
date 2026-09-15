import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_ROOT = 'src';
const NAVY_INK = '#25364E';

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  }));

  return nested.flat();
}

const files = await collectSourceFiles(SOURCE_ROOT);
const sources = await Promise.all(files.map(async (file) => ({
  file,
  content: await readFile(file, 'utf8'),
})));

const rules = [
  {
    pattern: /fontWeight\s*:\s*['"](?:800|900)['"]/,
    message: 'React Native stillerinde 800/900 agirligi kalmis.',
  },
  {
    pattern: /font-weight\s*:\s*(?:800|850|900|950)\b/i,
    message: 'Web stillerinde aşiri kalin font agirligi kalmis.',
  },
  {
    pattern: /\bfont\s*:\s*(?:800|850|900|950)\b/i,
    message: 'Web font kisaltmasinda aşiri kalin agirlik kalmis.',
  },
  {
    pattern: /#252333/i,
    message: 'Eski siyaha yakin Kistas rengi kalmis.',
  },
  {
    pattern: /color\s*:\s*['"](?:#000|#000000|black|#0F172A|#111827|#1A2130|#1E293B|#202335|#202536|#202D43|#25334A|#26344A|#28374D|#2D3748|#2F3D4E|#334155|#3F3B4C)['"]/i,
    message: 'Metin renginde standart disi siyah/koyu ton kalmis.',
  },
  {
    pattern: /(?:fontFamily\s*:\s*['"](?:Georgia|Inter)|font-family\s*:\s*(?:Georgia|Inter))/i,
    message: 'Kistas sistem fontu disinda Georgia/Inter kullanimi kalmis.',
  },
];

for (const rule of rules) {
  const violation = sources.find(({ content }) => rule.pattern.test(content));
  assert.equal(violation, undefined, `${rule.message} Dosya: ${violation?.file ?? 'bilinmiyor'}`);
}

const themeSource = await readFile('src/core/theme/colors.ts', 'utf8');
assert.match(themeSource, new RegExp(`brand:\\s*\\{\\s*ink:\\s*['"]${NAVY_INK}['"]`), 'Marka metin rengi lacivert standardinda degil.');
assert.match(themeSource, new RegExp(`900:\\s*['"]${NAVY_INK}['"],\\s*black:\\s*['"]${NAVY_INK}['"]`), 'Ana koyu metin tokenlari lacivert standardinda degil.');

console.log(`Kistas typography checks passed across ${files.length} source files.`);
