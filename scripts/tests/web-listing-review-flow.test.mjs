import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const actions = read('apps/web/src/app/actions/listings.ts');
const form = read('apps/web/src/components/CreateListingExperienceClient.tsx');
const profilePage = read('apps/web/src/app/(dashboard)/profile/page.tsx');
const profile = read('apps/web/src/components/ProfileExperienceClient.tsx');
const admin = read('apps/web/src/components/admin/AdminDashboardClient.tsx');
const adminModeration = read('apps/web/src/components/admin/AdminModerationView.tsx');
const adminPreview = read('apps/web/src/app/(dashboard)/admin/listings/[id]/preview/page.tsx');
const adminRepairMigration = read('supabase/migrations/20260927000005_repair_admin_dashboard_and_listing_approval.sql');

assert.match(actions, /status:\s*'draft'/, 'Yeni proje yönetici incelemesine draft olarak gitmeli');
assert.doesNotMatch(actions, /initialStatus\s*=\s*isAdmin\s*\?\s*'active'/, 'Yönetici formu onay sürecini atlamamalı');
assert.doesNotMatch(actions, /redirect\(`\/listings\/\$\{(?:data\.id|listingId)\}`\)/, 'Onay bekleyen proje public detaya yönlenmemeli');
assert.match(actions, /return \{ success: true as const, listingId: data\.id, status: 'draft' as const \}/);
assert.match(actions, /return \{ success: true as const, listingId, status: 'draft' as const \}/);
assert.match(form, /router\.push\('\/profile\?submission=created'\)/);
assert.match(form, /router\.push\('\/profile\?submission=updated'\)/);
assert.match(profilePage, /submission === 'created' \|\| submission === 'updated'/);
assert.match(profile, /Onaya gönderildi[\s\S]*Yönetici inceliyor[\s\S]*Onaylandı/);
assert.match(profile, /shiny-cta--citrus[^"]*flex-1[\s\S]{0,250}Kredi al/, 'Profil Kredi Al butonu Citrus glass kullanmalı');
assert.match(admin, /initialStats\.pending_listings > 0 \? 'moderation' : 'sponsors'/, 'Bekleyen proje varsa yönetim paneli onay kuyruğunu açmalı');
assert.match(adminModeration, /`\/admin\/listings\/\$\{item\.id\}\/preview`/, 'Bekleyen proje public 404 yerine korumalı önizlemeye gitmeli');
assert.match(adminPreview, /requireAdmin\(\)/, 'Taslak önizlemesi yönetici yetkisiyle korunmalı');
assert.match(adminPreview, /reviewPreview/, 'Yönetici önizlemesi etkileşimsiz mod kullanmalı');
assert.match(adminRepairMigration, /active_projects'[\s\S]*status = 'active'/, 'Yayındaki proje metriği gerçek enum durumunu kullanmalı');
assert.match(adminRepairMigration, /pending_projects'[\s\S]*status = 'draft'/, 'Onay kuyruğu metriği draft durumunu kullanmalı');
assert.doesNotMatch(adminRepairMigration, /status IN \('active', 'approved'\)|status IN \('draft', 'pending_review'\)/, 'Canlı listing enumunda olmayan durumlar sorgulanmamalı');
assert.match(adminRepairMigration, /set_config\([\s\S]*app\.kistas_listing_moderation/, 'Onay RPC işlemi proje kapsamlı moderasyon işareti üretmeli');
assert.match(adminRepairMigration, /current_setting\('app\.kistas_listing_moderation'[\s\S]*NEW\.id::TEXT \|\| ':' \|\| NEW\.status::TEXT/, 'Durum tetikleyicisi işareti proje ve hedef durumla eşlemeli');
assert.match(adminRepairMigration, /has_admin_permission\('launches'\)/, 'Onay hem RPC hem tetikleyicide launches yetkisi istemeli');
assert.match(adminRepairMigration, /p_status NOT IN \('active', 'banned'\)/, 'Yönetim durum RPC yüzeyi izinli durumlarla sınırlandırılmalı');
assert.match(adminRepairMigration, /DROP POLICY IF EXISTS "listings_read_public"[\s\S]*FOR SELECT TO anon[\s\S]*status = 'active'[\s\S]*FOR SELECT TO authenticated/, 'Hatalı legacy listing politikası kanonik anon ve authenticated politikalara dönüştürülmeli');

console.log('Listing review routing, progress and real admin workflow contracts passed.');
