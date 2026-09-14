-- Keep the official support identity visually consistent across the platform.
UPDATE public.profiles
SET avatar_url = 'https://pub-5d3e10585a6b46b39844142274f1ff63.r2.dev/system/kistas-logo.png',
    updated_at = NOW()
WHERE LOWER(full_name) = LOWER('Kıstas Destek')
   OR id IN (
       SELECT auth_user.id
       FROM auth.users AS auth_user
       WHERE LOWER(auth_user.email) = 'kistasdestek@gmail.com'
   );
