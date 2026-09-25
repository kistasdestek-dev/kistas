import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

const migration = read('supabase/migrations/20260924000001_google_and_kistas_profile_avatars.sql');
const modal = read('apps/web/src/components/profile/ProfileEditModal.tsx');
const avatarLib = read('apps/web/src/lib/avatar.ts');
const footerBanner = read('apps/web/src/components/FooterSloganBanner.tsx');
const routeFooter = read('apps/web/src/components/RouteAwareFooter.tsx');

assert.match(migration, /raw_user_meta_data->>'avatar_url'[\s\S]*raw_user_meta_data->>'picture'/);
assert.match(migration, /\^https:\/\/lh3\\\.googleusercontent\\\.com\//);
assert.match(migration, /get_byte\(decode\(md5\(NEW\.id::TEXT\), 'hex'\), 0\) % 4/);
assert.match(migration, /avatar_url = COALESCE\(public\.profiles\.avatar_url, EXCLUDED\.avatar_url\)/);
assert.match(modal, /document\.body\.style\.position = 'fixed'/);
assert.match(modal, /overscroll-contain/);
assert.match(modal, /KISTAS_AVATAR_PATHS\.map/);
assert.match(avatarLib, /toStoredAvatarUrl/);
assert.doesNotMatch(footerBanner, /onClick|role="button"|tabIndex|cursor-pointer|onPress/);
assert.match(routeFooter, /pathname === '\/browse'/);

for (let index = 1; index <= 4; index += 1) {
  const avatarPath = resolve(root, `apps/web/public/avatars/kistas-avatar-${index}.webp`);
  assert.equal(existsSync(avatarPath), true, `Kıstas avatarı ${index} eksik.`);
  assert.ok(statSync(avatarPath).size < 100_000, `Kıstas avatarı ${index} web bütçesini aşıyor.`);
}

console.log('Profile avatar, mobile modal lock and route footer checks passed.');
