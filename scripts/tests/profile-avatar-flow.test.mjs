import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

const migration = read('supabase/migrations/20260924000001_google_and_kistas_profile_avatars.sql');
const modal = read('apps/web/src/components/profile/ProfileEditModal.tsx');
const scrollLock = read('apps/web/src/hooks/useBodyScrollLock.ts');
const profileExperience = read('apps/web/src/components/ProfileExperienceClient.tsx');
const brandBar = read('apps/web/src/components/KistasTopBrandBar.tsx');
const avatarLib = read('apps/web/src/lib/avatar.ts');
const footerBanner = read('apps/web/src/components/FooterSloganBanner.tsx');
const routeFooter = read('apps/web/src/components/RouteAwareFooter.tsx');

assert.match(migration, /raw_user_meta_data->>'avatar_url'[\s\S]*raw_user_meta_data->>'picture'/);
assert.match(migration, /\^https:\/\/lh3\\\.googleusercontent\\\.com\//);
assert.match(migration, /get_byte\(decode\(md5\(NEW\.id::TEXT\), 'hex'\), 0\) % 4/);
assert.match(migration, /avatar_url = COALESCE\(public\.profiles\.avatar_url, EXCLUDED\.avatar_url\)/);
assert.match(modal, /useBodyScrollLock\(isOpen\)/);
assert.match(scrollLock, /body\.style\.position = 'fixed'/);
assert.match(modal, /overscroll-contain/);
assert.match(modal, /KISTAS_AVATAR_PATHS\.map/);
assert.match(modal, /rounded-full bg-transparent p-0/);
assert.doesNotMatch(modal, /bg-\[#0C1C35\]/);
assert.doesNotMatch(modal, /draftCity|draftDistrict|city:|district:|Şehir|İlçe/);
assert.doesNotMatch(profileExperience, /profile\?\.city|profile\?\.district|MapPin/);
assert.doesNotMatch(profileExperience, /Avatar Frame/);
assert.match(profileExperience, /h-\[72px\] w-\[72px\][^\"]*rounded-full object-cover/);
assert.doesNotMatch(brandBar, /Logo Plate|backdrop-blur-2xl|border-white\/20|bg-white\/\[0\.08\]/);
assert.match(avatarLib, /toStoredAvatarUrl/);
assert.doesNotMatch(footerBanner, /onClick|role="button"|tabIndex|cursor-pointer|onPress/);
assert.match(routeFooter, /pathname === '\/browse'/);
assert.match(routeFooter, /pathname === '\/credits'/);

for (let index = 1; index <= 4; index += 1) {
  const avatarPath = resolve(root, `apps/web/public/avatars/kistas-avatar-${index}.webp`);
  assert.equal(existsSync(avatarPath), true, `Kıstas avatarı ${index} eksik.`);
  assert.ok(statSync(avatarPath).size < 100_000, `Kıstas avatarı ${index} web bütçesini aşıyor.`);
}

console.log('Profile avatar, mobile modal lock and route footer checks passed.');
