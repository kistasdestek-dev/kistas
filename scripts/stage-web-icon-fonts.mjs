import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const bundleDirectory = new URL('../dist/_expo/static/js/web/', import.meta.url);
const fontDirectory = new URL('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/', import.meta.url);
const fontUrl = /\/assets\/node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/([A-Za-z0-9_]+)\.([0-9a-f]{32})\.ttf/g;

const bundles = (await readdir(bundleDirectory)).filter((file) => file.endsWith('.js'));
const assets = new Map();

for (const bundle of bundles) {
  const source = await readFile(new URL(bundle, bundleDirectory), 'utf8');
  for (const match of source.matchAll(fontUrl)) {
    const [, name] = match;
    assets.set(match[0], name);
  }
}

for (const [url, name] of assets) {
  const destination = new URL(`../dist${url}`, import.meta.url);
  await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
  await copyFile(new URL(`${name}.ttf`, fontDirectory), destination);
  console.log(`Icon font staged: ${url}`);
}

for (const name of ['Ionicons', 'MaterialIcons', 'MaterialCommunityIcons']) {
  if (![...assets.values()].includes(name)) {
    throw new Error(`${name} asset URL was not found in the web bundle`);
  }
}
