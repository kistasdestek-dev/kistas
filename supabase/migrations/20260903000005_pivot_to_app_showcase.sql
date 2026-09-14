-- ============================================================================
-- 20260903000005_pivot_to_app_showcase.sql
-- MİMARİ DÖNÜŞÜM: İkinci el fiziksel pazar yerinden dijital proje & uygulama vitrinine
-- (Product Hunt + App Store + Bidding/Boost Hibriti)
-- ============================================================================

-- 1. Fiziksel pazar yeri kısıtlarını dijital projeler için esnetme
ALTER TABLE public.listings 
    ALTER COLUMN price DROP NOT NULL,
    ALTER COLUMN price SET DEFAULT 0,
    ALTER COLUMN city DROP NOT NULL,
    ALTER COLUMN city SET DEFAULT 'Global',
    ALTER COLUMN district DROP NOT NULL,
    ALTER COLUMN district SET DEFAULT 'Online',
    ALTER COLUMN delivery_type DROP NOT NULL,
    ALTER COLUMN cargo_size DROP NOT NULL;

-- 2. Dijital Proje / Uygulama Vitrin Alanlarını Ekleme
ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS tagline VARCHAR(220),
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS app_store_url TEXT,
    ADD COLUMN IF NOT EXISTS play_store_url TEXT,
    ADD COLUMN IF NOT EXISTS web_url TEXT,
    ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT ARRAY['iOS']::TEXT[],
    ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(30) DEFAULT 'freemium',
    ADD COLUMN IF NOT EXISTS upvotes_count INTEGER NOT NULL DEFAULT 0;

-- 3. UPVOTES TABLOSU (Topluluk Destekleme / Oylama)
CREATE TABLE IF NOT EXISTS public.project_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(project_id, user_id)
);

-- RLS Güvenlik Politikaları
ALTER TABLE public.project_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view project upvotes" ON public.project_upvotes;
CREATE POLICY "Public can view project upvotes"
    ON public.project_upvotes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can toggle upvotes" ON public.project_upvotes;
CREATE POLICY "Authenticated users can toggle upvotes"
    ON public.project_upvotes FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. ATOMİK UPVOTE RPC FONKSİYONU
CREATE OR REPLACE FUNCTION public.toggle_project_upvote(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_has_upvoted BOOLEAN;
    v_new_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Oturum açmanız gerekmektedir.');
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.project_upvotes 
        WHERE project_id = p_project_id AND user_id = v_user_id
    ) INTO v_has_upvoted;

    IF v_has_upvoted THEN
        DELETE FROM public.project_upvotes 
        WHERE project_id = p_project_id AND user_id = v_user_id;

        UPDATE public.listings 
        SET upvotes_count = GREATEST(0, upvotes_count - 1) 
        WHERE id = p_project_id 
        RETURNING upvotes_count INTO v_new_count;

        RETURN jsonb_build_object('success', true, 'action', 'unvoted', 'upvotes_count', v_new_count);
    ELSE
        INSERT INTO public.project_upvotes (project_id, user_id) 
        VALUES (p_project_id, v_user_id);

        UPDATE public.listings 
        SET upvotes_count = upvotes_count + 1 
        WHERE id = p_project_id 
        RETURNING upvotes_count INTO v_new_count;

        RETURN jsonb_build_object('success', true, 'action', 'upvoted', 'upvotes_count', v_new_count);
    END IF;
END;
$$;

-- 5. YENİ DİJİTAL KATEGORİLERİ TOHUMLAMA (Eski giyim/eşya yerine dijital kategoriler)
INSERT INTO public.categories (name, slug, icon_url, order_index, is_active) VALUES
    ('Yapay Zeka & ML', 'ai-ml', '🤖', 1, TRUE),
    ('Mobil Oyun & Eğlence', 'games', '🎮', 2, TRUE),
    ('Verimlilik & Araçlar', 'productivity', '⚡', 3, TRUE),
    ('Finans & Web3', 'fintech', '💳', 4, TRUE),
    ('Sosyal & Topluluk', 'social', '📱', 5, TRUE),
    ('Geliştirici Araçları', 'devtools', '🛠️', 6, TRUE),
    ('SaaS & B2B', 'saas', '💼', 7, TRUE),
    ('Tasarım & Yaratıcılık', 'design', '🎨', 8, TRUE)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    icon_url = EXCLUDED.icon_url,
    order_index = EXCLUDED.order_index;
