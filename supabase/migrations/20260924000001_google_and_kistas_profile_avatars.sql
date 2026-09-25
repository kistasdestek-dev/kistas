-- Yeni profiller Google fotoğrafını güvenli allowlist üzerinden devralır.
-- Sağlayıcı fotoğrafı yoksa kullanıcı kimliğine göre dört Kıstas avatarından biri atanır.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_provider_avatar TEXT;
    v_avatar_url TEXT;
    v_avatar_index INTEGER;
BEGIN
    v_provider_avatar := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
    );
    v_avatar_index := (get_byte(decode(md5(NEW.id::TEXT), 'hex'), 0) % 4) + 1;

    IF v_provider_avatar ~* '^https://lh3\.googleusercontent\.com/' THEN
        v_avatar_url := v_provider_avatar;
    ELSE
        v_avatar_url := format(
            'https://www.kistas.com.tr/avatars/kistas-avatar-%s.webp',
            v_avatar_index
        );
    END IF;

    INSERT INTO public.profiles (id, full_name, avatar_url, phone)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            'Topluluk Üyesi'
        ),
        v_avatar_url,
        NEW.phone
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = NOW()
    WHERE public.profiles.id = EXCLUDED.id;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
