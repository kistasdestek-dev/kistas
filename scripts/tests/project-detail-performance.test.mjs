import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const pageSource = read('../../apps/web/src/app/(public)/listings/[id]/page.tsx');
const actionsSource = read('../../apps/web/src/app/actions/listings.ts');
const detailSource = read('../../apps/web/src/components/ProjectDetailExperienceClient.tsx');
const lazyCommentsSource = read('../../apps/web/src/components/ProjectCommentsLazySection.tsx');
const commentsSource = read('../../apps/web/src/components/ProjectCommentsSection.tsx');
const commentsCssSource = read('../../apps/web/src/components/ProjectCommentsSection.module.css');
const gallerySource = read('../../apps/web/src/components/ProjectScreenshotsGallery.tsx');
const globalStylesSource = read('../../apps/web/src/app/globals.css');

assert.doesNotMatch(pageSource, /getListingComments/, 'Proje detay sunucu renderı yorum listesini beklememeli');
assert.match(detailSource, /ProjectCommentsLazySection/, 'Proje detayı hafif yorum başlatıcısını kullanmalı');
assert.doesNotMatch(detailSource, /import \{ ProjectCommentsSection \}/, 'Ağır yorum paneli başlangıç paketine statik girmemeli');
assert.match(lazyCommentsSource, /dynamic\(/, 'Yorum paneli ayrı istemci parçası olmalı');
assert.match(lazyCommentsSource, /Promise\.all\(/, 'Yorum verisi ve panel kodu kullanıcı niyetinde paralel yüklenmeli');
assert.match(lazyCommentsSource, /loadProjectCommentsAction\(projectId\)/, 'Yorumlar yalnız etkileşim sonrasında istenmeli');
assert.match(lazyCommentsSource, /Tekrar Dene/, 'Yorum yükleme hatası kontrollü tekrar deneme sunmalı');
assert.match(actionsSource, /UUID_PATTERN\.test\(projectId\)/, 'Public yorum okuması proje kimliğini doğrulamalı');
assert.match(actionsSource, /getListingComments\(createAnonClient\(\), projectId\)/, 'Public yorum okuması anon RLS istemcisinde kalmalı');
assert.match(commentsSource, /open:\s*isOpen/, 'Yorum paneli hafif başlatıcı tarafından kontrol edilmeli');
assert.match(commentsSource, /styles\.panel/, 'Yorum paneli route-lazy CSS modülünü kullanmalı');
assert.match(commentsCssSource, /\.panel[\s\S]*\.scroll[\s\S]*\.sheetEnter/, 'Yorum paneli stilleri bileşen CSS paketinde bulunmalı');
assert.doesNotMatch(globalStylesSource, /k-comments-feed-panel|k-comments-scroll|k-sheet-enter/, 'Lazy yorum stillerinin global CSS kopyası kalmamalı');
assert.match(gallerySource, /loading=\{index === 0 \? 'eager' : 'lazy'\}/, 'Yalnız ilk ekran görüntüsü eager yüklenmeli');
assert.match(gallerySource, /fetchPriority=\{index === 0 \? 'high' : 'auto'\}/, 'İlk ekran görüntüsü ağ önceliği almalı');
assert.match(detailSource, /\{feedbackModal\.isOpen && \(/, 'Geri bildirim modalı yalnız açıkken mount edilmeli');
assert.match(detailSource, /\{isBadgeModalOpen && \(/, 'Rozet modalı yalnız açıkken mount edilmeli');
assert.match(detailSource, /\{isShareModalOpen && \(/, 'Paylaşım modalı yalnız açıkken mount edilmeli');

console.log('Project detail lazy-loading and critical-path performance checks passed.');
