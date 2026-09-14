import { cp, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');

function runCommand(command, args) {
  return new Promise((res, rej) => {
    const isWindows = process.platform === 'win32';
    const proc = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: isWindows,
    });
    proc.on('close', (code) => {
      if (code === 0) res();
      else rej(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function ensureFonts() {
  const publicFontsDir = join(projectRoot, 'public', 'fonts');
  await mkdir(publicFontsDir, { recursive: true });

  const fontFiles = [
    'Ionicons.ttf',
    'MaterialIcons.ttf',
    'MaterialCommunityIcons.ttf',
    'Feather.ttf',
    'FontAwesome.ttf',
  ];

  const sourceBase = join(
    projectRoot,
    'node_modules',
    '@expo',
    'vector-icons',
    'build',
    'vendor',
    'react-native-vector-icons',
    'Fonts'
  );

  for (const font of fontFiles) {
    const src = join(sourceBase, font);
    const dest = join(publicFontsDir, font);
    try {
      await cp(src, dest);
    } catch (err) {
      console.warn(`Font kopyalanamadi: ${font}`, err.message);
    }
  }
}

async function syncDirectory(source, target) {
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
}

async function main() {
  console.log('--- [KISTAS WEB BUILD] Baslatiliyor ---');
  await ensureFonts();

  console.log('--- Expo Web Export (dist) ---');
  await runCommand('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist']);
  await runCommand('node', ['scripts/generate-seo-pages.mjs', 'dist']);

  console.log('--- dist-web Esitleniyor (Her iki cikti klasorunu destekleme) ---');
  const distDir = join(projectRoot, 'dist');
  const distWebDir = join(projectRoot, 'dist-web');
  await syncDirectory(distDir, distWebDir);

  const headersSrc = join(projectRoot, 'public', '_headers');
  await cp(headersSrc, join(distDir, '_headers')).catch(() => {});
  await cp(headersSrc, join(distWebDir, '_headers')).catch(() => {});

  console.log('--- Web Asset Hazirligi ve Sikistirma ---');
  await runCommand('node', ['scripts/prepare-web-assets.mjs', 'dist']);
  await runCommand('node', ['scripts/prepare-web-assets.mjs', 'dist-web']);

  console.log('--- [KISTAS WEB BUILD] Basariyla tamamlandi ---');
}

main().catch((err) => {
  console.error('[KISTAS WEB BUILD HATA]:', err);
  process.exit(1);
});
