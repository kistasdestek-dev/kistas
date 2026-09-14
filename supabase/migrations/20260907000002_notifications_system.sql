-- KISTAS Notifications & User Activity System
-- Supports: launch_approved, upvote, review, message, system

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'launch_approved', 'upvote', 'review', 'message', 'system'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.notifications'::regclass AND polname = 'Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.notifications'::regclass AND polname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.notifications'::regclass AND polname = 'Users or triggers can insert notifications') THEN
    CREATE POLICY "Users or triggers can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (TRUE);
  END IF;
END
$$;

-- Trigger 1: When a listing is approved (status becomes 'active')
CREATE OR REPLACE FUNCTION public.trg_notify_listing_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.status = 'draft' OR OLD.status = 'inactive') AND NEW.status = 'active' THEN
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
            NEW.seller_id,
            'launch_approved',
            'Lansmanınız Onaylandı! 🚀',
            format('“%s” projeniz yönetici tarafından onaylandı ve vitrinde yayına alındı.', NEW.title),
            jsonb_build_object('listing_id', NEW.id, 'title', NEW.title)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_listing_approved ON public.listings;
CREATE TRIGGER trg_notify_listing_approved
    AFTER UPDATE OF status ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_notify_listing_approved();

-- Trigger 2: When someone upvotes a project (support)
CREATE OR REPLACE FUNCTION public.trg_notify_project_upvote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_id UUID;
    v_title TEXT;
    v_actor_name TEXT;
BEGIN
    SELECT seller_id, title INTO v_seller_id, v_title FROM public.listings WHERE id = NEW.project_id;
    
    -- Don't notify self
    IF v_seller_id IS NOT NULL AND v_seller_id <> NEW.user_id THEN
        SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
        IF v_actor_name IS NULL OR v_actor_name = '' THEN
            v_actor_name := 'Bir kullanıcı';
        END IF;

        INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
        VALUES (
            v_seller_id,
            NEW.user_id,
            'upvote',
            'Projenize Destek Geldi! ⚡',
            format('%s, “%s” projenize destek verdi (+1).', v_actor_name, v_title),
            jsonb_build_object('listing_id', NEW.project_id, 'title', v_title)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_upvote ON public.project_upvotes;
CREATE TRIGGER trg_notify_project_upvote
    AFTER INSERT ON public.project_upvotes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_notify_project_upvote();

-- Trigger 3: When someone reviews a project
CREATE OR REPLACE FUNCTION public.trg_notify_project_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_id UUID;
    v_title TEXT;
    v_actor_name TEXT;
BEGIN
    SELECT seller_id, title INTO v_seller_id, v_title FROM public.listings WHERE id = NEW.listing_id;
    
    -- Don't notify self
    IF v_seller_id IS NOT NULL AND v_seller_id <> NEW.reviewer_id THEN
        SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = NEW.reviewer_id;
        IF v_actor_name IS NULL OR v_actor_name = '' THEN
            v_actor_name := 'Bir kullanıcı';
        END IF;

        INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
        VALUES (
            v_seller_id,
            NEW.reviewer_id,
            'review',
            'Yeni Değerlendirme & Yorum! 💬',
            format('%s, “%s” projenize yorum ve %s yıldız verdi.', v_actor_name, v_title, NEW.rating),
            jsonb_build_object('listing_id', NEW.listing_id, 'title', v_title, 'rating', NEW.rating)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_review ON public.reviews;
CREATE TRIGGER trg_notify_project_review
    AFTER INSERT ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_notify_project_review();
