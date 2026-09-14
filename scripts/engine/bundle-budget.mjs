/**
 * Kıstas Bundle Boyut Bütçesi & Performans Radarı v1.0
 * 
 * İşlev:
 * 1. Derlenen canlı web paketinin (JS bundle) ham ve sıkıştırılmış (Brotli/Gzip) boyutunu ölçer.
 * 2. 2.2 MB ham / 550 KB transfer bütçesi ile kıyaslayarak performans notu (Grade) üretir.
 * 3. En ağır 5 statik varlığı (görsel/font) listeler, mobil yükleme darboğazlarını erkenden yakalar.
 */

import fs from 'fs';
import path from 'path';

const RAW_BUDGET_BYTES = 2.2 * 1024 * 1024; // 2.2 MB
const BROTLI_BUDGET_BYTES = 550 * 1024;     // 550 KB

export function analyzeBundleBudget(projectRoot) {
  const distWebPath = path.join(projectRoot, 'dist-web', '_expo', 'static', 'js', 'web');
  
  let result = {
    bundleFound: false,
    rawSizeBytes: 0,
    rawSizeMB: '0.00',
    rawUsagePct: 0,
    brotliSizeKB: '0',
    gzipSizeKB: '0',
    statusGrade: 'BİLGİ',
    statusText: 'Derlenmiş paket bulunamadı (npm run preview:tunnel önerilir)',
    isOverBudget: false,
    topHeavyAssets: [],
  };

  if (fs.existsSync(distWebPath)) {
    try {
      const files = fs.readdirSync(distWebPath);
      // En son oluşturulan index-*.js dosyasını bul
      const jsFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'));
      if (jsFiles.length > 0) {
        // En güncel olanı seç
        let latestJs = jsFiles[0];
        let latestTime = 0;
        for (const js of jsFiles) {
          const mtime = fs.statSync(path.join(distWebPath, js)).mtimeMs;
          if (mtime > latestTime) {
            latestTime = mtime;
            latestJs = js;
          }
        }

        const rawStat = fs.statSync(path.join(distWebPath, latestJs));
        result.bundleFound = true;
        result.rawSizeBytes = rawStat.size;
        result.rawSizeMB = (rawStat.size / (1024 * 1024)).toFixed(2);
        result.rawUsagePct = Math.round((rawStat.size / RAW_BUDGET_BYTES) * 100);

        // Brotli kontrolü
        const brPath = path.join(distWebPath, `${latestJs}.br`);
        if (fs.existsSync(brPath)) {
          result.brotliSizeKB = (fs.statSync(brPath).size / 1024).toFixed(1);
        }

        // Gzip kontrolü
        const gzPath = path.join(distWebPath, `${latestJs}.gz`);
        if (fs.existsSync(gzPath)) {
          result.gzipSizeKB = (fs.statSync(gzPath).size / 1024).toFixed(1);
        }

        // Performans Notu
        if (result.rawSizeBytes <= RAW_BUDGET_BYTES) {
          if (parseFloat(result.brotliSizeKB) <= 500) {
            result.statusGrade = 'A+ [Ultra Hafif]';
            result.statusText = `Mükemmel Bütçe! Ham: ${result.rawSizeMB} MB, Ağ Transferi: ${result.brotliSizeKB} KB (Brotli ile %${result.rawUsagePct} bütçe kullanımı)`;
          } else {
            result.statusGrade = 'A [Sağlıklı]';
            result.statusText = `İdeal Bütçe! Ham: ${result.rawSizeMB} MB, Ağ Transferi: ${result.brotliSizeKB} KB`;
          }
          result.isOverBudget = false;
        } else {
          result.statusGrade = '⚠️ UYARI [Bütçe Aşıldı]';
          const excessMB = ((result.rawSizeBytes - RAW_BUDGET_BYTES) / (1024 * 1024)).toFixed(2);
          result.statusText = `Bütçe (2.20 MB) ${excessMB} MB aşıldı! Kod bölme (lazy loading) önerilir.`;
          result.isOverBudget = true;
        }
      }
    } catch {}
  }

  // En ağır 5 varlığı bul
  const assetsDir = path.join(projectRoot, 'assets');
  if (fs.existsSync(assetsDir)) {
    const allAssets = [];
    function scanAssets(dir) {
      try {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) scanAssets(full);
          else if (/\.(png|jpe?g|webp|ttf|woff2?|svg)$/i.test(item.name)) {
            const size = fs.statSync(full).size;
            allAssets.push({
              name: item.name,
              sizeKB: (size / 1024).toFixed(1),
              bytes: size,
              relPath: path.relative(projectRoot, full),
            });
          }
        }
      } catch {}
    }
    scanAssets(assetsDir);
    allAssets.sort((a, b) => b.bytes - a.bytes);
    result.topHeavyAssets = allAssets.slice(0, 5);
  }

  return result;
}
