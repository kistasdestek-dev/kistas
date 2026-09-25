import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const messagesSource = readFileSync(
  new URL('../../apps/web/src/components/chat/MessagesExperienceClient.tsx', import.meta.url),
  'utf8',
);
const chatWindowSource = readFileSync(
  new URL('../../apps/web/src/components/chat/ChatWindow.tsx', import.meta.url),
  'utf8',
);
const stylesSource = readFileSync(
  new URL('../../apps/web/src/app/globals.css', import.meta.url),
  'utf8',
);

assert.match(messagesSource, /viewport\?\.offsetTop/, 'iOS klavye açıldığında görünür viewport üst konumu izlenmeli');
assert.match(messagesSource, /--k-messages-vtop/, 'Görünür viewport üst konumu CSS değişkenine aktarılmalı');
assert.match(messagesSource, /visualViewport\?\.addEventListener\('scroll'/, 'Safari focus kaydırması ayrıca izlenmeli');
assert.match(messagesSource, /visualViewport\?\.removeEventListener\('scroll'/, 'Viewport scroll dinleyicisi temizlenmeli');
assert.match(stylesSource, /top:\s*var\(--k-messages-vtop,\s*0px\)/, 'Mesaj katmanı görünür viewport konumuna sabitlenmeli');
assert.match(chatWindowSource, /onFocus=\{handleComposerFocus\}/, 'Mesaj alanı odakta son mesajları görünür tutmalı');
assert.match(chatWindowSource, /scrollToBottom\('auto'\)/, 'Klavye animasyonu sırasında sohbet iç listesi en alta alınmalı');

console.log('iOS chat keyboard viewport contract checks passed.');
