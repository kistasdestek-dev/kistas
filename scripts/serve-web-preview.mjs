import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants as zlibConstants, gzip } from 'node:zlib';

const compress = promisify(brotliCompress);
const compressGzip = promisify(gzip);
const projectRoot = resolve(import.meta.dirname, '..');
const publicRoot = resolve(projectRoot, 'dist-web');
const portArgIndex = process.argv.indexOf('--port');
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT || 8090);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const COMPRESSIBLE = new Set(['.css', '.html', '.js', '.json', '.map', '.svg']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

async function prepareCompressedAssets() {
  const files = await walk(publicRoot);
  await Promise.all(files.map(async (filePath) => {
    if (!COMPRESSIBLE.has(extname(filePath).toLowerCase())) return;
    const sourceStats = await stat(filePath);
    if (sourceStats.size < 1024) return;

    const source = await import('node:fs/promises').then(({ readFile }) => readFile(filePath));
    const compressedPath = `${filePath}.br`;
    const gzipPath = `${filePath}.gz`;
    const [brotliOutput, gzipOutput] = await Promise.all([
      compress(source, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } }),
      compressGzip(source, { level: 6 }),
    ]);
    await Promise.all([
      writeFile(compressedPath, brotliOutput),
      writeFile(gzipPath, gzipOutput),
    ]);
  }));
}

function resolveRequestPath(rawUrl) {
  const pathname = decodeURIComponent(new URL(rawUrl || '/', 'http://localhost').pathname);
  const relativePath = normalize(pathname).replace(/^([/\\])+/, '');
  const candidate = resolve(publicRoot, relativePath || 'index.html');
  if (candidate !== publicRoot && !candidate.startsWith(`${publicRoot}${sep}`)) return null;
  return candidate;
}

if (!existsSync(join(publicRoot, 'index.html'))) {
  throw new Error('dist-web/index.html bulunamadi. Once Expo web export calistirilmali.');
}

await mkdir(publicRoot, { recursive: true });
await prepareCompressedAssets();

const server = createServer(async (request, response) => {
  try {
    let filePath = resolveRequestPath(request.url);
    if (!filePath) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    let fileStats;
    try {
      fileStats = await stat(filePath);
      if (fileStats.isDirectory()) {
        filePath = join(filePath, 'index.html');
        fileStats = await stat(filePath);
      }
    } catch {
      filePath = join(publicRoot, 'index.html');
      fileStats = await stat(filePath);
    }

    const extension = extname(filePath).toLowerCase();
    const acceptedEncoding = request.headers['accept-encoding'] || '';
    const acceptsBrotli = acceptedEncoding.includes('br');
    const acceptsGzip = acceptedEncoding.includes('gzip');
    const brotliPath = `${filePath}.br`;
    const gzipPath = `${filePath}.gz`;
    const useBrotli = Boolean(acceptsBrotli && COMPRESSIBLE.has(extension) && existsSync(brotliPath));
    const useGzip = Boolean(!useBrotli && acceptsGzip && COMPRESSIBLE.has(extension) && existsSync(gzipPath));
    const responsePath = useBrotli ? brotliPath : useGzip ? gzipPath : filePath;
    const isEntryDocument = filePath === join(publicRoot, 'index.html');

    response.setHeader('Content-Type', MIME_TYPES[extension] || 'application/octet-stream');
    response.setHeader('Cache-Control', isEntryDocument ? 'no-cache' : 'public, max-age=31536000, immutable');
    response.setHeader('Vary', 'Accept-Encoding');
    if (useBrotli) response.setHeader('Content-Encoding', 'br');
    else if (useGzip) response.setHeader('Content-Encoding', 'gzip');
    response.setHeader('Content-Length', (await stat(responsePath)).size);

    if (extension === '.mp4') {
      const totalSize = (await stat(filePath)).size;
      const range = request.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunksize = (end - start) + 1;
        response.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        createReadStream(filePath, { start, end }).pipe(response);
        return;
      }
      response.setHeader('Accept-Ranges', 'bytes');
    }

    if (request.method === 'HEAD') {
      response.writeHead(200).end();
      return;
    }

    response.writeHead(200);
    createReadStream(responsePath).pipe(response);
  } catch (error) {
    response.writeHead(500).end('Preview server error');
    console.error(error);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Kistas production preview: http://127.0.0.1:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
