-- Kistas editorial launch catalog sourced from the public Google Play listings
-- supplied by the site owner. Records use one real Kistas editor profile and
-- remain ordinary listings, so the existing listing_images FK ON DELETE CASCADE
-- removes their image rows when an admin deletes a seeded project.

DO $$
DECLARE
    v_editor_id UUID;
    v_listing_id UUID;
    v_item JSONB;
    v_image_url TEXT;
    v_image_order SMALLINT;
BEGIN
    SELECT auth_user.id
      INTO v_editor_id
      FROM auth.users AS auth_user
     WHERE lower(auth_user.email) = 'kistasdestek@gmail.com'
     ORDER BY auth_user.created_at
     LIMIT 1;

    IF v_editor_id IS NULL THEN
        RAISE EXCEPTION 'Kistas editor account was not found; editorial catalog was not seeded';
    END IF;

    FOR v_item IN
        SELECT value
          FROM jsonb_array_elements($catalog$
          [
            {
              "title": "Shots – Yapay Zeka Foto Video",
              "tagline": "Tek fotoğrafla yapay zeka videoları ve yaratıcı portreler üretin.",
              "description": "Shots; özçekimleri, portreleri ve grup fotoğraflarını yapay zeka destekli videolara ve görsellere dönüştüren bir fotoğraf ve video aracıdır. Dans videoları, stil değişimi, arka plan kaldırma, görüntü iyileştirme ve farklı portre efektleri sunar.\n\nKaynak: Google Play. Geliştirici: DeePix AI Apps. Kıstas editörleri tarafından mağaza bilgileri temel alınarak derlenmiştir.",
              "category": "app-photo-video",
              "pricing": "freemium",
              "play_url": "https://play.google.com/store/apps/details?id=com.deepix.animefypic&hl=tr",
              "logo": "https://play-lh.googleusercontent.com/iR1PJaiBDiOoyXxuqgBvoTq6Ij6Vhq9WC1s712bjxecUOyMfgQ2pavQscTM2nDm0CNrEqZHsQQnsctYRA7tbAQ=w240-h480-rw",
              "age_hours": 4,
              "images": [
                "https://play-lh.googleusercontent.com/E67l6LSCG5l3H0WQ1sy3zUZyyYEIY2z_OfFIzfXrdOnNnl7L5-R4xKYoK2qsbwil2uVxVQ6LrJqEvbjSoBAO9w=w526-h296-rw",
                "https://play-lh.googleusercontent.com/qXhMxF8eOPYw5YhllV7EtCiunFesV9oAZhVOC4NmZVsH6vVGVPiFHXocPEFGeGzcp1RA4jv8K0P8hhvddw5utZk=w526-h296-rw",
                "https://play-lh.googleusercontent.com/Jfs7BxLijjvImKeLKzy29GxvSaXyIVVKEV8n6CK_iyIOFOFFwmNZ5qv4ELCsGA9inCYmT9ndw0ybCaejG1dX=w526-h296-rw",
                "https://play-lh.googleusercontent.com/7ApbNO0ZzIAae3F30toPtbQd7nhw_f59zRby6yKXXe1pjsxHP3ldqqNzCbIg0IrhPUkBfX1zjMOPbAiaTLF1bw=w526-h296-rw"
              ]
            },
            {
              "title": "Aloha Özel Tarayıcı - VPN",
              "tagline": "Yerleşik VPN ve reklam engelleyiciyle özel ve hızlı gezinme.",
              "description": "Aloha; yerleşik VPN, reklam engelleyici, kilitlenebilir özel sekmeler ve dosya kasası sunan gizlilik odaklı bir mobil tarayıcıdır. İndirme yöneticisi ve Wi-Fi üzerinden dosya paylaşımı gibi araçları tek uygulamada birleştirir.\n\nKaynak: Google Play. Geliştirici: Aloha Mobile. Kıstas editörleri tarafından mağaza bilgileri temel alınarak derlenmiştir.",
              "category": "app-utilities",
              "pricing": "freemium",
              "play_url": "https://play.google.com/store/apps/details?id=com.aloha.browser&hl=tr",
              "logo": "https://play-lh.googleusercontent.com/hB8lRmj-f_T4blwrtm5nwIybF-TRmEIFvdWOUdlw0uPsK97atf_rNUpYXRrFxAGwirVSXqyM251Zs4XIVSoXOA=w240-h480-rw",
              "age_hours": 10,
              "images": [
                "https://play-lh.googleusercontent.com/MYBZHHBGUE5ugxgk1-UleVJOa8R2rj9DC6LyH-jzwHq5B7ys_COwCueRowZAecP0ZVaPn3ThQxUoPaWOS-ZrabY=w526-h296-rw",
                "https://play-lh.googleusercontent.com/GwhwIrTlSOCYGXW_ED5BRM7SO45YWecEjcRwbVesQOiMGjY1FRNsdrFCTnlzgTq602d_cMRY4Gv1EfTvsBREdA=w526-h296-rw",
                "https://play-lh.googleusercontent.com/XBche29WoDq60UH6WFH9wqitYtphozqQsXk5YKO6fR0_PwAZuLnUUMy5PqofD4aFYYYZHXa4cTbHbZxpJgXp=w526-h296-rw",
                "https://play-lh.googleusercontent.com/tVEKvdneK9Fv3xgnV_qODRSHdmjQnpdBCxAvbDlRggPFpbAgPKr9dPJCMAbpFpNU_aQ09MAq3gsZtUZsD-oUFNU=w526-h296-rw"
              ]
            },
            {
              "title": "Vivaldi Tarayıcı",
              "tagline": "Sekmelerinizi, gizliliğinizi ve tarama deneyiminizi kişiselleştirin.",
              "description": "Vivaldi; reklam ve izleyici engelleme, masaüstü tarzı sekmeler, karanlık ve özel mod, uçtan uca şifreli senkronizasyon, notlar ve tam sayfa ekran görüntüsü özellikleri sunar. Esnek arayüzüyle mobil tarayıcı deneyimini ayrıntılı biçimde kişiselleştirmeyi amaçlar.\n\nKaynak: Google Play. Geliştirici: Vivaldi Technologies. Kıstas editörleri tarafından mağaza bilgileri temel alınarak derlenmiştir.",
              "category": "app-utilities",
              "pricing": "free",
              "play_url": "https://play.google.com/store/apps/details?id=com.vivaldi.browser&hl=tr",
              "logo": "https://play-lh.googleusercontent.com/RNTChezdp-FkUkw6pldhlIi3uCeP_J6fQ0x5NwWfVV9tTdFZidR-z1V9MNVHww4sNdNLOQLw0yW6NJjVF1H0Fw=w240-h480-rw",
              "age_hours": 18,
              "images": [
                "https://play-lh.googleusercontent.com/aCuu6KfaEtZPiL6lKKX2mVvfP4ESVl6KasdC3uFJjB4PfITorH7TxgMSQp9beBFAnIb8I0m10Qlb_lCnyF50=w526-h296-rw",
                "https://play-lh.googleusercontent.com/SqeZ_W6GBcGoGAiyoT7L30k0hDmR-RksNVkK505rOkQcqW54kjYRjX2qWq_zShm-QYfM4UvR8P_H30a-La_ZSw=w526-h296-rw",
                "https://play-lh.googleusercontent.com/YW5coEt54C6-skDErzf6tChBDiG3825Ip75UKqnDlsrcEtj41lwZenTx8fTiFY02mmuxf2-Ou7Uq6hEd4f2WagE=w526-h296-rw",
                "https://play-lh.googleusercontent.com/xQGVNbwBCxb00RXLtDyZfR-n7aOoyDAxaPGh0HdVBgnMV11EsIp7zpm1HtOAmScYTTzoNRxq1AZ3Byekm-iFQQ=w526-h296-rw"
              ]
            },
            {
              "title": "Quetta - Video Private Browser",
              "tagline": "Video araçları ve mobil uzantı desteği sunan gizlilik odaklı tarayıcı.",
              "description": "Quetta, Chromium tabanlı hızlı bir mobil tarayıcıdır. Yerleşik video indirici, reklam ve izleyici engelleme, parmak izi koruması, medya kontrolleri ve desteklenen Chrome ile Edge uzantılarını mobilde kullanma özelliklerini bir araya getirir.\n\nKaynak: Google Play. Geliştirici: Quetta Networks. Kıstas editörleri tarafından mağaza bilgileri temel alınarak derlenmiştir.",
              "category": "app-utilities",
              "pricing": "free",
              "play_url": "https://play.google.com/store/apps/details?id=net.quetta.browser&hl=tr",
              "logo": "https://play-lh.googleusercontent.com/1FaZo6GiqZndJNiU13TRbwlE67BEK9HRoUGyY6tjEccrN6Tv_CguBTzMR_ANtuNXbeQDGQFP9unh-hWI1Rhw=w240-h480-rw",
              "age_hours": 27,
              "images": [
                "https://play-lh.googleusercontent.com/L0MCkSH_8-YECMWTep7EodL_xeMo0xdkxRQWBdxGK2sitVnuiJVzOKk_pwM04onSo_8y6oqUy96y-9_XtaMsOg=w526-h296-rw",
                "https://play-lh.googleusercontent.com/XhJlUF4PnWdrDD0qWwead1yTrUShPpgqan8WU58Eesi6usZba3MQkEFOfTs2MpsvMzUEdCJdntmzBZ2jsjLk2sU=w526-h296-rw",
                "https://play-lh.googleusercontent.com/AgsL06LCU2TBnQo6epxlKV0SahBEalsSEC5toX6sYDUrY6nACnuzYajON7pFlQzfZR_0aTBiuto8OMv00aIL=w526-h296-rw",
                "https://play-lh.googleusercontent.com/aSFOYfluwkwQ_xZPNmeN2BjUDDixHoB4CERYQwu06vcRF6y7vpc4NpAD7C4iTXqVLbjqsRyM8EEkOoSB2WOc7q4=w526-h296-rw"
              ]
            },
            {
              "title": "VOVA Group Voice Party",
              "tagline": "Sesli sohbet odalarında buluşun, etkinliklere katılın ve sosyalleşin.",
              "description": "VOVA, kullanıcıların sesli sohbet odalarında iletişim kurmasına, çevrimiçi etkinliklere katılmasına, anlık mesajlaşmasına ve kişiselleştirilmiş profillerle yeni insanlarla tanışmasına odaklanan bir sosyal topluluk uygulamasıdır.\n\nKaynak: Google Play. Geliştirici: PokerMan. Kıstas editörleri tarafından mağaza bilgileri temel alınarak derlenmiştir.",
              "category": "app-social",
              "pricing": "freemium",
              "play_url": "https://play.google.com/store/apps/details?id=com.vova.app&hl=tr",
              "logo": "https://play-lh.googleusercontent.com/Pp7J0LKoE4BDjhvZ56oALv6BUwP7MGTvSa6386aZpAe0vpUmWZH5MZg5OLU00AHthjv6FulZhnzqBPC7B6G3HQ=w240-h480-rw",
              "age_hours": 38,
              "images": [
                "https://play-lh.googleusercontent.com/SpyWoJznc17uM1f9VBflCJGAW4rQodYyaxtyf_1T1Ztz-cZnLYY8INGSjB8x7lGvZNrVMjy9tLcrkkuSUCPSs4I=w526-h296-rw",
                "https://play-lh.googleusercontent.com/bbRPgacIqWFI107nOWp1NjsUD2lpyC02nacXid3orAIKZNlCR-m7W7SkOpPMr58aZ4-UKmpXQXLV72JihEYRei8=w526-h296-rw",
                "https://play-lh.googleusercontent.com/PsfIYeGkoxU2qZMfEbsdbhpQnJghsdjyfG6iZfgtOhD-9NXm470QHZTQSMvFLYGQ8z5nJeTVDxhHh6qhr1i0nQ=w526-h296-rw",
                "https://play-lh.googleusercontent.com/5MzOXRHy-tE9XTnhwwLXNDDCJiYFjOA5lrQRLbDEzgOWXWIDXQU6Pkv_bzTEU9pK1BtK7dLvgW_Oi61brQce=w526-h296-rw"
              ]
            },
            {
              "title": "YOUKU - Drama, Film, Show, Anime",
              "tagline": "Asya dizileri, filmler ve animeleri çok dilli seçeneklerle izleyin.",
              "description": "YOUKU; Çin ve Asya dizileri, filmler, anime, eğlence programları ve kısa diziler sunan bir yayın platformudur. Çok dilli altyazı ve dublaj, çevrimdışı izleme, cihazlar arasında ilerleme eşitleme ve ekran yansıtma seçeneklerini destekler.\n\nKaynak: Google Play. Geliştirici: YOUKU. Kıstas editörleri tarafından mağaza bilgileri temel alınarak derlenmiştir.",
              "category": "app-entertainment",
              "pricing": "freemium",
              "play_url": "https://play.google.com/store/apps/details?id=com.youku.international.phone&hl=tr",
              "logo": "https://play-lh.googleusercontent.com/FBDWFz1vHLA4kmIeE255tKNDxibChLAVQ8MSrrAxUPfYp0inm16nf-ZMIwBWW7edQ6mtymAEWeqRhkny-H47=w240-h480-rw",
              "age_hours": 52,
              "images": [
                "https://play-lh.googleusercontent.com/30KSdDoNnX07vSXUUV3E9eaTJWekjzjgNLBXGMaaPoPUTwxuP9iEOmucQmJ5tizp_jDP8j2BIpcdW8lRuERL1I8=w526-h296-rw",
                "https://play-lh.googleusercontent.com/gx0jYMCPJ1rNHeuavpYRdeVDZE7kCnlbRsO4AUeavuCjI-ixIRQckW93Kx6QxWiRy3nR4xRAdSo2rh1ifIrG=w526-h296-rw",
                "https://play-lh.googleusercontent.com/BtDlx6JkiHGnTOK3KOly-8UyQwJX4dt8uz_J7rXSnKKFmUH-LhKKYozcBuM22WRHfKo1GcuKXgPcuVOQ4muK=w526-h296-rw",
                "https://play-lh.googleusercontent.com/nDjxUnWENlGYc48NNTE6IcUIU1uLeQ1nD8XPOBfOHCk_OCLLKTxpcUHJypi-ulhIjut1fo4llPfMzTEsJ720Y2s=w526-h296-rw"
              ]
            },
            {
              "title": "DramaBox - Kısa Dizi Keyfi",
              "tagline": "Dikey kısa dizilerle romantizm, gerilim ve dramı cebinize taşıyın.",
              "description": "DramaBox, mobil izlemeye uygun kısa ve dikey dizilerden oluşan geniş bir eğlence kataloğu sunar. Romantizm, dram, gerilim ve farklı türlerde özgün yapımları kısa bölümler halinde keşfetmeye odaklanır.\n\nKaynak: Google Play. Geliştirici: STORYMATRIX. Kıstas editörleri tarafından mağaza bilgileri temel alınarak derlenmiştir.",
              "category": "app-entertainment",
              "pricing": "freemium",
              "play_url": "https://play.google.com/store/apps/details?id=com.storymatrix.drama&hl=tr",
              "logo": "https://play-lh.googleusercontent.com/GGi0g65ySR86svFuxny2J2FgfkTZuFlJcftmeAZ_bZ7sM86XfwUNL1h9omSyoRKha1c1-_BoFkUbyJz2VSXI=w240-h480-rw",
              "age_hours": 69,
              "images": [
                "https://play-lh.googleusercontent.com/XAO_g8qsbdZMhKGbPkp4pRJy-1s22yR2UHI4htKphKsmpcsvTtr7q0HHcu_RO_dyZBZ5kMhn-iHbGjD1r49OWA=w526-h296-rw",
                "https://play-lh.googleusercontent.com/eL0wRPdcHG338PBlROq5V0insjbZDVGIVjZo1mknc8SfZkPhrwnLM7pE9L9BdAby3kIsoRDBtzIPvBeLzGjbRG8=w526-h296-rw",
                "https://play-lh.googleusercontent.com/xBg7O-K-9l5Hd0PnBQMeGJlaiNoWRgm-PAbRX672_8ulbkn7xDdf1RmjqX-P1iFcoWGPr1HHhNhwJPb2BGWf=w526-h296-rw",
                "https://play-lh.googleusercontent.com/699XOQh5CeaVOLTmRgSJUGBdJSLBCNMou1PaoFKtK4AIRxdEWxLRC6TZr8HceV25b77jZ1kxB7YMvVC8bkiPcw=w526-h296-rw"
              ]
            }
          ]
          $catalog$::JSONB)
    LOOP
        SELECT listing.id
          INTO v_listing_id
          FROM public.listings AS listing
         WHERE listing.play_store_url = v_item->>'play_url'
         ORDER BY listing.created_at
         LIMIT 1;

        IF v_listing_id IS NULL THEN
            INSERT INTO public.listings (
                seller_id,
                category_id,
                title,
                tagline,
                description,
                logo_url,
                play_store_url,
                platforms,
                pricing_model,
                price,
                status,
                city,
                district,
                created_at,
                updated_at
            )
            SELECT
                v_editor_id,
                category.id,
                v_item->>'title',
                v_item->>'tagline',
                v_item->>'description',
                v_item->>'logo',
                v_item->>'play_url',
                ARRAY['Android']::TEXT[],
                v_item->>'pricing',
                1,
                'active'::listing_status,
                'Global',
                'Online',
                clock_timestamp() - make_interval(hours => (v_item->>'age_hours')::INTEGER),
                clock_timestamp()
              FROM public.categories AS category
             WHERE category.slug = v_item->>'category'
             RETURNING id INTO v_listing_id;

            IF v_listing_id IS NULL THEN
                RAISE EXCEPTION 'Category % was not found for %', v_item->>'category', v_item->>'title';
            END IF;
        END IF;

        v_image_order := 0;
        FOR v_image_url IN
            SELECT value #>> '{}'
              FROM jsonb_array_elements(v_item->'images')
        LOOP
            IF NOT EXISTS (
                SELECT 1
                  FROM public.listing_images AS image
                 WHERE image.listing_id = v_listing_id
                   AND image.image_url = v_image_url
            ) THEN
                INSERT INTO public.listing_images (listing_id, image_url, display_order, is_cover)
                VALUES (v_listing_id, v_image_url, v_image_order, v_image_order = 0);
            END IF;
            v_image_order := v_image_order + 1;
        END LOOP;

        v_listing_id := NULL;
    END LOOP;
END;
$$;
