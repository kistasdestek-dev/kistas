import assert from 'node:assert/strict';
import test from 'node:test';
import { getConversationIdentity } from '../../apps/web/src/components/chat/conversationIdentity.ts';
import { ChatService } from '../../apps/web/src/lib/services/chat.ts';

const memberId = 'member-1';
const adminId = 'admin-1';
const supportConversation = {
  id: 'conversation-1',
  listingId: null,
  buyerId: memberId,
  sellerId: adminId,
  otherParty: { id: memberId, fullName: 'Ayşenur Bayrak', avatarUrl: '/avatar.jpg' },
};

test('support staff sees the real member identity', () => {
  assert.deepEqual(getConversationIdentity(supportConversation, adminId), {
    isSupport: true,
    isOfficialSupport: false,
    name: 'Ayşenur Bayrak',
    avatarUrl: '/avatar.jpg',
    isVerified: false,
  });
});

test('member sees the official Kıstas support identity', () => {
  const memberConversation = {
    ...supportConversation,
    otherParty: { id: adminId, fullName: 'Support Admin', avatarUrl: '/admin.jpg' },
  };
  const identity = getConversationIdentity(memberConversation, memberId);
  assert.equal(identity.name, 'Kıstas Destek');
  assert.equal(identity.avatarUrl, null);
  assert.equal(identity.isOfficialSupport, true);
});

test('listing conversation shows its actual counterparty', () => {
  const identity = getConversationIdentity({ ...supportConversation, listingId: 'listing-1' }, adminId);
  assert.equal(identity.name, 'Ayşenur Bayrak');
  assert.equal(identity.isOfficialSupport, false);
});

test('new support conversations resolve each member profile by participant ID', async () => {
  const rows = [
    { id: 'conversation-1', listing_id: null, buyer_id: memberId, seller_id: adminId },
    { id: 'conversation-2', listing_id: null, buyer_id: 'member-2', seller_id: adminId },
  ];
  const requestedIds = [];
  const supabase = {
    from(table) {
      if (table === 'conversations') {
        return { select: () => ({ or: () => ({ order: async () => ({ data: rows, error: null }) }) }) };
      }
      assert.equal(table, 'profiles');
      return {
        select: () => ({
          in: async (_column, ids) => {
            requestedIds.push(...ids);
            return {
              data: [
                { id: memberId, full_name: 'Ayşenur Bayrak', avatar_url: '/avatar.jpg', is_verified: false },
                { id: 'member-2', full_name: 'İkinci Kullanıcı', avatar_url: null, is_verified: false },
              ],
              error: null,
            };
          },
        }),
      };
    },
  };

  const conversations = await ChatService.getConversations(supabase, adminId);
  assert.deepEqual(requestedIds, [memberId, 'member-2']);
  assert.deepEqual(conversations.map((conversation) =>
    getConversationIdentity(conversation, adminId).name
  ), ['Ayşenur Bayrak', 'İkinci Kullanıcı']);
});
