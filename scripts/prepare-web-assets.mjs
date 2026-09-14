import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants as zlibConstants, gzip } from 'node:zlib';

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);
const projectRoot = resolve(import.meta.dirname, '..');
const targetRoot = resolve(projectRoot, process.argv[2] || 'dist-web');
const compressible = new Set(['.css', '.html', '.js', '.json', '.map', '.svg']);

if (targetRoot !== projectRoot && !targetRoot.startsWith(`${projectRoot}${sep}`)) {
  throw new Error('Sikistirma hedefi proje klasorunun disinda olamaz.');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const files = await walk(targetRoot);
await Promise.all(files.map(async (filePath) => {
  if (!compressible.has(extname(filePath).toLowerCase())) return;
  if ((await stat(filePath)).size < 1024) return;

  const source = await readFile(filePath);
  const [brotliOutput, gzipOutput] = await Promise.all([
    compressBrotli(source, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } }),
    compressGzip(source, { level: 6 }),
  ]);
  await Promise.all([
    writeFile(`${filePath}.br`, brotliOutput),
    writeFile(`${filePath}.gz`, gzipOutput),
  ]);
}));
