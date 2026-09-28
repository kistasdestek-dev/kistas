import fs from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

export const RAW_BUDGET_BYTES = 2.2 * 1024 * 1024;
export const BROTLI_BUDGET_BYTES = 550 * 1024;
export function estimateBrotli(bytes) {
  return brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } });
}

export function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : entry.isFile() ? [full] : [];
  });
}

export function evaluateRouteBudget(rawBytes, brotliBytes) {
  if (!Number.isFinite(rawBytes) || !Number.isFinite(brotliBytes) || rawBytes < 0 || brotliBytes < 0) return { status: 'unmeasured', isOverBudget: null };
  return { status: rawBytes > RAW_BUDGET_BYTES || brotliBytes > BROTLI_BUDGET_BYTES ? 'warning' : 'passed', isOverBudget: rawBytes > RAW_BUDGET_BYTES || brotliBytes > BROTLI_BUDGET_BYTES };
}

export function analyzeBundleBudget(projectRoot) {
  const candidates = [
    ['workers', 'apps/web/dist/client/_next/static'],
    ['next', 'apps/web/.next/static'],
  ];
  const builds = candidates.map(([target, directory]) => {
    const files = walkFiles(path.join(projectRoot, directory)).filter((file) => file.endsWith('.js'));
    const chunks = files.map((file) => {
      const bytes = fs.readFileSync(file);
      return { relPath: path.relative(projectRoot, file), rawBytes: bytes.length, brotliBytes: estimateBrotli(bytes).length, gzipBytes: gzipSync(bytes).length };
    });
    return { target, directory, files: chunks.length, rawBytes: chunks.reduce((sum, chunk) => sum + chunk.rawBytes, 0), brotliBytes: chunks.reduce((sum, chunk) => sum + chunk.brotliBytes, 0), chunks: chunks.sort((a, b) => b.rawBytes - a.rawBytes).slice(0, 5) };
  });
  const primary = builds.find((build) => build.files > 0);
  const assets = walkFiles(path.join(projectRoot, 'apps/web/public')).filter((file) => /\.(png|jpe?g|webp|ttf|woff2?|svg)$/i.test(file)).map((file) => ({ relPath: path.relative(projectRoot, file), bytes: fs.statSync(file).size, sizeKB: (fs.statSync(file).size / 1024).toFixed(1) })).sort((a, b) => b.bytes - a.bytes).slice(0, 5);
  return {
    bundleFound: Boolean(primary), builds, rawSizeBytes: primary?.rawBytes ?? null,
    rawSizeMB: primary ? (primary.rawBytes / 1024 / 1024).toFixed(2) : null,
    rawUsagePct: primary ? Math.round(primary.rawBytes / RAW_BUDGET_BYTES * 100) : 0,
    brotliSizeKB: primary ? (primary.brotliBytes / 1024).toFixed(1) : null,
    statusGrade: 'OLCULMEDI', isOverBudget: null, topHeavyAssets: assets,
    statusText: primary ? 'Tum client chunk envanteri; lazy chunklar dahil. Rota ilk yuk boyutu ve ag transferi degildir. Brotli quality=4 yerel tahminidir.' : 'Next/Workers client build bulunamadi. pnpm build ve build:vinext gerekli.',
  };
}
