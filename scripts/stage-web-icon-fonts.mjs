import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const bundleDirectory = new URL('../dist/_expo/static/js/web/', import.meta.url);
const indexFile = new URL('../dist/index.html', import.meta.url);
const fontDirectory = new URL('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/', import.meta.url);
const fontUrl = /\/assets\/node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/([A-Za-z0-9_]+)\.([0-9a-f]{32})\.ttf/g;

let index = await readFile(indexFile, 'utf8');
const bundles = (await readdir(bundleDirectory)).filter((file) => file.endsWith('.js') && index.includes(file));
const assets = new Map();

for (const bundle of bundles) {
  const source = await readFile(new URL(bundle, bundleDirectory), 'utf8');
  const updated = source.replace(fontUrl, (_url, name, hash) => {
    const publicUrl = `/fonts/${name}.${hash}.ttf`;
    assets.set(publicUrl, name);
    return publicUrl;
  });
  if (updated !== source) {
    const digest = createHash('sha256').update(updated).digest('hex').slice(0, 32);
    const renamed = bundle.replace(/-[0-9a-f]{32}\.js$/, `-${digest}.js`);
    if (renamed === bundle || !index.includes(bundle)) {
      throw new Error(`Web bundle reference was not found: ${bundle}`);
    }
    await writeFile(new URL(renamed, bundleDirectory), updated);
    index = index.replaceAll(bundle, renamed);
    await unlink(new URL(bundle, bundleDirectory));
    for (const extension of ['.br', '.gz']) {
      await unlink(new URL(`${bundle}${extension}`, bundleDirectory)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
}
for (const [url, name] of assets) {
  const destination = new URL(`../dist${url}`, import.meta.url);
  await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
  await copyFile(new URL(`${name}.ttf`, fontDirectory), destination);
  console.log(`Icon font staged: ${url}`);
}

for (const name of ['Ionicons', 'MaterialIcons', 'MaterialCommunityIcons']) {
  const stagedUrl = [...assets].find(([, assetName]) => assetName === name)?.[0];
  if (!stagedUrl) {
    throw new Error(`${name} asset URL was not found in the web bundle`);
  }
  index = index.replaceAll(`/fonts/${name}.ttf`, stagedUrl);
}

await writeFile(indexFile, index);
