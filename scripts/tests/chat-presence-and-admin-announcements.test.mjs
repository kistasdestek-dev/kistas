import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260925000002_chat_presence_and_admin_announcements.sql');
const chatService = read('apps/web/src/lib/services/chat.ts');
const chatWindow = read('apps/web/src/components/chat/ChatWindow.tsx');
const iconButton = read('apps/web/src/components/GlassIconButton.tsx');
const conversationCard = read('apps/web/src/components/chat/ConversationCard.tsx');
const messagesExperience = read('apps/web/src/components/chat/MessagesExperienceClient.tsx');
const provider = read('apps/web/src/components/MessageNotificationProvider.tsx');
const adminDashboard = read('apps/web/src/components/admin/AdminDashboardClient.tsx');
const adminAnnouncements = read('apps/web/src/components/admin/AdminAnnouncementsView.tsx');

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
assert.match(provider, /allowedAnnouncementPaths/);
assert.match(adminDashboard, /permissions\?\.includes\('community'\)/);
assert.match(adminDashboard, /AdminAnnouncementsView/);
assert.match(adminAnnouncements, /admin_send_announcement/);
assert.match(adminAnnouncements, /Tüm kullanıcılara gönder/);

console.log('Chat presence, read receipts, icon motion and admin announcement contracts passed.');
