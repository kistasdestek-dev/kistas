import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260925000001_inbox_lifecycle_and_message_notifications.sql');
const supportLifecycle = read('supabase/migrations/20260912000002_support_conversation_lifecycle.sql');
const supportCloseRepair = read('supabase/migrations/20260927000001_repair_support_conversation_close.sql');
const conversationCard = read('apps/web/src/components/chat/ConversationCard.tsx');
const messagesExperience = read('apps/web/src/components/chat/MessagesExperienceClient.tsx');
const chatWindow = read('apps/web/src/components/chat/ChatWindow.tsx');
const messagesPage = read('apps/web/src/app/(dashboard)/messages/page.tsx');
const notificationProvider = read('apps/web/src/components/MessageNotificationProvider.tsx');
const notificationSettings = read('apps/web/src/components/chat/MessageNotificationSettings.tsx');
const chatService = read('apps/web/src/lib/services/chat.ts');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.notification_preferences/);
assert.match(migration, /USING \(auth\.uid\(\) = user_id\)/, 'Bildirim tercihi yalnız hesap sahibince okunmalı');
assert.match(migration, /DROP POLICY IF EXISTS "Users or triggers can insert notifications"/);
assert.match(migration, /REVOKE INSERT ON TABLE public\.notifications FROM authenticated/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.hide_conversation_for_current_user[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/);
assert.match(migration, /v_user_id = v_conversation\.buyer_id[\s\S]*buyer_hidden_at/);
assert.match(migration, /v_user_id = v_conversation\.seller_id[\s\S]*seller_hidden_at/);
assert.match(migration, /FORBIDDEN: Yalnızca görüşme katılımcıları/);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.(messages|conversations)/i, 'Inbox temizliği ortak mesaj verisini silmemeli');

assert.match(migration, /NEW\.type = 'system'/, 'Sistem mesajları glass bildirim üretmemeli');
assert.match(migration, /message_in_app_enabled/);
assert.match(migration, /v_recipient_id = NEW\.sender_id/);
assert.match(migration, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.notifications/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.trg_notify_chat_message\(\) FROM PUBLIC, anon, authenticated/);

assert.match(conversationCard, /pointerType !== 'touch'/, 'Mobil silme hareketi dokunmayla sınırlı olmalı');
assert.match(conversationCard, /translateX\(-\$\{swipeOffset\}px\)/);
assert.match(conversationCard, /Inbox’tan kaldır/, 'Masaüstü menüsünde güvenli kaldırma aksiyonu bulunmalı');
assert.match(messagesExperience, /ChatService\.hideConversation/);
assert.match(messagesExperience, /Yeni mesaj gelirse görüşme yeniden görünür/);
assert.match(chatService, /lastMessageAt[\s\S]*hiddenAt/, 'Yeni mesaj gizlenmiş görüşmeyi geri göstermeli');

assert.match(messagesPage, /get_current_admin_access/);
assert.match(messagesPage, /permissions\?\.includes\('community'\)/);
assert.match(chatWindow, /canManageSupport && isSupport && !isClosed/);
assert.match(messagesExperience, /ChatService\.closeSupportConversation/);
assert.match(supportLifecycle, /closed_at IS NULL[\s\S]*INSERT INTO public\.conversations/, 'Kapalı destekten sonra yeni görüşme oluşturulmalı');
assert.match(supportCloseRepair, /has_admin_permission\('community'\)/, 'Destek kapanışı görev bazlı community yetkisini doğrulamalı');
assert.match(supportCloseRepair, /FOR UPDATE/, 'Eşzamanlı kapanışlar hedef görüşmeyi kilitlemeli');
assert.match(supportCloseRepair, /listing_id IS NOT NULL[\s\S]*SUPPORT_CONVERSATION_NOT_FOUND/, 'Özel proje görüşmeleri destek RPC kapsamı dışında kalmalı');
assert.match(supportCloseRepair, /closed_at IS NOT NULL[\s\S]*already_closed/, 'Tekrarlanan kapanış idempotent olmalı');
assert.match(supportCloseRepair, /INSERT INTO public\.messages[\s\S]*'system'/, 'Kapanış kullanıcıya sistem mesajı bırakmalı');
assert.match(supportCloseRepair, /support_conversation_closed/, 'Kapanış append-only denetim kaydı üretmeli');
assert.doesNotMatch(supportCloseRepair, /SET[\s\S]{0,200}\bis_archived\s*=/i, 'Var olmayan legacy is_archived kolonu kullanılmamalı');

assert.match(notificationProvider, /table: 'notifications'/);
assert.match(notificationProvider, /pathname\.startsWith\('\/messages'\)/, 'Mesaj ekranında çift bildirim gösterilmemeli');
assert.match(notificationProvider, /slice\(0, 2\)/, 'Glass bildirim sayısı sınırlandırılmalı');
assert.match(notificationProvider, /onAuthStateChange/, 'Oturum sonradan açıldığında realtime aboneliği kurulmalı');
assert.match(notificationSettings, /set_message_notification_preference/);
assert.match(notificationSettings, /Bildirimleri kapat/);
assert.doesNotMatch(notificationSettings, />Mesaj bildirimleri</, 'Bildirim ayarı gereksiz başlığı göstermemeli');
assert.doesNotMatch(notificationSettings, /Site açıkken yeni mesajları/, 'Bildirim ayarı gereksiz açıklamayı göstermemeli');

console.log('Inbox lifecycle, admin support and in-app notification contracts passed.');
