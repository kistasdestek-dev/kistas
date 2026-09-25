import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260925000002_chat_presence_and_admin_announcements.sql');
const projectAnnouncementMigration = read('supabase/migrations/20260925000003_admin_announcements_allow_listing_path.sql');
const unlimitedAnnouncementMigration = read('supabase/migrations/20260925000004_remove_admin_announcement_hourly_limit.sql');
const chatService = read('apps/web/src/lib/services/chat.ts');
const chatWindow = read('apps/web/src/components/chat/ChatWindow.tsx');
const iconButton = read('apps/web/src/components/GlassIconButton.tsx');
const conversationCard = read('apps/web/src/components/chat/ConversationCard.tsx');
const messagesExperience = read('apps/web/src/components/chat/MessagesExperienceClient.tsx');
const provider = read('apps/web/src/components/MessageNotificationProvider.tsx');
const adminDashboard = read('apps/web/src/components/admin/AdminDashboardClient.tsx');
const adminAnnouncements = read('apps/web/src/components/admin/AdminAnnouncementsView.tsx');
const notificationCard = read('apps/web/src/components/GlobalNotificationCard.tsx');
const notificationsModal = read('apps/web/src/components/profile/NotificationsModal.tsx');
const profileExperience = read('apps/web/src/components/ProfileExperienceClient.tsx');
const notificationRules = read('apps/web/src/lib/notifications.ts');
const globalStyles = read('apps/web/src/app/globals.css');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.conversation_typing_states/);
assert.match(migration, /ALTER TABLE public\.conversation_typing_states ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /auth\.uid\(\) IN \(conversation\.buyer_id, conversation\.seller_id\)/);
assert.match(migration, /conversation\.listing_id IS NULL AND public\.has_admin_permission\('community'\)/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.set_conversation_typing[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/);
assert.match(migration, /INTERVAL '6 seconds'/, 'Yazıyor durumu kalıcı olmamalı');
assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.conversation_typing_states FROM authenticated/);

assert.match(chatService, /event: 'UPDATE'[\s\S]*table: 'messages'/, 'Okundu güncellemeleri gönderene Realtime ulaşmalı');
assert.match(chatService, /set_conversation_typing/);
assert.match(chatWindow, /Yazıyor/);
assert.match(chatWindow, /msg\.isRead \? 'text-\[#57A5FF\]' : 'text-\[#758399\]'/);
assert.match(chatWindow, /aria-label=\{msg\.isRead \? 'Görüldü' : 'İletildi'\}/);

assert.match(iconButton, /useReducedMotion/);
assert.match(iconButton, /animation === 'spin'/);
assert.match(messagesExperience, /supportIconControls\.start/);
assert.match(conversationCard, /arrowControls\.start/);

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.admin_announcements/);
assert.match(migration, /NOT public\.has_admin_permission\('community'\)/, 'Duyuru yetkisi sunucuda doğrulanmalı');
assert.match(migration, /p_action_path NOT IN \('\/', '\/browse', '\/new', '\/popular', '\/blog'\)/);
assert.match(migration, />= 5[\s\S]*RATE_LIMITED/, 'Saatlik duyuru kotası bulunmalı');
assert.match(migration, /pg_advisory_xact_lock/, 'Eşzamanlı gönderimler kota kilidini aşmamalı');
assert.match(migration, /ON CONFLICT \(created_by, idempotency_key\) DO NOTHING/);
assert.match(migration, /INSERT INTO public\.notifications[\s\S]*FROM public\.profiles AS profile/);
assert.match(migration, /admin_announcement_sent/);
assert.match(provider, /row\.type === 'admin_announcement'/);
assert.match(provider, /isValidAnnouncementPath/);
assert.match(provider, /AnimatePresence/);
assert.match(provider, /useReducedMotion/);
assert.match(provider, /logoUrl: row\.data\?\.logo_url/);
assert.match(adminDashboard, /permissions\?\.includes\('community'\)/);
assert.match(adminDashboard, /AdminAnnouncementsView/);
assert.match(adminAnnouncements, /admin_send_announcement/);
assert.match(adminAnnouncements, /Kıstas’ta yayında/);
assert.doesNotMatch(adminAnnouncements, /🚀|Yeni Keşif/);
assert.match(adminAnnouncements, /GlobalNotificationCard/);
assert.doesNotMatch(adminAnnouncements, /Projeyi İncele/);
assert.match(notificationCard, /k-notification-glass/);
assert.match(notificationCard, /AutoTransparentLogo/);
assert.match(notificationCard, /object-contain/);
assert.doesNotMatch(notificationCard, /actionLabel/);
assert.match(provider, /sm:w-\[460px\]/);
assert.match(globalStyles, /\.k-notification-glass\s*\{[\s\S]*rgba\(9, 19, 38, 0\.62\)/);
assert.match(notificationsModal, /announcementLogoUrl/);
assert.match(profileExperience, /isValidAnnouncementPath/);
assert.match(notificationRules, /listingPathPattern/);
assert.match(notificationRules, /\{36\}/);

assert.match(projectAnnouncementMigration, /ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public\.listings/);
assert.match(projectAnnouncementMigration, /listing\.status = 'active'/);
assert.match(projectAnnouncementMigration, /'logo_url', v_listing_logo_url/);
assert.match(projectAnnouncementMigration, />= 5[\s\S]*RATE_LIMITED/);
assert.doesNotMatch(projectAnnouncementMigration, />= 10/);

assert.match(unlimitedAnnouncementMigration, /CREATE OR REPLACE FUNCTION public\.admin_send_announcement/);
assert.match(unlimitedAnnouncementMigration, /NOT public\.has_admin_permission\('community'\)/, 'Sınırsız duyuru yalnız topluluk yetkilisine açık olmalı');
assert.match(unlimitedAnnouncementMigration, /SET search_path = ''/);
assert.match(unlimitedAnnouncementMigration, /pg_advisory_xact_lock/);
assert.match(unlimitedAnnouncementMigration, /ON CONFLICT \(created_by, idempotency_key\) DO NOTHING/);
assert.match(unlimitedAnnouncementMigration, /listing\.status = 'active'/);
assert.match(unlimitedAnnouncementMigration, /admin_announcement_sent/);
assert.doesNotMatch(unlimitedAnnouncementMigration, /RATE_LIMITED|INTERVAL '1 hour'|>= 5/, 'Yeni migration saatlik duyuru kotasını kaldırmalı');

console.log('Chat presence, read receipts, icon motion and admin announcement contracts passed.');
