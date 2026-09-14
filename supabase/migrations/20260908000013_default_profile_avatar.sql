-- New members use the Kıstas mark until they upload a personal profile photo.
ALTER TABLE public.profiles
ALTER COLUMN avatar_url SET DEFAULT
  'https://pub-5d3e10585a6b46b39844142274f1ff63.r2.dev/system/kistas-logo.png';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Kıstas Üyesi'),
        'https://pub-5d3e10585a6b46b39844142274f1ff63.r2.dev/system/kistas-logo.png',
        NEW.phone
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

UPDATE public.profiles
SET avatar_url = 'https://pub-5d3e10585a6b46b39844142274f1ff63.r2.dev/system/kistas-logo.png',
    updated_at = NOW()
WHERE avatar_url IS NULL
   OR btrim(avatar_url) = ''
   OR avatar_url ILIKE '%lh3.googleusercontent.com/a/%';
