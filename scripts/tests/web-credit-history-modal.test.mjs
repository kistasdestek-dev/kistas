import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
const modal = read('apps/web/src/components/profile/CreditHistoryModal.tsx');
const scrollLock = read('apps/web/src/hooks/useBodyScrollLock.ts');

assert.match(scrollLock, /let activeLocks = 0/, 'Ortak scroll kilidi üst üste açılan modalları saymalı');
assert.match(scrollLock, /body\.style\.position = 'fixed'/, 'Mobil arka sayfa fixed body ile sabitlenmeli');
assert.match(scrollLock, /html\.style\.overflow = 'hidden'/, 'Belge taşması modal açıkken kapanmalı');
assert.match(scrollLock, /body\.style\.top = `-\$\{scrollY\}px`/, 'Mevcut sayfa konumu body top değerinde korunmalı');
assert.match(scrollLock, /window\.scrollTo\(\{ top: previous\.scrollY, left: 0, behavior: 'auto' \}\)/, 'Son modal kapanınca kaydırma konumu geri yüklenmeli');
assert.match(scrollLock, /scrollbarWidth[\s\S]*body\.style\.paddingRight/, 'Masaüstü scrollbar kaybı yatay sıçrama oluşturmamalı');

assert.match(modal, /useBodyScrollLock\(isOpen\)/, 'Kredi hareketleri ortak scroll kilidini kullanmalı');
assert.match(modal, /overscroll-none/, 'Modal backdrop dokunma zincirini kesmeli');
assert.match(modal, /touch-pan-y overflow-y-auto overscroll-contain/, 'Yalnız modal iç listesi dikey kaymalı');
assert.match(modal, /\[-webkit-overflow-scrolling:touch\]/, 'iOS momentum kaydırması korunmalı');
assert.match(modal, /\['all', 'Tümü'\][\s\S]*\['in', 'Gelen'\][\s\S]*\['out', 'Kullanılan'\]/, 'Kredi hareketleri gelen ve kullanılan filtrelerini sunmalı');
assert.match(modal, /groupedTransactions\.map/, 'İşlemler tarih gruplarıyla gösterilmeli');
assert.match(modal, /shiny-cta--citrus[\s\S]*Kredi Al/, 'Kredi al aksiyonu Citrus Glass kullanmalı');
assert.match(modal, /role="dialog"[\s\S]*aria-modal="true"/, 'Kredi hareketleri erişilebilir modal semantiği taşımalı');

for (const fileName of [
  'NotificationsModal.tsx',
  'AccountSecurityModal.tsx',
  'ProjectDeleteModal.tsx',
  'SignOutConfirmModal.tsx',
  'BadgeCodeModal.tsx',
  'ProfileEditModal.tsx',
  'VisibilityManagementModal.tsx',
]) {
  const source = read(`apps/web/src/components/profile/${fileName}`);
  assert.match(source, /useBodyScrollLock\(/, `${fileName} ortak scroll kilidini kullanmalı`);
}

for (const fileName of ['ProfileEditModal.tsx', 'VisibilityManagementModal.tsx']) {
  const source = read(`apps/web/src/components/profile/${fileName}`);
  assert.doesNotMatch(source, /document\.body\.style\.position/, `${fileName} paralel body-lock kodu tutmamalı`);
}

console.log('Credit history redesign and shared modal scroll lock contracts passed.');
