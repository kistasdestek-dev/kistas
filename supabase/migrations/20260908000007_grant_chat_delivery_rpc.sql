REVOKE ALL ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) TO authenticated;

COMMENT ON FUNCTION public.send_chat_message(UUID, TEXT, public.message_type, JSONB) IS
'Katılımcıların ve platform yöneticilerinin yetkisini sunucuda doğrulayarak mesajı güvenli biçimde iletir.';
