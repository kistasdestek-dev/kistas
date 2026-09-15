-- Separate the original developer from the Kistas account that publishes an
-- editorial discovery record. This prevents editorial imports from implying
-- that Kistas developed or officially represents the referenced application.

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS developer_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS is_editorial BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS listings_editorial_attribution_check;

ALTER TABLE public.listings
    ADD CONSTRAINT listings_editorial_attribution_check CHECK (
        NOT is_editorial
        OR (
            developer_name IS NOT NULL
            AND length(btrim(developer_name)) BETWEEN 1 AND 150
            AND play_store_url LIKE 'https://play.google.com/store/apps/details?id=%'
        )
    );

UPDATE public.listings
SET developer_name = CASE play_store_url
        WHEN 'https://play.google.com/store/apps/details?id=com.deepix.animefypic&hl=tr' THEN 'DeePix AI Apps'
        WHEN 'https://play.google.com/store/apps/details?id=com.aloha.browser&hl=tr' THEN 'Aloha Mobile'
        WHEN 'https://play.google.com/store/apps/details?id=com.vivaldi.browser&hl=tr' THEN 'Vivaldi Technologies'
        WHEN 'https://play.google.com/store/apps/details?id=net.quetta.browser&hl=tr' THEN 'Quetta Networks'
        WHEN 'https://play.google.com/store/apps/details?id=com.vova.app&hl=tr' THEN 'PokerMan'
        WHEN 'https://play.google.com/store/apps/details?id=com.youku.international.phone&hl=tr' THEN 'YOUKU'
        WHEN 'https://play.google.com/store/apps/details?id=com.storymatrix.drama&hl=tr' THEN 'STORYMATRIX'
    END,
    is_editorial = TRUE,
    price = NULL,
    updated_at = clock_timestamp()
WHERE play_store_url IN (
    'https://play.google.com/store/apps/details?id=com.deepix.animefypic&hl=tr',
    'https://play.google.com/store/apps/details?id=com.aloha.browser&hl=tr',
    'https://play.google.com/store/apps/details?id=com.vivaldi.browser&hl=tr',
    'https://play.google.com/store/apps/details?id=net.quetta.browser&hl=tr',
    'https://play.google.com/store/apps/details?id=com.vova.app&hl=tr',
    'https://play.google.com/store/apps/details?id=com.youku.international.phone&hl=tr',
    'https://play.google.com/store/apps/details?id=com.storymatrix.drama&hl=tr'
);

