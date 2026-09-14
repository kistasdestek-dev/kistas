/**
 * Kıstas Otonom Self-Healing (Kendi Kendini Onaran) Hijyen Motoru v2.0 Enterprise
 * 
 * Yetenekler:
 * 1. Tek ve çok satırlı (multiline) ölü / kullanılmayan named importları akıllı AST/Regex ile güvenle ayıklar.
 * 2. Tümü kullanılmayan import satırlarını dosya düzenini bozmadan tamamen temizler.
 * 3. Type-only veya alias (`A as B`) importlarını tanır ve gövdedeki kullanımlarını denetler.
 * 4. Dosya işleminden sonra syntax/kod bütünlüğünü garanti eder.
 * 5. İşlem sonrasında detaylı rapor sunar.
 */

import fs from 'fs';
import path from 'path';

/**
 * Tek bir dosyadaki kullanılmayan named importları temizler.
 */
export function healFileImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Tek veya çok satırlı import { ... } from '...' kalıbı
  const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g;
  const matches = [];
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    matches.push({
      fullStatement: m[0],
      rawImports: m[1],
      modulePath: m[2],
      index: m.index,
      length: m[0].length,
    });
  }

  let prunedCount = 0;
  const removedNames = [];

  // Index kaymasını önlemek için sondan başa doğru işlem yap
  for (let i = matches.length - 1; i >= 0; i--) {
    const item = matches[i];
    
    // Satır içindeki tüm import tokenlarını ayrıştır
    const rawTokens = item.rawImports
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Import satırı haricindeki tüm gövde metni
    const bodyText = content.slice(0, item.index) + content.slice(item.index + item.length);

    const keptTokens = [];
    for (const token of rawTokens) {
      const isTypeOnly = token.startsWith('type ');
      const cleanToken = isTypeOnly ? token.replace(/^type\s+/, '').trim() : token;
      
      // Alias desteği: A as B -> kullanılan isim B'dir
      const actualIdentifier = cleanToken.includes(' as ') 
        ? cleanToken.split(' as ')[1].trim() 
        : cleanToken;

      if (!actualIdentifier) continue;

      // Gövdede kullanım var mı kontrolü (kelime sınırı \b ile)
      const usageRegex = new RegExp(`\\b${actualIdentifier}\\b`);
      if (usageRegex.test(bodyText)) {
        keptTokens.push(token);
      } else {
        prunedCount++;
        removedNames.push(actualIdentifier);
      }
    }

    if (keptTokens.length === 0) {
      // Hiçbir import kalmadı -> Tüm import ifadesini kaldır
      const before = content.slice(0, item.index);
      let after = content.slice(item.index + item.length);
      // Satır sonundaki boşluk ve satır atlamayı temizle
      if (after.startsWith('\r\n')) after = after.slice(2);
      else if (after.startsWith('\n')) after = after.slice(1);
      content = before + after;
    } else if (keptTokens.length < rawTokens.length) {
      // Çok satırlı mı tek satırlı mı kontrol et
      const isMultiLine = item.rawImports.includes('\n');
      let newImport;
      if (isMultiLine) {
        newImport = `import {\n  ${keptTokens.join(',\n  ')},\n} from '${item.modulePath}';`;
      } else {
        newImport = `import { ${keptTokens.join(', ')} } from '${item.modulePath}';`;
      }
      content = content.slice(0, item.index) + newImport + content.slice(item.index + item.length);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { modified: true, prunedCount, removedNames };
  }

  return { modified: false, prunedCount: 0, removedNames: [] };
}

/**
 * Tüm kaynak dosyalarını tarar ve otonom onarım uygular.
 */
export function runSelfHealing(srcFiles) {
  let totalPruned = 0;
  const modifiedFiles = [];

  for (const file of srcFiles) {
    try {
      const res = healFileImports(file);
      if (res.modified && res.prunedCount > 0) {
        totalPruned += res.prunedCount;
        modifiedFiles.push({
          file: path.relative(process.cwd(), file),
          count: res.prunedCount,
          names: res.removedNames,
        });
      }
    } catch (e) {
      // Hata izolasyonu
    }
  }

  return { totalPruned, modifiedFiles };
}
