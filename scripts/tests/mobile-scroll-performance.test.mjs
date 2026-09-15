import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const targetFiles = [
  'App.tsx',
  'src/features/listings/presentation/DiscoverScreen.tsx',
  'src/features/listings/presentation/BrowseScreen.tsx',
  'src/features/listings/presentation/CategoryScreen.tsx',
  'src/features/profile/presentation/ProfileAndWalletScreen.tsx',
  'src/features/chat/presentation/ConversationsScreen.tsx',
  'src/shared/components/MobileBottomNav.tsx',
];

const sources = await Promise.all(targetFiles.map(async (file) => ({
  file,
  content: await readFile(file, 'utf8'),
})));

const combined = sources.map(({ content }) => content).join('\n');
assert.doesNotMatch(combined, /onScrollOffsetChange/, 'Kullanilmayan mobil scroll callback zinciri yeniden eklenmis.');
assert.doesNotMatch(combined, /BlurTargetView/, 'Android ekraninin tamamini canli blur hedefi yapan sarmalayici yeniden eklenmis.');

const mobileNavigation = sources.find(({ file }) => file.endsWith('MobileBottomNav.tsx'))?.content || '';
assert.doesNotMatch(mobileNavigation, /BlurView|expo-blur|blurMethod/, 'Mobil alt menude kaydirma FPS dusuren canli blur yeniden eklenmis.');
assert.match(mobileNavigation, /backgroundColor:\s*'#F8FAFD'/, 'Mobil alt menunun hafif statik cam yuzeyi eksik.');

const browseScreen = sources.find(({ file }) => file.endsWith('BrowseScreen.tsx'))?.content || '';
assert.match(browseScreen, /initialNumToRender=\{Platform\.OS === 'web' \? 24 : 8\}/, 'Mobil kategori listesi ilk render butcesi korunmuyor.');
assert.match(browseScreen, /removeClippedSubviews=\{Platform\.OS === 'android'\}/, 'Android kategori listesi ekran disi hucreleri kirpmiyor.');

console.log('Mobile scroll performance checks passed.');
