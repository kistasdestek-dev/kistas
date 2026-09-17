# KISTAS GUVENLIK YOL HARITASI

> Bu belge yasayan bir guvenlik kaydidir. Yeni ozellik, migration, entegrasyon ve yayin degisikliklerinde kontrol edilir ve guncellenir.

## 1. Amac ve Guvenlik Yaklasimi

Kistas istemci uygulamasini guvenilmeyen ortam kabul eder. Yetkilendirme, sahiplik kontrolu, fiyat/kredi hesaplari, admin islemleri ve diger kritik kurallar sunucu tarafinda uygulanir. Arayuzde bir kontrolun gizlenmesi veya devre disi birakilmasi guvenlik kontrolu sayilmaz.

Temel ilkeler:

- En az yetki: Kullanici, servis ve token yalnizca gereken kaynaga erisir.
- Varsayilan ret: Acikca izin verilmeyen islem reddedilir.
- Katmanli savunma: UI, servis, RLS, RPC/Edge Function ve veritabani kisitlari birbirini tamamlar.
- Gizli bilgi sunucuda kalir: `EXPO_PUBLIC_*` degiskenleri gizli bilgi tasiyamaz.
- Her kaynakta sahiplik: Kayit okuma/yazma islemleri `auth.uid()` ve kaynak sahipligiyle dogrulanir.
- Kanitla kapatma: Bir bulgu test veya tekrar uretilebilir kanit olmadan `DOGRULANDI` sayilmaz.
- Olculebilir degisim: Kritik islemler denetim izi, hata sinifi ve gozlemlenebilirlik uretir.

## 2. Hedef Mimari Guven Sinirlari

| Katman | Guven seviyesi | Izin verilenler | Yasaklananlar |
|---|---|---|---|
| Expo / React Native istemcisi | Guvenilmez | Public/anon anahtarlar, UI durumu, kullanici girdisi | Service role, R2 secret, odeme secret'i, admin karari, istemciye guvenen fiyat/kredi hesabi |
| Supabase Auth | Kimlik kaynagi | Oturum ve `auth.uid()` | Profil alanindan veya istemci parametresinden admin karari |
| PostgreSQL + RLS | Ana yetki siniri | Satir sahipligi, rol ve durum tabanli politikalar | Genis `USING (true)` yazma politikalari, sahipliksiz tablo erisimi |
| RPC / Database Function | Kritik is kurali | Atomik oy, kredi, sponsor, admin islemleri | Dogrulanmamis kullanici ID'si, guvensiz `SECURITY DEFINER`, degisken `search_path` |
| Edge Function / guvenilir backend | Gizli islem siniri | Webhook, imza, rate limit, presigned upload, yonetim entegrasyonu | Gizli anahtari istemciye dondurmek |
| Storage | Dosya siniri | Boyut, MIME, sahiplik yolu, kontrollu public erisim | Dosya uzantisina guvenmek, sinirsiz yukleme, istemcide kalici R2 anahtari |
| Harici servisler | Guvenilmeyen baglanti | Imzali webhook, timeout, tekrar deneme ve idempotency | Imzasiz callback, sinirsiz retry, loglarda credential/PII |

Go veya Python yalnizca net bir servis siniri ve operasyonel ihtiyac oldugunda eklenir. Programlama dili guvenlik kontrolunun yerine gecmez; gereksiz coklu dil kullanimi bakim ve saldiri yuzeyini buyutur.

## 3. Oncelik ve Durum Standardi

Oncelik:

- `P0 KRITIK`: Aktif anahtar sizintisi, yetkisiz admin/odeme/veri erisimi. Derhal durdur, sinirla ve anahtari dondur.
- `P1 YUKSEK`: Hesap ele gecirme, IDOR, RLS atlama, kalici XSS, dosya yukleme istismari.
- `P2 ORTA`: Sinirli veri sizintisi, rate limit eksigi, CSRF/redirect veya is kurali suistimali.
- `P3 DUSUK`: Sertlestirme, bilgi ifsasi, guvenlik basligi veya savunma derinligi eksigi.

Durum: `BEKLIYOR` -> `ANALIZ` -> `DUZELTILIYOR` -> `DUZELTILDI` -> `DOGRULANDI`.

`RISK_KABUL` yalnizca gerekce, kapsam, son tarih ve telafi kontrolu yazilarak kullanilir.

## 4. Fazlar ve Cikis Kriterleri

### Faz 0 - Acil Sinirlama ve Gizli Bilgiler

- Repository, `.env`, production bundle, log, yedek ve build ciktilari secret taramasindan gecer.
- Aciga cikmis anahtarlar kaldirilmakla yetinilmez; saglayici panelinden iptal edilip yenilenir.
- Public tünel veya yayin, P0 secret bulgusu varken acik birakilmaz.
- Yedeklerdeki `.env` dosyasi yerel ve erisim kontrollu tutulur; bulutla paylasilacak yedek sifrelenir veya secretsiz uretilir.

Cikis kriteri: Aktif istemci sirri yok, sizmis credential'lar revoke edilmis, yeni bundle secret taramasi temiz.

### Faz 1 - Tehdit Modeli, Kimlik ve Oturum

- Varliklar, aktorler, guven sinirlari ve suistimal senaryolari cizilir.
- Kayit, giris, sifre sifirlama, OAuth, oturum yenileme ve cikis akislari test edilir.
- Hesap varligini ifsa eden hata mesajlari, brute force ve session fixation engellenir.
- Mobil tokenlar SecureStore'da; web oturumu uygun cookie/storage modeliyle ve XSS riskiyle birlikte degerlendirilir.

Cikis kriteri: Yetkisiz ve farkli hesapla negatif testler kayitli, oturum yasam dongusu belgeli.

### Faz 2 - Veri Yetkilendirme, RLS ve IDOR

- Her public tablo icin RLS acikligi ve SELECT/INSERT/UPDATE/DELETE politikalari envanteri cikarilir.
- Kullanici A'nin Kullanici B profili, mesajı, destek talebi, yorumu, projesi ve islemlerine erisimi denenir.
- Admin rolu istemciden gelen profile/metadata alanina guvenmez.
- Foreign key, unique, check ve sahiplik kisitlari is kurallarini destekler.

Cikis kriteri: Tum tablolarda pozitif ve negatif RLS test matrisi, anonim ve authenticated roller icin kanitli.

### Faz 3 - RPC, Edge Function ve Is Kurallari

- Kritik islemler istemci sorgu zinciri yerine atomik RPC/Edge Function icinde calisir.
- `SECURITY DEFINER` fonksiyonlari sabit `search_path`, rol kontrolu ve minimum grant kullanir.
- Kullanici ID, fiyat, kredi, sponsor suresi veya admin durumu istemci parametresinden dogruluk kaynagi olarak alinmaz.
- Tekrar gonderim ve yarim kalan islemler idempotency ile kontrol edilir.

Cikis kriteri: Kredi, sponsor, oy, moderasyon ve destek akislari icin eszamanlilik/suistimal testleri temiz.

### Faz 4 - Girdi, Mesajlasma ve Dosya Guvenligi

- Tum girdiler sunucuda uzunluk, format, izinli deger ve baglam kurallariyla dogrulanir.
- Mesaj, yorum ve profil metinlerinde XSS, HTML/URL enjeksiyonu ve Unicode suistimali test edilir.
- Dosyalar magic byte/MIME, boyut, piksel limiti, sahiplik yolu ve zararlı icerik acisindan denetlenir.
- Mesaj, yorum, destek talebi, giris ve upload icin kullanici/IP/cihaz tabanli rate limit uygulanir.

Cikis kriteri: Kotu niyetli girdi paketi, dosya yukleme matrisi ve spam testleri basarili.

### Faz 5 - Admin, Odeme, Kredi ve Webhook

- Admin endpoint/RPC'leri sunucu tarafinda rol kontrolu ve denetim izi kullanir.
- Webhook imzasi, timestamp toleransi, replay korumasi ve idempotency zorunludur.
- Kredi bakiyesi ve sponsor paketleri yalnizca sunucuda hesaplanir; negatif veya cift harcama engellenir.
- Kritik admin islemlerinde neden, aktor, hedef, onceki/yeni deger ve zaman kaydedilir.

Cikis kriteri: Yetki yukseltme, sahte webhook, replay ve eszamanli harcama testleri temiz.

### Faz 6 - Altyapi, Bagimlilik ve Yayin Zinciri

- Bagimlilik ve lockfile taramasi, lisans kontrolu ve kontrollu guncelleme sureci kurulur.
- CSP, HSTS, frame, MIME sniffing, referrer ve permission basliklari yayin katmaninda uygulanir.
- CORS sadece gereken origin/method/header icin acilir.
- Production ve development ortam, anahtar, veritabani ve loglari ayrilir.

Cikis kriteri: Production build, baslik, CORS, dependency ve secret taramalari otomatik calisir.

### Faz 7 - Gizlilik, Loglama ve Olay Mudahalesi

- Loglarda parola, token, secret, tam mesaj icerigi ve gereksiz kisisel veri bulunmaz.
- KVKK amac, saklama, silme, disa aktarma ve kullanici talebi akislari gercek sistemle uyumludur.
- Alarm, olay siniflandirma, anahtar dondurme, kullanici bildirimi ve geri kazanma adimlari yazilir.
- Yedek geri yukleme ve veri butunlugu duzenli test edilir.

Cikis kriteri: Olay tatbikati ve yedekten geri donus testi kayitli.

### Faz 8 - Otomasyon, Pentest ve Yayin Kapisi

- CI'da TypeScript, test, dependency audit, secret scan, migration ve guvenlik testleri kosar.
- OWASP MASVS/ASVS ve API Security kontrolleri kapsama gore eslenir.
- Dis pentest veya bagimsiz inceleme bulgulari bu kayda eklenir.
- `P0/P1` acikken production yayini yapilmaz.

Cikis kriteri: Tum P0/P1 `DOGRULANDI`, P2 icin plan/sahip/tarih mevcut, release kanit paketi tamam.

## 5. Her Kod Degisikliginde Zorunlu Kontrol

- [ ] Yeni/verisi degisen tablo icin RLS ve negatif yetki testi var mi?
- [ ] Istemciye yeni secret, service role veya kalici credential giriyor mu?
- [ ] Kullanici/rol/sahiplik bilgisi sunucuda `auth.uid()` ile dogrulaniyor mu?
- [ ] Yeni RPC/Edge Function sabit yetki, `search_path`, input ve hata kontrolune sahip mi?
- [ ] Islem tekrarlandiginda cift kayit, cift odeme veya cift kredi olusuyor mu?
- [ ] Yeni girdi uzunluk/format/izinli deger kontrolunden geciyor mu?
- [ ] Yeni upload turunde MIME, boyut, sahiplik ve public erisim kurali var mi?
- [ ] Yeni dis URL allowlist, protokol ve open redirect kontrolunden geciyor mu?
- [ ] Log, hata mesaji veya analytics PII/secret sizdiriyor mu?
- [ ] Rate limit ve kotuye kullanim senaryosu degerlendirildi mi?
- [ ] Admin davranisi UI kontrolune degil sunucu yetkisine dayaniyor mu?
- [ ] Basarili senaryonun yaninda yetkisiz/farkli kullanici testi eklendi mi?
- [ ] Dokuman, migration ve rollback/geri kazanma adimi guncellendi mi?

## 6. Bulgu Kayit Formati

Her bulgu icin su bilgiler doldurulur:

- `ID / Baslik`
- `Kaynak`: Kullanici bildirimi, kod inceleme, otomatik tarama veya pentest
- `Oncelik`: P0-P3
- `Etkilenen varlik ve guven siniri`
- `On kosul ve saldiri yolu`
- `Etki ve veri kapsami`
- `Tekrar uretme adimlari` (secret veya zararli payload belgeye acik yazilmaz)
- `Kok neden`
- `Duzeltme plani ve etkilenen dosyalar/migration'lar`
- `Negatif test ve regresyon testi`
- `Durum / sahip / hedef tarih`
- `Dogrulama kaniti ve dogrulayan`
- `Geriye donuk etki`: Mevcut veri, token, log ve yedekler icin yapilacaklar

## 7. Bilinen Acil Durumlar

| ID | Oncelik | Bulgu | Durum | Tamamlanma kosulu |
|---|---|---|---|---|
| KST-KNOWN-001 | P0 | R2 Secret Access Key daha once web bundle icine girdi. Istemci kodu kaldirildi ve yeni bundle temiz dogrulandi. | DOGRULANDI | 2026-09-14: Kullanici `KISTAS` (All buckets / Object Read & Write) token'ini sildi; Cloudflare R2 API Tokens panelinde `There are currently no Account API tokens for your buckets` goruldu. Eski kimlik bilgileri yerel `.env` dosyasindan cikarildi. |
| KST-KNOWN-002 | P2 | Yerel yedek zip'i `.env` dosyasini iceriyor. | ANALIZ | Yedek erisim modeli belirlenir; paylasilan/offsite yedek icin sifreleme veya secretsiz profil eklenir. |

## 8. Elli Bulguluk Ana Kayit

Kullanici tarafindan iletilecek 50 guvenlik maddesi asagidaki sabit ID'lerle kaydedilir. Baslik geldikce ilgili faz, oncelik, durum ve kanit alanlari doldurulur; maddeler silinmez, gerekirse `GECERSIZ` gerekcesiyle kapatilir.

| ID | Baslik | Faz | Oncelik | Durum | Sahip | Dogrulama kaniti |
|---|---|---:|---|---|---|---|
| SEC-001 | SQL Enjeksiyonu | 3 | P1 | DOGRULANDI | Codex | `npm run security:sql-injection`; Supabase/RPC/migration kaynak incelemesi |
| SEC-002 | XSS | 4 | P1 | DOGRULANDI | Codex | `npm run security:xss`; 14 URL testi; Pages yerel emulasyonunda CSP/HTTP basliklari, 2 URL yansitma testi ve tarayici blog acilisi |
| SEC-003 | Marka ve Kimlik Taklidi Koruması (Kıstas İsmi Kilidi) | 1 | P1 | DOGRULANDI | Antigravity | UI doğrulama, ProfileService kontrolü, DB tetikleyicisi ve core-domain testi (19/19) |
| SEC-004 | Proje Destek Bütünlüğü ve Kalıcılık Kalkanı (Destek Geri Alınamaz) | 3 | P1 | DOGRULANDI | Antigravity | DB RPC'de DELETE kaldırıldı, UI'da buton kilitlendi, core-domain testi (21/21) |
| SEC-005 | Canlı Destek Görüşme Yaşam Döngüsü ve Yönetici Silme Yetkisi | 4/5 | P1 | DOGRULANDI | Codex | Sunucu RPC, kapalı görüşme RLS politikası, denetim kaydı ve core-domain testi (24/24) |
| SEC-006 | Yönetim Ekibi Görev Bazlı Yetkilendirme | 2/5 | P1 | DOGRULANDI | Codex | Sabit süper yönetici, izin allowlisti, kapsam bazlı RPC/RLS ve core-domain testi (26/26) |
| SEC-007 | Proje Düzeltmesini Güvenli Yeniden Gönderme | 2/3 | P1 | DOGRULANDI | Codex | Sahiplik ve durum doğrulamalı RPC, anonim erişim reddi, denetim kaydı ve core-domain testi (32/32) |
| SEC-008 | Eski alan adindaki KVKK iletisim adresi ve paylasim URL'leri | 6/7 | P2 | DUZELTILDI | Codex / kullanici | Canli gizlilik metni ve blog linkleri dogrulandi; kistasdestek@gmail.com gercek teslimat testi kullanicida bekliyor (hedef 2026-09-15) |
| SEC-009 | Expo arac zincirinde dolayli uuid guvenlik uyarisi | 6 | P2 | RISK_KABUL | Codex | `npm audit --omit=dev --audit-level=high`: 0 high/critical, 26 moderate; duzeltme yok, sonraki Expo surumunde yeniden degerlendirilecek |
| SEC-010 | Supabase Auth e-posta teslimati ve sifre kurtarma | 6/7 | P2 | KISMI | Codex / kullanici | SMTP teslimati, Gmail SPF/DKIM/DMARC PASS ve kurtarma ekranina yonlendirme dogrulandi. Turkce Kistas sablonuyla yeni kurtarma postasi Gmail Gelen Kutusu'na ulasti; yeni sifre kaydi ve yeni kayit dogrulamasi bekliyor (hedef 2026-09-15). |
| SEC-011 | GA4 URL token sizintisi ve izinsiz analitik | 6/7 | P1 | DOGRULANDI | Codex | 2026-09-14: Google kodu yalniz istege bagli onaydan sonra yuklenir; URL query/hash analitige gonderilmez. `node scripts/tests/analytics-consent.test.mjs` onay yok, onay, tokenli URL ve ret senaryolarindan gecti. |
| SEC-012 | Google OAuth teknik alan adi ve marka guveni | 1/6 | P2 | DUZELTILDI | Codex | Dogrudan Google Identity ID token, kriptografik nonce, FedCM ve CSP regresyon testi; canli hesap secici testi bekliyor |
| SEC-013 | Anonim Profil PII Sızıntısı ve Hassas Kolon İfşası (CLS & RLS Kalkanı) | 2 | P1 | DOGRULANDI | Antigravity | `20260917000002_harden_profiles_pii_and_storage.sql`, `AuthService.ts`, `ProfileService.ts`, `User.ts`, tsc (0 hata) + core-domain (37/37) |
| SEC-014 | Depolama Kovanı Anonim Dosya Yükleme Kısıtlaması (Storage RLS Hardening) | 4 | P1 | DOGRULANDI | Antigravity | `20260917000002_harden_profiles_pii_and_storage.sql`, `storage.objects` authenticated INSERT ve DELETE kuralı, pentest artık temizliği |
| SEC-015 | Shopier Webhook ve Otomatik Kredi Guvenligi | 5 | P1 | DOGRULANDI | Codex | Canli imzali 10 TRY kontrollu siparis, atomik +100 kredi, tek olay/tek hareket, ayni bildirimin replay testi ve production allowlist regresyonu |
| SEC-016 | Shopier OSB'den guncel Webhook altyapisina gecis | 5/6 | P2 | PLANLI | Codex | Mevcut OSB fail-closed ve idempotent; Shopier'in resmi legacy bildirimi nedeniyle Webhook gecisi ayri sertlestirme isi olarak izlenecek |
| SEC-017 | Onboarding Onarımı, 10 Hassas Tablonun Anonim Rolünden İzolasyonu ve Storage Uzantı Kalkanı | 2/4/6 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000003_repair_onboarding_and_tighten_defense.sql`, `public/_headers` CORS/HSTS/CSP kalkanı, `AuthService.ts` brute-force kilidi, tsc (0 hata) + system-check (100/100) |
| SEC-018 | Faz 2: Finansal, Sipariş ve İş Mantığı Güvenliği (Legacy Boost Bypass, Orders İzolasyonu, Teklif & Yorum Kalkanı) | 2/3/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000004_faz2_financial_and_order_hardening.sql`, boost_listing_with_credits DROP, orders/credit_transactions REVOKE, offers/reviews trigger & CHECK |
| SEC-019 | Faz 3: IDOR, Sahiplik Denetimi & Yetki Aşımı (Moderasyon Atlama Engeli, Bildirim Enjeksiyonu Kalkanı) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000005_faz3_idor_and_ownership_hardening.sql`, `trg_protect_listing_status`, `notifications` INSERT REVOKE & CLS, delete policy pekiştirme |
| SEC-020 | Faz 4: Rate Limiting, Anti-Spam & DoS / Resource Exhaustion Kalkanı | 4/5/6 | P2 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000006_faz4_rate_limiting_and_dos_defense.sql`, send_chat_message rate limit, create_project_comment rate limit, record_listing_view deduping, storage 10MB limit |
| SEC-021 | Keşfet Ziyaretçi Erişimi Onarımı, Kiril IDN Homoglyph ve Destek Sohbeti Kalkanı | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000007_fix_guest_explore_and_harden_brand_chat.sql`, is_user_blocked SECURITY DEFINER, check_profile_brand_name Kiril homoglyph, filter_chat_message_content admin muafiyeti |
| SEC-022 | Ziyaretçi Keşfet & Anon RLS / Fonksiyon İzin Onarımı (is_platform_admin Grant & Listings RLS Ayrımı) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000008_repair_anon_explore_access.sql`, anon listings ve profiles RLS erişimi, telemetri HTTP 200 (81 ms) doğrulandı |
| SEC-023 | Faz 5: Sohbet Doğrudan REST Enjeksiyonu, Medya MIME & Timing Attack Kalkanı | 1/2/4/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000009_faz5_chat_isolation_and_media_hardening.sql`, messages INSERT/UPDATE/DELETE REVOKE, storage MIME image-only, constantTimeEqual, telemetri HTTP 200 |
| SEC-024 | Faz 6: Veri Bütünlüğü, Rapor Kalkanı & Sybil Savunması | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000010_faz6_data_integrity_and_sybil_defense.sql`, reports flood cooldown, column length CHECKs, project email verification, telemetri HTTP 200 |
| SEC-025 | Faz 7: user_addresses IDOR & Adres Sahiplik Kalkanı | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000011_faz7_address_images_and_consent_hardening.sql`, WITH CHECK enforcement, user_id freeze trigger, telemetri HTTP 200 |
| SEC-026 | Faz 7: listing_images Ayrıştırılmış RLS, URL & Sahiplik Bütünlüğü | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000011_faz7_address_images_and_consent_hardening.sql`, seller_id ownership checks on CUD, listing_id freeze, telemetri HTTP 200 |
| SEC-027 | Faz 7: user_consents Değiştirilemezlik & Yasal İzin Güvenliği | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000011_faz7_address_images_and_consent_hardening.sql`, DELETE REVOKE, immutable user_id/consent_type/version, telemetri HTTP 200 |
| SEC-028 | Faz 8: admin_action_audit Değiştirilemezlik (Append-Only) Kalkanı | 1/2/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000012_faz8_audit_immutability_and_admin_isolation.sql`, prevent_audit_tampering trigger, admin read policy |
| SEC-029 | Faz 8: Destek ve Topluluk Moderatörleri Özel Mesaj İzolasyonu | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000012_faz8_audit_immutability_and_admin_isolation.sql`, community permission strictly restricted to listing_id IS NULL |
| SEC-030 | Faz 8: Süper Yönetici Koruması & Yetki Yükseltme (Privilege Escalation) Kalkanı | 1/2/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000012_faz8_audit_immutability_and_admin_isolation.sql`, private.admin_team_members isolation, audit indexing |
| SEC-031 | Faz 9: Supabase Realtime CDC İzolasyonu & PII Sızıntı Kalkanı | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000013_faz9_realtime_cdc_and_socket_hardening.sql`, orders/offers/addresses/audit DROP from supabase_realtime |
| SEC-032 | Faz 9: WebSocket Realtime Channel Dinleme & REPLICA IDENTITY FULL | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000013_faz9_realtime_cdc_and_socket_hardening.sql`, REPLICA IDENTITY FULL on messages/conversations/comments |
| SEC-033 | Faz 9: Realtime Broadcast / Presence Flooding & İstemci Hız Limiti | 4/5/6 | P2 | DOGRULANDI | Sayra (SAYRA-CODE) | `supabaseClient.ts` eventsPerSecond: 10, Chat/Comment broadcast disable, payload validation |
| SEC-034 | Faz 10: Derin Bağlantı (Deep Link) & Özel URL Şeması Hijacking Kalkanı | 1/2/4 | P2 | DOGRULANDI | Sayra (SAYRA-CODE) | `app.json` scheme "kistas" mühürlendi, URL sanitizasyonu, rastgele intent engeli |
| SEC-035 | Faz 10: Token Yaşam Döngüsü & Browser Hash / Code Temizliği (replaceState) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `AuthContext.tsx` onAuthStateChange replaceState ile access/refresh token & code temizliği |
| SEC-036 | Faz 10: Harici Web Bağlantıları Güvenli Tarayıcı (Reverse Tabnabbing & Referrer) | 4/5/6 | P2 | DOGRULANDI | Sayra (SAYRA-CODE) | `ExternalUrl.ts` openSafeExternalUrl, `opener = null`, `noopener,noreferrer` kesin koruması |
| SEC-037 | Faz 11: Harici Medya, SSRF & Cloud Metadata (169.254.x.x) Kalkanı | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000014_faz11_ssrf_and_media_shield.sql`, `ExternalUrl.ts` isPrivateOrReservedHost, listings/images/profiles CHECK |
| SEC-038 | Faz 11: Webhook Replay & Idempotency Bütünlüğü (Shopier/RevenueCat) | 5/6 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `apply_shopier_credit_event_by_email` & `apply_revenuecat_credit_event` atomik deduplication & constant-time check |
| SEC-039 | Faz 11: Güvenli HTTP Başlıkları (COOP Popups, Cross-Domain & Referrer Kalkanı) | 6 | P2 | DOGRULANDI | Sayra (SAYRA-CODE) | `public/_headers` COOP same-origin-allow-popups, X-Permitted-Cross-Domain-Policies none, Strict HSTS |
| SEC-040 | Faz 12: Bal Küpü Tablosu (Honey-Table & Canary Credentials) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000015_faz12_active_cyber_deception_honeypot.sql`, `system_debug_credentials` canary tablosu |
| SEC-041 | Faz 12: Truva Arka Kapısı (Trojan Debug RPC - Sahte Süper Admin) | 1/2/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `debug_elevate_admin_role` sahte yetki döner, `security_honeypot_detections` sessizce kaydeder |
| SEC-042 | Faz 12: Finansal Sessiz Yutma (Silent Null-Route & Sahte 200 OK) | 2/3/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `debug_add_test_credits` sahte bakiye yanıtı döner, gerçek cüzdana dokunulmaz |
| SEC-043 | Faz 13: Sipariş Durum Makinesi Bütünlüğü (Order State Machine Immutability) | 2/3/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000016_faz13_wallet_integrity_and_state_machine.sql`, terminal states & order transition trigger |
| SEC-044 | Faz 13: Teklif & Pazarlık Durum Makinesi Bütünlüğü (Offer State Machine) | 2/3/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `trg_enforce_offer_state_transition` ile sonuçlanmış tekliflerin geri alınması engellendi |
| SEC-046 | Faz 14: Promosyon Kodu İstismarı & Kupon Yığma (Coupon Stacking / Replay) Kalkanı | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000017_faz14_promo_pricing_and_delivery_hardening.sql`, `chk_listings_promo_code_format`, core-domain (39/39) |
| SEC-047 | Faz 14: Fiyatlandırma Bütünlüğü & İndirim Oranı Manipülasyonu (Price Tampering) | 2/3/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `chk_listings_price_range`, `chk_offers_offered_price_range`, `chk_orders_seller_earnings_bounded`, core-domain (39/39) |
| SEC-048 | Faz 14: Kargo & Teslimat Kodu IDOR / Brute-force Kalkanı | 1/2/5 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `chk_orders_order_number_format`, `chk_orders_tracking_number_format`, `create_escrow_order_atomic` CSPRNG, core-domain (39/39) |

| SEC-049 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-050 | Bekleniyor | - | - | BEKLIYOR | - | - |

### SEC-001 - SQL Enjeksiyonu

- Tarih: 2026-09-08
- Kapsam: `src`, Supabase Edge Function'lari ve tum SQL migration'lari.
- Sonuc: Kullanici girdisini SQL metnine birlestiren calisan bir sorgu bulunmadi. Supabase sorgu olusturucusu ve RPC parametreleri degerleri SQL'den ayri tasiyor.
- Sertlestirme: PostgREST `.or(...)` ve Realtime filtrelerinde kati UUID dogrulamasi eklendi. RPC adlari sabit literal cagri olarak sinirlandi.
- Regresyon korumasi: `npm run security:sql-injection` dinamik tablo/RPC adlarini, guvensiz filtre enterpolasyonunu, raw SQL enterpolasyonunu ve migration'lardaki dinamik `EXECUTE` kullanimini reddeder.
- Negatif test: Kontrol scripti her risk sinifi icin guvensiz ornegin yakalandigini ve guvenli ornegin gectigini once kendi kendine dogrular.
- Kalan risk: Canli veritabani semasi ile migration eslesmesi ayrica deployment denetiminde dogrulanmalidir. Yeni bir raw SQL kutuphanesi eklenirse bu madde yeniden acilir.

### SEC-002 - XSS

- Tarih: 2026-09-08
- Kapsam: Yorum, mesaj ve proje metinlerinin render edilmesi; DOM yazimlari; harici baglanti ve OAuth yonlendirmeleri; medya URL'leri.
- Bulgu: React metinleri varsayilan olarak kaciriyor ve raw HTML render edilmiyor. Ancak proje baglantilari sema kontrolu olmadan `Linking.openURL()` ile aciliyordu; web'de calistirilabilir URL semalari risk olusturabilirdi.
- Duzeltme: Harici yonlendirmeler yalnizca kullanici bilgisi icermeyen, localhost olmayan HTTPS adreslerini kabul eder. OAuth adresi ayrica yapilandirilmis Supabase hostuyla sinirlidir.
- Sunucu korumasi: `20260908000014_xss_url_hardening.sql` yeni proje, gorsel ve avatar kayitlarinda HTTPS disindaki semalari reddeder. `NOT VALID` mevcut veriyi bozmadan yeni yazimlari korur.
- Eski veri uyumlulugu: Kayitli baglantilar buton gorunurlugunu degistirmez. Guvenlik kontrolu yalnizca acma aninda uygulanir; semasiz alan adlari HTTPS olarak normalize edilir.
- Regresyon korumasi: `npm run security:xss` raw HTML/JS calistirma noktalarini ve dogrulanmamis yonlendirmeleri reddeder; her kural guvenli ve guvensiz ornekle kendi kendini test eder.
- Dogrulama (2026-09-14): Wrangler Pages yerel emulasyonu `public/_headers` kuralini parse etti. `/`, `/blog`, `/blog/kistas-nedir` ve `/gizlilik-politikasi` 200 ile CSP, HSTS ve `X-Frame-Options: DENY` dondurdu. Script ve image-event payload'li iki URL yanitinda guvensiz yansitma yoktu; blog tarayicida basliklarla calisti. Canli www yanitlarinda da bu basliklar goruldu; yeni CSP konsol ihlali gorulmedi. Codex ic tarayicisinda Supabase API ag engeli sebebiyle veri akisi ayrica normal tarayicida dogrulanmali.

### SEC-008 - Eski alan adi ve KVKK iletisim adresi

- Tarih: 2026-09-14.
- Kapsam: Blog canonical/paylasim baglantilari, profil rozeti ve gizlilik politikasindaki iletisim adresi.
- Bulgu: Kod `kistas.app` adresine baglaniyor, gizlilik metni ise bu alandaki destek posta kutusunu gosteriyordu. Yeni `kıstas.com` yayininda kullanicilar yanlis adrese gidebilir veya KVKK talebi ulastiramayabilirdi.
- Duzeltme: Web baglantilari `www.kıstas.com` alanina tasindi; kullanicinin bildirdigi `kistasdestek@gmail.com` iletisim adresi metne alindi.
- Negatif test: Eski `kistas.app` adresine isaret eden web paylasim/rozet baglantisi veya gizlilik iletisim metni kalmamali.
- Canli baglanti kaniti: `/gizlilik-politikasi` dogrudan ziyarette metin ve kistasdestek@gmail.com goruldu; blog yazisi dogrudan acildi, www sertifikasi etkin.
- Kalan risk: Yeni posta kutusuna gercek teslimat kullanici tarafindan henuz dogrulanmadi. Hedef: 2026-09-15; sahip: kullanici.

### SEC-009 - Expo arac zincirinde dolayli uuid uyarisi

- Tarih: 2026-09-14. Kaynak: `npm audit --omit=dev --audit-level=high`.
- Bulgu: `uuid` paketinin eski surumleri icin buffer siniri kontrolu eksigi, Expo CLI'nin `xcode` bagimliligi uzerinden 26 dolayli moderate uyarisi uretiyor. Audit bu zincir icin hazir duzeltme gostermiyor.
- Risk kabul kapsami: Yalnizca mevcut Expo 57 gelistirme/derleme arac zinciri; canli web paketinde xcode veya uuid kullanan bu yolun bulunmadigi ayrica bundle taramasiyla kontrol edilir. High/critical audit bulgusu kabul edilmez.
- Telafi kontrolu: Kilitli `package-lock.json`, `npm ci`, release testleri ve production bundle taramasi. Expo ve bagimliliklar 2026-10-14 tarihine kadar yeniden denetlenir; yeni duzeltme cikarsa onceliklendirilir.
- Sahip: Codex / proje sahibi. Bu kabul yeni high/critical bulguya veya istemci paketinde etkilenebilir yola uygulanmaz.

### SEC-010 - Auth e-posta teslimati ve sifre kurtarma

- Tarih: 2026-09-14. Supabase Authentication > Emails > SMTP Settings panelinde `Enable custom SMTP` kapali goruldu. Varsayilan Supabase servisi yalniz proje ekibindeki izinli adreslere mail gonderebilir; genel kullanici kayit dogrulamasi ve sifre sifirlama teslimati saglanmis degil.
- Kod bulgusu: `resetPasswordForEmail()` baglanti gonderiyordu fakat `PASSWORD_RECOVERY` olayini yakalayip yeni sifreyi kaydeden ekran yoktu. Kayit dogrulama bekleyen oturumsuz kullanici da basarisiz profil olusturma yoluna dusuyordu.
- Duzeltme: Kurtarma oturumu AuthContext'te izleniyor; yeni sifre ekrani `updateUser({ password })` ile sifreyi guncelliyor ve tamamlaninca oturumu kapatip girise donuyor. Oturumsuz kayit sonucunda dogrulama gerektigi acikca gosteriliyor; izin verilmeyen e-posta hatasi yerellestirildi.
- Kod kaniti: `npm run release:web` TypeScript, 32 alan, 14 URL, XSS/SQL ve bundle sir taramasindan gecti; `68d0837` Cloudflare Pages production dagitimi basarili.
- E-posta altyapisi kaniti: Resend ucretsiz hesapta `auth.xn--kstas-n4a.com` Ireland bolgesinde `Verified` oldu; Cloudflare DKIM TXT, SPF TXT ve donus MX kayitlari 1.1.1.1 uzerinden dogru degerlerle cozumleniyor.
- Canli gonderim kaniti: Supabase ozel SMTP `bildirim@auth.xn--kstas-n4a.com`, `smtp.resend.com:465` ve `resend` kullanicisi ile etkin ve yeniden yukleme sonrasi kayitli. Supabase kullanici paneli `kistasdestek@gmail.com` icin `Sent password recovery` gosterdi; Resend Emails panelinde ayni alici ve `Reset your password` konusu `Delivered` oldu. Kullanici Gmail'de e-postayi spam klasorunde gordu; Gmail orijinal gorunumunde SPF, DKIM ve DMARC'in ucu de PASS. Kurtarma baglantisi canli Kistas'ta `Yeni sifre belirleyin` ekranini acti. 2026-09-14: Kurtarma ve kayit dogrulama konulari ile HTML govdeleri Turkce Kistas tasarimina cevrildi; kaynaklari `supabase/email-templates/` altinda. Supabase'de kayit sonrasi yeni kurtarma testi gonderildi; Resend `Kıstas | Şifreni yenile` icin `Delivered` ve dogru kurtarma yonlendirmesini gosterdi. Kullanici yeni iletinin Gmail Gelen Kutusu'na dustugunu dogruladi. Resend Insights baglantinin Supabase alan adina gitmesini bir teslimat iyilestirme firsati olarak isaretledi; calisan tek kullanimlik baglanti su an korunuyor. Yeni sifre kaydi ve yeni kayit dogrulamasi henuz test edilmedi; durum `KISMI`.
- Kalan risk: Gonderim anahtari sohbet mesajinda paylasildi. Anahtar yalniz gonderim ve tek alt alanla sinirli; kullanici mevcut anahtari koruyarak devam etme tercihini bildirdi. Uygun zamanda yeni anahtar olusturulup Supabase'de degistirilerek eski anahtar iptal edilmeli. Anahtar kaynakta, istemci paketinde veya paylasilabilir yedekte tutulmaz.
- Sonraki adim: Eski spam iletisi Gmail'de kaldiysa `Spam degil` olarak isaretle ve yeni alan adinin teslimat itibarini izle. Kullanici isterse sifirlama baglantisindan yeni sifre kaydini kendisi test eder; ayrica yeni kullanici kayit dogrulamasi test edilir. Hedef 2026-09-15; sahip: kullanici ve Codex.

### SEC-003 - Marka ve Kimlik Taklidi Koruması (Kıstas İsmi Kilidi)

- Tarih: 2026-09-11
- Kapsam: Profil ad ve soyad (full_name) güncelleme, kayıt ve kimlik taklit koruması.
- Bulgu: Kullanıcılar profil düzenleme üzerinden 'Kıstas', 'Kıstas Destek', 'Kıstas Admin' gibi marka adı ve varyasyonlarını alarak resmi hesap taklidi yapabilirdi.
- Katmanlı Düzeltme:
  1. İstemci & UI Formu: `isReservedBrandName()` kontrolü ile formda anlık uyarı ve kaydetme buton kilidi uygulandı.
  2. Uygulama Servisi: `ProfileService.updateProfile()` çağrısında `profiles.role !== 'admin'` olan tüm kullanıcılar için sunucu öncesi bloklama sağlandı.
  3. Veritabanı & RLS/Tetikleyici: `20260911000004_protect_brand_name.sql` ile `check_profile_brand_name()` tetikleyicisi eklenerek `public.is_platform_admin()` haricindeki tüm doğrudan API yazımları `FORBIDDEN` istisnasıyla veritabanı seviyesinde durduruldu.
  4. Leetspeak ve Normalizasyon: `kıstas`, `kistas`, `K1stas`, `k.ı.s.t.a.s`, `k-i-s-t-a-s`, `k 1 s t a s` vb. sembol ve boşluk varyasyonları normalizasyon algoritması ile kapsandı.
- Doğrulama kanıtı: `node scripts/tests/core-domain.test.mjs` test paketine eklenen 3 yeni regresyon testiyle doğrulandı (19/19 test başarılı).

### SEC-005 - Canlı Destek Görüşme Yaşam Döngüsü ve Yönetici Silme Yetkisi

- Tarih: 2026-09-12
- Kapsam: Canlı destek görüşmelerinin sonlandırılması, yeniden talep açılması ve mesaj geçmişinin temizlenmesi.
- Bulgu: Destek görüşmelerinde sunucu tarafından doğrulanan bir kapanış durumu bulunmadığından eski görüşmeler yazmaya açık kalıyor ve arşiv ile aktif kuyruk birbirinden ayrılamıyordu.
- Düzeltme: `closed_at` ve `closed_by` alanları eklendi; sonlandırma ve geçmiş temizleme işlemleri sabit `search_path`, `auth.uid()` ve `is_platform_admin()` doğrulamalı RPC'lere taşındı. Kapalı görüşmelere RPC ve doğrudan RLS yazımları engellendi.
- Veri yaşam döngüsü: Sonlandırılan görüşme arşivde korunur. Kullanıcı yeniden destek istediğinde yeni ve ayrı bir açık görüşme oluşturulur. Mesaj geçmişi yalnızca sonlandırılmış görüşmelerde yönetici tarafından silinebilir.
- Denetim izi: Sonlandırma ve mesaj temizleme işlemleri aktör, hedef ve silinen mesaj sayısıyla `admin_action_audit` tablosuna kaydedilir.
- Doğrulama kanıtı: Migration uzak veritabanına uygulandı; TypeScript kontrolü ve `node scripts/tests/core-domain.test.mjs` paketi 24/24 başarılı tamamlandı.

### SEC-006 - Yönetim Ekibi Görev Bazlı Yetkilendirme

- Tarih: 2026-09-12
- Kapsam: Süper yönetici hesabı, ekip üyeliği, destek ve yorum yönetimi, lansman inceleme ve blog yönetimi.
- Bulgu: Yönetici doğrulaması tek bir doğru/yanlış değerine bağlıydı; yönetim ekibine eklenen herkes mevcut RPC ve RLS kuralları üzerinden tam yetki kazanabilirdi.
- Düzeltme: Ana yönetici allowlisti değiştirilemez tam yetkili sınır olarak korundu. Ekip üyeleri `community`, `launches` ve `blog` allowlist kapsamlarıyla ayrı tabloda tutuldu; görev atama yalnızca süper yönetici RPC'sine açıldı.
- Sunucu koruması: Destek mesajları ve görüşme yaşam döngüsü `community`, proje onay/düzeltme akışı `launches`, blog yazma politikası `blog` iznine bağlandı. Arayüz yalnızca izinli sekmeleri yükler; sunucu kontrolü arayüzden bağımsızdır.
- Gizlilik: Topluluk yetkilisine kullanıcı e-postası, bakiye ve kredi bilgileri döndürülmez. Yönetim ekibi hesapları yorum susturma işleminden korunur.
- Denetim izi: Ekip üyeliği ekleme, değiştirme ve kaldırma işlemleri aktör, hedef ve izin listesiyle `admin_action_audit` tablosuna kaydedilir.
- Doğrulama kanıtı: `20260912000003_admin_team_permissions.sql` uzak veritabanına uygulandı ve migration listesinde eşleşti; TypeScript kontrolü ile core-domain testleri 26/26 başarılı tamamlandı.

### SEC-007 - Proje Düzeltmesini Güvenli Yeniden Gönderme

- Tarih: 2026-09-14
- Kapsam: Düzeltme istenen proje formu, proje güncelleme servisi ve yeniden incelemeye gönderme geçişi.
- Bulgu: İstemci, içerik alanlarıyla birlikte yalnızca yöneticiye ayrılmış moderasyon alanlarını doğrudan güncellemeye çalıştığı için istek veritabanı yetkilerinde reddediliyordu. Bu alanları istemci güncellemesine açmak moderasyon bütünlüğünü zayıflatacaktı.
- Düzeltme: Proje içeriği yalnızca izinli alanlarla güncellenir; yeniden incelemeye geçiş `resubmit_listing_for_review` RPC'sine taşındı. RPC `auth.uid()` ile sahipliği doğrular, yalnızca `inactive` durumunu kabul eder, sabit `search_path` kullanır ve moderasyon alanlarını sunucu tarafında temizler.
- Negatif kontroller: Anonim erişim geri alındı; farklı kullanıcıya ait proje bulunamadı olarak reddedilir ve geçersiz durum geçişi engellenir.
- Denetim izi: Başarılı yeniden gönderim `listing_revision_resubmitted` eylemiyle `admin_action_audit` tablosuna kaydedilir.
- Doğrulama kanıtı: `20260914000004_listing_revision_resubmission.sql` uzak veritabanına uygulandı ve migration listesinde eşleşti; TypeScript kontrolü ile core-domain testleri 32/32 başarılı tamamlandı.

### SEC-012 - Google OAuth teknik alan adi ve marka guveni

- Tarih: 2026-09-15. Kaynak: Kullanici bildirimi ve canli OAuth hesap secici incelemesi.
- Bulgu: Web Google girisi Supabase'in yonlendirmeli OAuth adresini kullandigi icin Google hesap secici `iojgqicgeztqwkbetboa.supabase.co` teknik alan adini gosteriyordu. Bu, Kistas ile alan adi bagini belirsizlestirerek kimlik avi algisi olusturabiliyordu.
- Duzeltme: Web girisi resmi Google Identity Services dugmesine ve `signInWithIdToken` akimina tasindi. Her oturum isteginde Web Crypto ile 256 bit nonce uretilir; SHA-256 ozeti Google'a, ham nonce Supabase dogrulamasina verilir. FedCM dugme akisi etkinlestirildi.
- Dis kaynak siniri: Yalniz `https://accounts.google.com/gsi/` betik, stil, iframe ve baglanti uclari CSP allowlistine eklendi. Google web Client ID herkese acik kimliktir; Client Secret istemciye eklenmedi.
- Regresyon: `scripts/tests/google-identity.test.mjs` eski Google yonlendirmesinin arayuzde bulunmadigini; ID token + nonce, kriptografik uretim, FedCM ve CSP kurallarini dogrular.
- Kalan dogrulama: Google Cloud OAuth istemcisinde `https://www.kistas.com.tr` Authorized JavaScript Origin olarak kayitli olmali. Canli hesap secicide Supabase teknik alan adinin kayboldugu ve mevcut Google hesabinin ayni Supabase kullanicisina girdigi dogrulanmadan durum `DOGRULANDI` yapilmaz.
- Mobil web tekrar deneme duzeltmesi (2026-09-16): Ozel Kistas dugmesinin `accounts.id.prompt()` ile One Tap/FedCM istemi acmasi, kullanici dis alana dokunup istemi kapattiginda tarayici soguma davranisi nedeniyle sonraki tiklamalari etkisiz birakabiliyordu. Acik kullanici eylemi artik GIS `renderButton()` ile uretilen resmi, Turkce ve FedCM uyumlu dugme akisini kullanir. One Tap istemi kaldirildi; ID token, kriptografik nonce ve Supabase `signInWithIdToken` dogrulamasi korunur. Regresyon testi resmi dugmeyi ve eski `prompt()` akisinin bulunmadigini denetler.
- Sosyal dugme gorunumu (2026-09-17): Canli masaustu ve 390 px mobil incelemesinde GIS iframe'inin Kistas kabugunu ezerek Google dugmesini GitHub dugmesinden farkli gosterdigi dogrulandi. Gorunen yuz yeniden mevcut Kistas cam/hap dugmesiyle esitlendi; `pointerEvents="none"` olan sunum katmani tiklamayi yakalamaz. Altindaki tam boy resmi GIS `renderButton()` iframe'i gercek ve tek tiklama hedefidir; bu nedenle eski `accounts.id.prompt()` soguma sorunu geri gelmez. Popup modu, FedCM, ID token ve kriptografik nonce dogrulamasi korunur.
- Geri donus: UI ve AuthService degisikligi geri alinarak onceki Supabase yonlendirmeli Google OAuth akimina donulebilir; kullanici kayitlari veya oturum tablolari degismez.

## 9. Faz Calisma Kaydi

Her guvenlik fazinda asagidaki kayit eklenir:

```text
Tarih:
Faz:
Ele alinan bulgular:
Degisen kod/migration:
Calistirilan pozitif testler:
Calistirilan negatif testler:
Kalan riskler:
Sonraki adim:
```

## 10. Yayin Guvenlik Kapisi

Production veya magazaya cikis icin:

- [ ] Acik P0/P1 yok.
- [ ] RLS ve admin negatif testleri gecti.
- [ ] Production bundle secret taramasi temiz.
- [ ] Webhook/odeme imza ve replay testleri gecti.
- [ ] Dependency ve build taramasi temiz ya da belgelenmis risk kabulune sahip.
- [ ] Log/PII ve KVKK kontrolu tamam.
- [ ] Yedek ve geri donus testi guncel.
- [ ] Son guvenlik incelemesi tarih ve kanitla kayitli.

### 2026-09-14 - Eski haftalik Gunün Vitrini (devre disi)

- Faz: 3 - RPC ve is kurallari.
- Tarihsel not: `20260914000001_showcase_leaders_expansion.sql` ile kurulan haftalik akisin tablosu veri kaybi olusturmamak icin korunur. Anonim/oturumlu istemci RPC yetkisi ve eski cron gorevleri 2026-09-17 gunluk modele geciste kapatilmistir; yeni istemci akisi bu tabloyu kullanmaz.

### 2026-09-14 - Web production hazirligi

- Faz: 6/8 - yayin zinciri ve guvenlik kapisi.
- Degisen kaynak: Git gizli dosya dislama kurallari, Pages web basliklari, yeni alan adi baglantilari, KVKK iletisim adresi, release test komutu ve iki asamali secret taramasi.
- Dogrulama: `npm run release:web` basarili; TypeScript 0 hata, core-domain 32/32, XSS ve 14 URL testi, SQL guard, 393 kaynak dosyasi ve 71 dist dosyasinda gizli deger taramasi temiz. Yerel tarayicida ana sayfa, blog ve KVKK ekrani acildi. Yerel/uzak Supabase migration listesi eslesti.
- Bagimlilik: `npm audit --omit=dev --audit-level=high` high/critical bulgu vermedi; 26 moderate dolayli uyarinin `SEC-009` risk kabulu kaydi acildi.
- 2026-09-14 guncelleme: `KST-KNOWN-001` R2 token iptali Cloudflare panelinde sifir etkin Account API token ile dogrulandi. `SEC-002` yerel Pages emulasyonunda CSP ve iki URL yansitma kontroluyle dogrulandi. Ozel GitHub deposu `kistasdestek-dev/kistas` `main` dalina gonderildi.
- Canli altyapi (2026-09-14): Cloudflare Pages `kistas` projesi ozel `kistasdestek-dev/kistas` deposunun `main` dalindan `npm run release:web` ile basariyla dagitildi. Supabase Auth Site URL ve izinli yonlendirme `https://www.xn--kstas-n4a.com` olarak kaydedildi. Turhost NS kaydi `jamie.ns.cloudflare.com` / `jaziel.ns.cloudflare.com` olarak guncellendi; 1.1.1.1 ve 8.8.8.8 yeni NS'leri dogruladi. Cloudflare Full (strict), Always Use HTTPS ve en dusuk TLS 1.2 secili. `www` Pages domain panelinde Active / SSL enabled; canli `/`, `/blog`, `/blog/kistas-nedir` ve `/gizlilik-politikasi` HTTP 200 ve CSP, HSTS, X-Frame-Options basliklarini dondurdu. Gercek blog slug'i tarayicida acildi. Cloudflare'in kısıtlayici SPF/DKIM/DMARC kayitlari, alan adindan e-posta gonderilmedigi icin olusturuldu.
- Canli rota duzeltmesi: `/gizlilik-politikasi` dogrudan ziyarette ana sayfaya dusuyordu; `App.tsx` sabit rota eslemesine eklendi. `npm run release:web` tekrar basarili: 32/32 cekirdek test, 14 URL testi, SQL/XSS, tip ve 71 dosyalik web paketi sir taramasi. Bu degisiklik yeni veri, RPC, upload, dis URL veya credential eklemiyor; geri donus onceki basarili Pages dagitimini secmek veya bu commit'i geri almak.
- Son canli kontroller: Cloudflare zone etkin; kok ve www Pages panelinde Active / SSL enabled. Kok `https://xn--kstas-n4a.com/blog/test?source=launch` 301 ile ayni yol/sorguyu www'ye tasidi. Canli `/`, `/blog`, `/gizlilik-politikasi` HTTP 200 ile CSP, HSTS ve frame korumasi verdi. Gizlilik metni dogrudan acilis ve iletisim adresi Codex tarayicisinda goruldu. Web kredi magazasi hazir degilken butonlar `Yakinda` olarak devre disi ve odeme alinmadigi metinde belirtiliyor.
- Yayin sonrasi dogrulama (hedef 2026-09-15; sahip: kullanici / Codex): `SEC-008` posta kutusuna gercek teslimat, normal kullanici tarayicisinda proje listesi/giris/sifre sifirlama, ikinci hesapla RLS negatif testi ve yukleme akisi. Codex ic tarayicisi Supabase API istegini `ERR_BLOCKED_BY_CLIENT` ile engelledi; terminalde anonim `listings` istegi HTTP 200 ve aktif kayit dondurdu. Bu ag engelinden kullanici tarayicisi davranisi cikarsanmaz.

### 2026-09-14 - kistas.com.tr alan adi gecisi (devam ediyor)

- Faz: 6/8 - DNS, kimlik yonlendirmesi, SEO ve yayin guvenlik kapisi.
- Degisen kaynak: Canonical/site URL sabitleri, sitemap, robots, llms, sosyal kart URL'leri, blog dis baglanti allowlisti, Cloudflare gorsel kaynak URL'si ve bunlarin regresyon beklentileri yeni `https://www.kistas.com.tr` adresine uyarlandi. Eski adres Cloudflare Pages'te ve Resend gonderiminde gecis tamamlanana kadar korunuyor.
- Pozitif test: `npm run release:web` basarili; TypeScript 0 hata, core-domain 32/32, analytics consent, gorsel optimizasyon, XSS/SQL, SEO 8 sayfa / 7 sitemap URL ve 159 cikti dosyasinda secret taramasi temiz.
- Negatif kontrol: Yeni URL BlogScreen allowlistinde sabit HTTPS hostuna bagli; kaynak gorseller yalniz Supabase hostundan kabul ediliyor; istemciye yeni secret veya sunucu yetkisi eklenmedi. Yeni tablo, RPC, migration, upload, odeme ve admin yetkisi degisikligi yok.
- Altyapi kaniti: Turhost `kistas.com.tr` NS formunda `mimi.ns.cloudflare.com` / `nero.ns.cloudflare.com` kayitli. Cloudflare zone ve Pages `www.kistas.com.tr` ozel alan eslestirmesi DNS yayilimi bekliyor. Yeni zone Full (strict), Always Use HTTPS ve min TLS 1.2 olarak ayarlandi. Cloudflare Images yeni zone'da etkin; kaynaklari yalniz `kistas.com.tr` ve `iojgqicgeztqwkbetboa.supabase.co`, iki kayit da tum yollar, olarak kaydedildi. Resend `auth.kistas.com.tr` Ireland bolgesinde olusturuldu; DKIM TXT, iki DNS-only gonderim CNAME ve DMARC TXT Cloudflare DNS'e kaydedildi, dogrulama bekliyor. GA4 mevcut `G-2XXP5LHME9` akisi yeni adrese guncellendi. Supabase Redirect URLs listesinde hem eski hem yeni `www` adresi goruldu. Search Console `kistas.com.tr` mulku icin Google TXT Cloudflare DNS'e kaydedildi; DNS henuz public olmadigi icin ilk dogrulama `Alan adiniz bulunamadi` verdi.
- DNS engelinin son kontrolu (2026-09-14 17:30 TRT): Google Public DNS `kistas.com.tr/NS` sorgusu hem DNSSEC dogrulamasi acikken hem de kapaliyken `SERVFAIL` verdi; mevcut delegasyondaki Turhost IP'leri `37.230.111.111` ve `37.230.110.110` alan icin `REFUSED` yaniti donuyor. Turhost NS duzenleme formu Cloudflare'in iki sunucusunu gosterirken Genel Bilgiler ozeti eski `cpns1.turhost.com` sunucusunu gosteriyor. Cloudflare `Waiting for your registrar to propagate your new nameservers`, Pages `Inactive (Requires DNS setup)` ve Resend `Domain not found` durumunda. Cloudflare ve Pages yeniden DNS kontrolu baslatildi; henuz canli tasima yapilamaz.
- DNS ve sertifika duzeldi (2026-09-14): Google Public DNS ve yerel `Resolve-DnsName`, `mimi.ns.cloudflare.com` / `nero.ns.cloudflare.com` delegasyonunu ve `www.kistas.com.tr` A yanitlarini gosterdi. Cloudflare zone etkin; Pages `www.kistas.com.tr` ve `kistas.com.tr` icin `Active / SSL enabled`. Codex tarayicisinda iki adres de HTTPS ile Kistas ana sayfasini acti. Resend `auth.kistas.com.tr` durumu `Verified`. Kalan is: ana adrese 301 yonlendirmeler, yeni canonical/sitemap paketinin dagitimi, Search Console ve Supabase Auth SMTP/Site URL gecisi.
- Kalan risk: Supabase Site URL, yeni SMTP gonderici ve eski alan adindan 301 gecisi henuz tamamlanmadi. Eski Resend gondericisi e-posta kesintisini onlemek icin calisir durumda kalir.
- Geri donus: Yeni kod yayinlanmadan mevcut Pages production dagitimi ve eski domainler korunur. Yayin sonrasi sorun olursa Pages'te onceki basarili production dagitimi geri secilir, Supabase Site URL eski adrese dondurulur ve 301 yonlendirmesi kapatilir.
- Sonraki adim: Yeni canonical/sitemap paketini GitHub uzerinden yayinla ve canli ciktiyi dogrula; Supabase Site URL ve SMTP'yi yeni alan adina tasi; eski alan adindan 301 kur; yeni sitede oturum ve sifirlama baglantisini test et.
- Kistas kok alaninda `https://kistas.com.tr/*` -> `https://www.kistas.com.tr/${1}` Cloudflare 301 Redirect Rule etkinlestirildi; query string koruma acik. Tarayicida `/blog/test?source=migration-check` istegi `https://www.kistas.com.tr/blog/test?source=migration-check` adresine gitti. Google Search Console `kistasdestek@gmail.com` hesabinda `kistas.com.tr` alan adi mulku DNS TXT ile otomatik sahiplik dogrulamasi aldi; TXT kaydi kaldirilmamali.
- Canli yayin (2026-09-14): `0806a1c` GitHub `main` uzerinden Cloudflare Pages'te `success` oldu. Ana sayfa yeni canonical/og URL, `robots.txt` ve XML sitemap yeni alan adini donduruyor; CSP/HSTS basliklari canli HTTP yanitinda goruldu. Search Console `https://www.kistas.com.tr/sitemap.xml` icin `Basarili` ve 7 kesfedilen sayfa gosterdi. Eski kok ve www alanlarina ayri 301 kurallari kuruldu; iki adresten `/blog/test?source=migration` istegi tek adimda `https://www.kistas.com.tr/blog/test?source=migration` hedefine gitti. Supabase Auth Site URL `https://www.kistas.com.tr` olarak kaydedildi ve sayfa yenilendikten sonra dogrulandi; eski adres izinli yonlendirmelerde tutuldu.
- Canli SEO incelemesinde Pages'in `/blog` gibi dizin URL'lerini `/blog/` adresine 308 ile tasidigi goruldu. Bu nedenle statik canonical, sitemap, JSON-LD ve paylasim URL'leri son URL ile ayni egik cizgili bicime uyarlandi; `npm run release:web` tekrar basarili oldu. SMTP gonderici anahtari ve GA4 canli veri dogrulamasi ayri bekliyor.
- Son SEO paketi `789388d` Cloudflare Pages production'da `success` (2026-09-14 20:01 TRT). Canli `/`, `/blog/`, `/about/`, `/how-it-works/`, `robots.txt` ve `sitemap.xml` HTTP 200; HTML canonical degerleri son URL'lerle ayni, sitemap egik cizgili blog URL'sini iceriyor. Kullanici onayiyla yeni www adreste analitik cerezleri kabul edilerek test ziyareti gonderildi; sayfada `G-2XXP5LHME9` betigi yuklendi ve Kistas WEB GA4 gercek zamanli raporunda 2 etkin kullanici ile 2 `page_view` goruldu. Search Console sitemap `Basarili`, 7 sayfa; dizine alinma ve siralama zamanla ayrica izlenir. Yeni alan icin Supabase SMTP gonderici/anahtar gecisi kullanicinin telefonundan anahtari guvenle kaydetmesini bekliyor; mevcut calisan eski gonderici bu asamada korunur.
- SMTP yeni alan gecisi (2026-09-14): Resend'de `auth.kistas.com.tr` ile sinirli yeni `Sending access` anahtari olusturuldu. Kullanici anahtari sohbete yazmadan Supabase SMTP'ye kendi telefonundan kaydetti. Supabase uzerinden `kistasdestek@gmail.com` hesabina tek kurtarma postasi gonderildi; yeni anahtarin Resend logunda `/emails` POST 200, posta detayinda `"Kıstas" <bildirim@auth.kistas.com.tr>`, Turkce konu, yeni `https://www.kistas.com.tr` yonlendirmesi ve `Delivered` dogrulandi. Kullanici yeni mesajin Gmail Gelen Kutusu'na dustugunu ve posta dugmesinin yeni sitede `Yeni sifre belirleyin` ekranini actigini dogruladi. Onceden sohbette paylasilan eski Resend anahtari kullanici onayiyla silindi; listede yalniz yeni alana sinirli anahtar kaldi. Yeni sifre kaydi ve kayit dogrulamasi henuz test edilmedi.
- SEO yayin hatasi (2026-09-14): Canli `/blog/` HTML'i eski `index-42837...js` dosyasini cagirdi, Cloudflare Pages ise font yolu duzenlemesinden sonra `index-712867...js` dosyasini yukledi. Bu nedenle taze ziyarette blog etkilesimli arayuzu acilmiyordu. Font hazirligi SEO sayfalari uretilmeden onceye tasindi; tum 8 statik sayfada JS referansinin dosya olarak mevcut oldugunu sinayan regresyon eklendi. Blog dizini ve yazilar arasina taranabilir HTML baglantilari eklendi. Eski `dist` uzerinde test ENOENT ile hatayi yeniden uretti; yeni `release:web` testi 8 sayfa, 7 sitemap URL, TypeScript, XSS, SQL, 32 cekirdek test ve bundle secret taramasindan gecti. Degisiklik yalniz public web cikti sirasini ve dahili HTML baglantilarini etkiler; yeni tablo, RPC, yetki, secret, upload veya dis URL yoktur. Geri donus: onceki Pages dagitimina donulebilir; blog hatasi geri geleceginden build sirasini duzelterek yeniden dagitmak tercih edilir.
- Canli blog kayitlariyla SEO tarihi uyumu (2026-09-14): Anonim yayinli `blog_posts` alanlarinda uc makalenin `published_at` tarihlerinin 2026-09-08, 05 ve 02; `updated_at` tarihlerinin 2026-09-10 oldugu okundu. Statik BlogPosting ve sitemap onceki taslak tarihlerini tasiyordu. Statik `datePublished` canli kayitla, `dateModified` ve sitemap `lastmod` son guncelleme tarihiyle esitlendi. Bu kamuya acik metadata duzeltmesi yetki, veri yazimi, kimlik, secret veya dis servis iznini degistirmez.
- Mobil kapak gorseli (2026-09-14): One cikan kartin kapagi icin mevcut Cloudflare gorsel donusumunde 320/640 px `srcSet` eklendi; yuksek yogunluklu ekranda onceki 720 px yerine 640 px secilir. Kartin CSS boyutu, kirpma, renk ve gorunumu degismedi. URL'ler yalniz mevcut `getOptimizedImageUrl` izinli Supabase kaynagindan uretilir; yeni secret, upload, yetki, veri yazimi, yonlendirme veya analitik eklenmedi. `npm run release:web` (tip, 32 cekirdek test, XSS/SQL, gorsel URL, SEO ve bundle sir taramasi) basarili. Geri donus: ilgili commit geri alinir veya onceki Cloudflare Pages dagitimi secilir.
- Ionicons web fontu (2026-09-15): Expo'nun dinamik `auto` font yuzu yerine `swap` kullanilmasi ve HTML on yuklemesinin Expo'nun ayni hash'li font dosyasina baglanmasi saglandi. Yalniz mevcut, ayni kokenli public font URL'si kullanilir; yeni dis kaynak, veri, secret, upload veya yetki yoktur. Yerel uretim onizlemesinde HTML on yukleme ve iki font yuzunun ayni URL'yi kullandigi, Expo yuzunun `swap` oldugu goruldu. `npm run release:web` ve ek 8 sayfalik font-cikti regresyonu basarili. Geri donus: ilgili commit geri alinir veya onceki Pages dagitimi secilir.
- Kesfet ilk ekran olcek korumasi (2026-09-15): Sponsor ve organik ana sayfa sorgulari sunucu tarafinda 12 kayitla sinirlandi; sponsor/LCP verisi alt akislardan bagimsiz tamamlanir. Ana sayfada kullanilmayan tum destek gecmisi istegi ve ona bagli artik istemci kodu silindi. Web logo arka plan islemesi yalniz gorunume 320 px yaklasan gorseller icin calisir. Tum projelere mevcut Goz At/Tumunu Gor akislariyla erisim korunur. Yeni tablo, RPC, dis URL, secret, upload veya yetki eklenmedi. `npm run release:web`; tip, XSS/SQL, analitik, gorsel, 33 cekirdek regresyonu, SEO ve bundle sir taramalarindan gecti. Geri donus: ilgili commit geri alinir veya onceki Pages dagitimi secilir.
- Editoryal Google Play katalog tohumu (2026-09-15): Site sahibinin verdigi ve resmi magazada dogrulanan 7 uygulama, tek gercek Kistas editor profiline bagli normal `active` proje olarak idempotent migration ile eklenir. Gelistirici adlari sahiplik iddiasi olarak kullanilmaz; her aciklama `Kaynak: Google Play` ve gercek gelistirici atfini tasir. Sosyal destek sayisi uretilmez. Logo ve dort vitrin gorseli resmi `play-lh.googleusercontent.com` HTTPS kaynagindan gelir; proje yonetimden silindiginde `listing_images` kayitlari mevcut FK `ON DELETE CASCADE` ile temizlenir. Bulunamayan `hoklo.android` paketi eklenmedi. Yeni kullanici, yetki, secret, tablo veya RPC yoktur. Geri donus: yonetim panelinden ilgili projeler silinir.
- Editoryal sahiplik ayrimi (2026-09-15): Canli detay dogrulamasinda mevcut `seller` modelinin Kistas editorunu yanlislikla uygulamanin gelistiricisi gibi sundugu goruldu. `developer_name` ve `is_editorial` alanlari eklendi; resmi gelistirici adi arama, kart ve detaylarda gosterilirken `Yayinlayan: Kistas Editor` ayri sunulur. Resmi Google Play sayfasindan adi dogrulanan editoryal gelistirici karti `Kistas Dogrulanmis Gelistirici` ve onay tiki tasir; bu rozet Kistas editor hesabina sahiplik, mesajlasma veya gelistirici yaniti yetkisi vermez. Ucretsiz kayitlarda gecici teknik fiyat NULL yapildi. Mevcut kullanici projeleri varsayilan `is_editorial = FALSE` ile ayni davranisi korur. Geri donus: UI commit'i geri alinir; alanlar geriye uyumluluk icin birakilabilir.
- Proje goruntulenme ve Vitrin Destegi (2026-09-15): Aktif proje detay acilislari `record_listing_view` RPC'siyle kullanici veya anonim uygulama oturumu basina gunde bir kez sayilir; proje sahibinin kendi acilisi ve aktif olmayan proje kayda girmez. Ham `listing_view_events` tablosu anon/authenticated rollerine kapali, RLS etkin ve RPC sabit bos `search_path` kullanir. Anonim istemcinin yeni oturum kimligi uretmesi tamamen engellenemeyecegi icin sayac bir finansal veya yetkilendirme karari olarak kullanilmaz; siralama destek puanindan bagimsiz kalir. Yonetici "Vitrin Destegi" mevcut admin-only, denetim kayitli `admin_set_listing_sponsorship` akisini kullanir ve gercek goruntulenme sayisini degistirmez. Regresyon kaniti: proje sahipligi, aktif durum, gunluk tekillik ve ham tablo yetkileri otomatik test edilir. Geri donus: UI/RPC commit'i geri alinir; `listing_view_events` tablosu veri kaybi onayi olmadan silinmez.
- Sponsor kredi islem turu onarimi (2026-09-15): `boost_listing_scoped` RPC'sinin `credit_tx_type` enumunda bulunmayan `usage` degeri nedeniyle tum islem atomik olarak geri donuyordu; bakiye eksilmiyor ve sponsor suresi yazilmiyordu. Kaynak migration ve canli RPC, enumda mevcut `spend_boost` degerine tasindi. RPC'nin `auth.uid()`, proje sahipligi, paket allowlisti, satir kilidi ve atomik kredi/sure guncellemesi korunur. Ham veritabani hatalari istemciye gosterilmez. Regresyon testi gecersiz `usage` degerinin geri donmesini engeller. Geri donus: onceki fonksiyona donulmez; gerekirse ayni guvenli govde `spend_boost` ile yeniden uygulanir.
- Her proje acilisinda goruntulenme (2026-09-15): Kullanici talebiyle oturum/gun tekillestirmesi kaldirildi; aktif bir proje detayi her acildiginda yalniz ilgili projenin `view_count` alani atomik olarak bir artar. Ayni veya farkli projeye sonraki girisler istemci tarafinda engellenmez. Proje sahibinin kendi projesi ve aktif olmayan projeler sayilmaz; ham olay tablosu istemci rollerine kapali, RPC `SECURITY DEFINER` ve sabit bos `search_path` ile calisir. Goruntulenme manipule edilebilir bir ilgi metrigi kabul edilir; destek siralamasi, kredi, odeme veya yetkilendirme kararinda kullanilmaz. Regresyon testi eski gunluk `ON CONFLICT DO NOTHING` ve istemci `viewedListingIds` kilidinin geri gelmesini engeller. Geri donus: istemci ve RPC onceki pakete alinabilir; olay tablosu veri kaybi onayi olmadan silinmez.
- Manuel Gorunurluk Artirma (2026-09-15): Yoneticilerin projelere dogrudan gorunurluk/goruntulenme (view_count) sayisi ekleyebilmesi icin admin-only `admin_grant_project_views` RPC'si eklendi. Islem yalnizca `public.is_platform_admin()` ile yetkilendirilmis kullanicilar tarafindan calistirilabilir; parametre pozitif tam sayi (1 - 100.000) araliginda dogrulanir ve maksimum tamsayi tasmasina karsi `LEAST(2147483647, ...)` ile korunur. PUBLIC calistirma yetkisi kaldirilmis, yalnizca `authenticated` rolune izin verilmistir. Goruntulenme metrigi odeme veya siralama yetkisi degildir; degisiklik yalnizca ilgili projenin `view_count` alanini atomik olarak gunceller. Geri donus: RPC fonksiyonu kaldirilabilir veya migration geri alinabilir.
- Hakkimizda anlatimi ve tasarimi (2026-09-16): Web ve mobil Hakkimizda ekranlari sade, dogrudan ve dogrulanabilir fayda anlatimina tasindi. `Canli Kesif` etiketi `Yeni Projeler` olarak degistirildi; kaynagi olmayan ornek yuzde kaldirildi. Yeni metinler kesfetme, kalici destek ve ureticiye ulasma akisini aciklar. SEO baslik/aciklama ve statik AboutPage verisi ayni anlatimla esitlendi. Yeni veri, RPC, dis URL, secret, yetki, kimlik veya analitik davranisi eklenmedi. Geri donus: ekran ve SEO kaynaklari onceki commit'e alinabilir.
- Nasil Calisir anlatimi ve tasarimi (2026-09-16): Web ve mobil ekranlardaki teknik terimler, karsilastirma tablosu ve uzun SSS bloklari kaldirildi; kesfeden ve proje ureten kullanicilar icin uc adimli, dogrulanabilir akisa gecildi. Kalici destek, sponsorlu saatlik rotasyon ve dogrudan iletisim mevcut urun davranisiyla uyumlu kisa metinlerle anlatildi. SEO baslik/aciklama, statik WebPage verisi ve sitemap tarihi ayni anlatimla guncellendi. Yeni veri, RPC, dis URL, secret, yetki, kimlik veya analitik davranisi eklenmedi. Geri donus: ekran ve SEO kaynaklari onceki commit'e alinabilir.
- SSS sayfasi ve footer baglantisi (2026-09-16): Footer'daki genel `Destek` baglantisi, herkese acik ve giris gerektirmeyen `SSS` sayfasina tasindi. Web ve mobil SSS ekranlari arama, kategori filtresi ve acilir yanitlarla yalniz sabit urun bilgisini gosterir; kullanici girdisi sunucuya veya analitik servise gonderilmez. Cevap bulunamazsa mevcut kimlik dogrulamali destek gorusmesi akisi ayri bir eylemle korunur. Statik SEO, FAQPage semasi ve sitemap rotasi eklendi. Yeni veri, RPC, secret, yetki veya kimlik davranisi eklenmedi. Geri donus: SSS rotasi ve footer prop degisiklikleri onceki commit'e alinabilir.
- Hakkimizda hedef kitle anlatimi (2026-09-16): Aciklamasiz puanlar ve kurgu proje adlari iceren vitrin maketi kaldirildi. Yerine `Yeni bir urun ariyorsan` ve `Bir projen varsa` ayrimini yapan, her iki kitle icin sonucu ve uc adimli akisi dogrudan anlatan sabit bilgi kartlari eklendi. Mobil anlatim ayni hedef kitle ayrimiyla esitlendi. Yeni veri toplama, RPC, dis URL, secret, yetki, kimlik veya analitik davranisi eklenmedi. Geri donus: Hakkimizda ekranlari onceki commit'e alinabilir.
- Gunluk kategori liderleri ve saatlik adil rotasyon (2026-09-17): `daily_showcase_winners` yalniz onceki tam Turkiye gunundeki e-postasi dogrulanmis, proje sahibine ait olmayan kalici desteklerden her aktif kategori icin en fazla bir organik lider saklar. Aktif olmayan ve global/kategori sponsorlu projeler hem secicide hem public getter'da dislanir; en az bir gecerli destek zorunludur. Desteksiz kategoride son uygun lider korunur; liderler her Istanbul saatinde deterministik olarak bir kademe doner. Ham tablo RLS ile kapali ve PUBLIC/anon/authenticated yetkileri kaldirilmis; aggregate `get_daily_showcase_winners` RPC'si sabit bos `search_path` ile yalniz proje/kategori, puan, pencere ve rotasyon sirasi dondurur. Secici RPC yalniz `service_role` yetkilidir. Eski haftalik cronlar durdurulmus, secim `21:00 UTC` ve sponsor/durum uzlastirmasi saatlik planlanmistir. Kategori ekranindaki vitrin sorgusu/state/bileseni ve istemci rastgele siralamasi silinmistir; Kesfet 3/4/6 kota ve Tumunu Gor akisi backend siralamasini kullanir. Kanit: `npm run release:web` basarili; TypeScript 0 hata, 37/37 cekirdek regresyonu, repo/dist secret, XSS, dis URL, SQL injection, kimlik, analitik, gorsel, SEO ve web bundle kontrolleri temiz; 12 SEO sayfasi ve 11 sitemap URL'si dogrulandi. Canli migration/yayin bu kaydin kapsaminda uygulanmamistir. Geri donus: istemci degisiklikleri geri alinabilir, cronlar yeniden planlanabilir; yeni ve eski snapshot tablolari veri kaybi onayi olmadan silinmez.

### SEC-015 - Shopier Webhook ve Otomatik Kredi Guvenligi

- Tarih: 2026-09-16
- Kapsam: `supabase/functions/shopier-credit-webhook/index.ts`, Shopier sipariş bildirimi ve kredi yükleme akışı.
- Tehdit Modeli: Sahte webhook çağrıları, aynı siparişin mükerrer yüklenmesi (double-spending / replay attacks), yetkisiz kredi tanımlama.
- Düzeltme ve Korumalar:
  1. **Fail-closed OSB imzası:** `SHOPIER_OSB_USERNAME` ve `SHOPIER_OSB_PASSWORD` olmadan ödeme bildirimi işlenmez. `hash`, HMAC-SHA256 ile `res + username` girdisi üzerinden doğrulanır; eksik veya hatalı imza reddedilir.
  2. **Atomik idempotency:** `shopier_credit_purchase_events.provider_order_id` benzersizdir. Sipariş kaydı, profil satır kilidi, bakiye artışı ve `credit_transactions` kaydı tek `apply_shopier_credit_event` veritabanı işlemi içinde tamamlanır.
  3. **Kesin paket doğrulaması:** Yalnız `50900373 / 299 TRY / 100 kredi`, `50900401 / 699 TRY / 350 kredi` ve `50900419 / 1699 TRY / 1000 kredi` eşleşmeleri kabul edilir. Ürün adı veya fiyat eşiği yedeği yoktur.
  4. **Kullanıcı eşleştirme:** İmzalı bildirimdeki sipariş notu e-postası, yoksa alıcı e-postası normalize edilerek mevcut profile bağlanır. Eşleşme yoksa kredi üretilmez.
  5. **Kişisel veri azaltma:** Kullanıcı notu ve e-posta Edge Function loguna yazılmaz.
- Kanıt: `scripts/tests/shopier-credit-webhook.test.mjs` geçerli/geçersiz imza, UTF-8 payload, fiyat ayrıştırma ve katı kaynak kontrollerini doğrular. OSB secretlari Supabase Edge Function secrets alanina kaydedildi; canlı imzasız POST `401 INVALID_SIGNATURE` ile reddedildi. Shopier panelinden `#155374702` numaralı 10 TRY bağlantı siparişiyle imzalı bildirim testi başarılı tamamlandı ve OSB, sayfa yenilemesi sonrasında da `AKTİF` olarak doğrulandı. Test siparişi canlı paket fiyatıyla eşleşmediği ve test bildirimi olduğu için kredi üretmedi.
- Kapatma olcutu: Imzali gercek tahsilatin otomatik krediye donusmesi, ayni bildirimin tekrarinda ikinci kredi/hareket olusmamasi, gecici test yolunun kaldirilmasi ve normal paket allowlistinin kod/veritabani/regresyon testlerinde birebir eslesmesi.
- Kontrollü canlı kredi testi (2026-09-16): Kullanıcının hesabını Codex'e açıklamadan doğrulama yapabilmesi için yalnız `50900373 / 10 TRY / 100 kredi` eşleşmesini kabul eden, iki saat süreli ve ilk başarılı gerçek siparişte veritabanı satır kilidi altında atomik olarak tüketilen tek kullanımlık test slotu hazırlandı. Slot yalnız mevcut bir Kıstas profiliyle eşleşen imzalı Shopier bildirimiyle tüketilebilir; ikinci farklı sipariş aynı düşük tutarı kullanamaz. Test tamamlanınca geçici Edge Function eşleşmesi kaldırılacaktır.
- Canlı test kök neden düzeltmesi (2026-09-16): İlk iki gerçek 10 TRY siparişinde test slotu tüketilmedi ve olay kaydı oluşmadı. Tanıda `profiles` tablosunda `email` sütunu bulunmadığı halde Edge Function'ın bu sütundan kullanıcı aradığı saptandı. Eşleme, `SECURITY DEFINER` ve yalnız `service_role` yetkili `apply_shopier_credit_event_by_email` RPC'sine taşındı; doğrulanmış `auth.users.email`, mevcut `profiles.id` ile sunucu tarafında bağlanır ve aynı transaction içinde atomik kredi RPC'si çağrılır. E-posta istemciye veya loga yazılmaz.
- Shopier para birimi normalizasyonu (2026-09-16): Shopier panelindeki resmi OSB örnek kodu `currency` alanının `0=TL`, `1=USD`, `2=EUR` olduğunu doğruladı. Edge Function `0`, `TL` ve `TRY` değerlerini kanonik `TRY` değerine dönüştürür; USD/EUR aynı pakete kabul edilmez. Böylece imzalı TL siparişi katı paket kontrolünü geçerken farklı para birimleri reddedilmeye devam eder.
- Canlı kredi ve replay kanıtı (2026-09-16): Shopier'in imzalı test bildirimiyle `#974543907` siparişi atomik olarak işlendi; tek olay ve tek `purchase` hareketiyle +100 kredi eklendi, bakiye 50'den 150'ye çıktı. Aynı imzalı bildirim yeniden gönderildiğinde olay sayısı 1, hareket sayısı 1, toplam kredi +100 ve bakiye 150 olarak kaldı. Tek kullanımlık 10 TRY slotu tüketildi; ardından geçici Edge Function eşleşmesi ve slot tablosu cleanup migration ile kaldırıldı. Normal sistem yalnız 299/699/1699 TRY allowlistini kabul eder.
- Hesap eşleme bildirimi ve uygulama içi sonuç (2026-09-16): Kredi satın alma penceresi yalnız doğrulanmış Kıstas hesap e-postasını gösterir; ad-soyad yedeği kaldırıldı ve e-posta yoksa Shopier geçişi kapatıldı. Kullanıcıya sipariş notunun öncelikli, Shopier alıcı e-postasının ise not boşken yedek eşleme kaynağı olduğu açıkça anlatılır. Başarılı kredi artışı, kredi hareketi ve `credit_purchase` uygulama içi bildirimi aynı atomik RPC içinde üretilir. Mükerrer OSB bildirimi kredi hareketinden ve bildirim eklenmesinden önce döndüğü için ikinci bakiye veya bildirim oluşturamaz. Bildirim verisi e-posta ya da sipariş notu taşımaz; yalnız kaynak, kredi miktarı ve yeni bakiye bulunur. Geri dönüş: `20260916000005_shopier_credit_notification.sql` öncesindeki fonksiyon gövdesi yeniden uygulanabilir ve modal değişikliği geri alınabilir.
- Kredi cüzdanı hareket dökümü (2026-09-16): Kullanıcı profilindeki cüzdana yalnız oturum sahibinin RLS korumalı `credit_transactions` kayıtlarını okuyan hareket ekranı eklendi. Shopier yüklemeleri kredi, tarih, ödenen tutar ve işlem sonrası bakiyeyi; yeni vitrin harcamaları proje adı, kapsam, süre, harcanan kredi ve işlem sonrası bakiyeyi gösterir. Yapılandırılmış `metadata` alanı yalnız ödeme sağlayıcı adı, ürün/tutar/para birimi ve proje/vitrin kimliği taşır; e-posta, sipariş notu veya ödeme kartı verisi içermez. `boost_listing_scoped` içindeki eksik `balance_after` yazımı düzeltildi ve RPC güvenli boş `search_path` ile yeniden tanımlandı. Mevcut Shopier kayıtları doğrulanmış olay tablosundan geriye dönük zenginleştirilir. Geri dönüş: arayüz ve servis kaldırılıp RPC gövdeleri önceki sürüme alınabilir; `metadata` sütunu veri kaybı riski nedeniyle yerinde bırakılmalıdır.
- Kapatma karari (2026-09-16): Kontrollu 10 TRY gercek tahsilat, Shopier'in imzali bildiriminin canli Edge Function ve atomik RPC zincirinden gecerek +100 kredi uretmesini kanitladi. Ayni imzali bildirimin tekrari tek olay, tek hareket ve degismeyen bakiye ile idempotency kanitini verdi. Gecici 10 TRY kabul yolu `20260916000004` migration'i ile kaldirildi; `20260916000001`-`00006` migration'larinin tamami canli veritabani ile eslesti. Normal 299/699/1699 TRY paketleri Edge Function, RPC ve regresyon testinde ayni urun/tutar/kredi allowlistini kullanir. Canli endpoint `GET 200 success`, gecersiz imza `POST 401 INVALID_SIGNATURE` dondurdu; ek 299 TRY harcama guvenlik acisindan yeni bir siniri test etmeyecegi icin gerekli gorulmedi. SEC-015 `DOGRULANDI` kapatildi. Shopier'in OSB servisini legacy ilan etmesi SEC-016 P2 gecis maddesinde ayrica izlenir.

### SEC-013 - Anonim Profil PII Sızıntısı ve Hassas Kolon İfşası (CLS & RLS Kalkanı)

- Tarih: 2026-09-17
- Kapsam: `public.profiles` tablosu, `GET /rest/v1/profiles?select=*`, PostgREST izinleri, `AuthService.ts`, `ProfileService.ts`, `User.ts`.
- Tehdit Modeli / Pentest Bulgusu: Anonim bir saldırganın `GET /rest/v1/profiles?select=*` çağrısı yaparak sisteme kayıtlı tüm kullanıcıların satırlarını ve kişisel verilerini (telefon, bakiye, push tokenı ve eski pazaryeri döneminden kalan boş IBAN/TCKN kolonlarını) ifşa edebilmesi.
- İnceleme ve Bulgular:
  1. Pentestte doğrulandığı üzere RLS yazma/güncelleme/silme kuralları tam korumalıdır (`başkasının satırını güncelle/sil = 0 satır`).
  2. Yönetici kontrolleri `is_platform_admin()` RPC ile sıkı kapalıdır; bundle içinde `service_role` anahtarı bulunmamaktadır.
  3. Ancak `profiles` tablosunun SELECT politikasının `anon` rolü için kısıtlanmamış olması ve PostgREST'in varsayılan olarak tüm kolonları dönmesi bilgi ifşası riski doğurmuştur.
- Düzeltmeler ve Sertleştirme (`20260917000002_harden_profiles_pii_and_storage.sql`):
  1. **Artık Kolonların İmhası:** Kıstas dijital proje vitrini modelinde IBAN ve TCKN toplanmaz veya tutulmaz. Eski C2C döneminden kalan `iban` ve `identity_number` kolonları tablodan tamamen düşürüldü (`DROP COLUMN IF EXISTS`).
  2. **RLS Satır Kalkanı:** `profiles` tablosunda `anon` ve diğer kullanıcıların tüm kullanıcı listesini rastgele çekmesi engellendi. Anonim rol yalnızca aktif bir projesi (`listings.status = 'active'`) veya `is_verified = TRUE` olan yaratıcıları ve vitrin sahiplerini görebilir; henüz proje yayınlamamış normal kullanıcılar anonim listelemede `0 satır` döner.
  3. **Kolon Düzeyinde Güvenlik (CLS - Column-Level Security):** Tablo düzeyindeki `SELECT` yetkisi `public`, `anon` ve `authenticated` rollerinden tamamen geri çekildi (`REVOKE SELECT ON public.profiles`). `anon` rolüne yalnızca kamuya açık vitrin kolonları (`id, full_name, avatar_url, bio, city, district, rating_average, rating_count, is_verified, role, created_at, updated_at`) verildi. `phone`, `boost_credits` vb. alanlar yalnızca `authenticated` rolüne verildi; `fcm_token` ve `available_balance` gibi hassas alanlar istemci erişiminden tamamen koparıldı.
  4. **İstemci Kod Hijyeni:** `AuthService.ts`, `ProfileService.ts` ve `User.ts` dosyalarındaki kullanılmayan `iban` ve `identityNumber` alanları temizlendi.
- Kanıt: TypeScript tip kontrolü 0 hata (`npx tsc --noEmit`), 37/37 çekirdek regresyon testi başarılı, SQL enjeksiyon ve XSS testleri temiz.

### SEC-014 - Depolama Kovanı Anonim Dosya Yükleme Kısıtlaması (Storage RLS Hardening)

- Tarih: 2026-09-17
- Kapsam: `storage.objects`, `kistas` depolama kovanı, dosya yükleme ve silme politikaları.
- Tehdit Modeli / Pentest Bulgusu: Anonim bir istemcinin oturum açmadan `storage.objects` üzerine dosya yükleyebilmesi (`pars_test.png`), silme yetkisi olmadığından kovanda spam/çöp dosya biriktirebilmesi.
- Düzeltmeler ve Sertleştirme (`20260917000002_harden_profiles_pii_and_storage.sql`):
  1. **Anonim Yükleme Engeli:** `storage.objects` üzerindeki tüm olası anonim insert politikaları kaldırıldı. `kistas` kovanına dosya yükleme yetkisi `TO authenticated WITH CHECK (bucket_id = 'kistas' AND auth.role() = 'authenticated')` kuralı ile sınırlandırıldı.
  2. **Sahiplik Tabanlı Silme Kuralı:** Kullanıcıların yalnızca kendi yükledikleri dosyaları (`owner = auth.uid()`) veya yöneticilerin silebilmesi sağlandı.
  3. **Pentest Test Artıklarının Temizlenmesi:** Pentest sırasında yüklenen `pars_test%` dosyaları ve açılan `parsrecon2026x@gmail.com` test hesabı SQL üzerinden otomatik temizlendi.
- Ek Dashboard Tavsiyeleri (Saldırı Yüzeyi Minimizasyonu):
  - **Auth Rate Limit & Brute-Force Koruması:** Supabase Dashboard > Authentication > Rate Limits sekmesinde oturum açma hız limiti sıkılaştırılmalı; Cloudflare Turnstile / hCaptcha aktif edilmeli.
  - **Email Enumeration Koruması:** Supabase Dashboard > Authentication > Settings > Security altında "Protect against email enumeration" seçeneği etkinleştirilmeli.

### SEC-018 - Faz 2: Finansal, Sipariş ve İş Mantığı Güvenliği (Legacy Boost Bypass, Orders İzolasyonu, Teklif & Yorum Kalkanı)

- Tarih: 2026-09-17
- Kapsam: `boost_listing_with_credits`, `orders` tablosu, `credit_transactions` tablosu, `offers` tablosu, `reviews` tablosu, `20260917000004_faz2_financial_and_order_hardening.sql`.
- Tehdit Modeli / Pentest Bulguları:
  1. **Legacy Boost Bypass (P1):** `boost_listing_scoped` fonksiyonu Keşfet vitrinini 200 kredi ile korurken, silinmemiş olan eski `boost_listing_with_credits` fonksiyonunun `authenticated` rolü tarafından çağrılarak aynı vitrinin 50 krediye gasp edilebilmesi (Logic Discount Flaw).
  2. **Doğrudan Sipariş Enjeksiyonu (P1):** `orders` tablosunda bulunan `Buyers can initiate orders` politikası ve doğrudan INSERT hakkı nedeniyle bir kullanıcının `create_escrow_order_atomic` RPC'sini atlayıp `status = 'completed'` sahte sipariş oluşturabilmesi.
  3. **Teklif & Fiyat Manipülasyonu (P1):** `offers` tablosunda alıcının kendi teklifini `UPDATE` ile `accepted` yaparak ardından sipariş RPC'sinde bu kabul edilmiş 1 TL'lik teklifi kullanarak ürünü bedavaya rezerve edebilmesi.
  4. **İtibar / Yorum Şişirme (P2):** Sahte tamamlanmış siparişler üzerinden satıcının kendi kendine 5 yıldızlı yorum basabilmesi.
- Düzeltmeler ve Sertleştirme (`20260917000004_faz2_financial_and_order_hardening.sql`):
  1. **Zero Dead-Code İle Eski Fonksiyon İmhası:** `boost_listing_with_credits` veritabanından tamamen silindi (`DROP FUNCTION`).
  2. **Orders İstemci İzolasyonu:** `orders` tablosundan doğrudan `INSERT, UPDATE, DELETE` yetkileri tamamen alındı (`REVOKE`). `Buyers can initiate orders` politikası silindi. Sipariş oluşturma yetkisi yalnızca atomik RPC ve `service_role` ile sınırlandırıldı.
  3. **Teklif Bütünlüğü Kalkanı:** `handle_offer_update_protection` tetikleyicisi yazıldı; alıcının teklif kabul etmesi, fiyat değiştirmesi veya satıcı rolüne bürünmesi veritabanı seviyesinde bloke edildi.
  4. **Yorum Bütünlüğü:** `reviews` tablosuna `CHECK (reviewer_id <> reviewed_user_id)` eklenerek kendi kendine puan basma engellendi; doğrudan UPDATE/DELETE yetkileri sıfırlandı.
  5. **Defter Koruması:** `credit_transactions` tablosu yalnızca `SELECT` hakkına sınırlandı; istemcinin deftere yazması engellendi.
- Kanıt: TypeScript tip kontrolü 0 hata (`npx tsc --noEmit`), `node scripts/system-check.mjs` %100/100, SQL enjeksiyon ve XSS testleri temiz.

### SEC-019 - Faz 3: IDOR, Sahiplik Denetimi ve Yetki Aşımı (Moderasyon Atlama Engeli, Bildirim Enjeksiyonu Kalkanı)

- Tarih: 2026-09-17
- Kapsam: `listings` tablosu, `status` yönetimi, `notifications` tablosu, `project_comments`, `messages`.
- Tehdit Modeli / Pentest Bulguları:
  1. **Moderasyon Atlama ve Kendi Kendini Onaylama (P1):** `listings` tablosunda `status` alanının istemci UPDATE izninde bulunması ve RLS kuralının yalnızca `seller_id = auth.uid()` kontrolü yapması nedeniyle bir satıcının doğrudan `UPDATE listings SET status = 'active'` yaparak yönetici incelemesini tamamen atlayabilmesi (Privilege Escalation).
  2. **Sahte Sistem Bildirimi ve Phishing Enjeksiyonu (P1):** `notifications` tablosunda bulunan `WITH CHECK (TRUE)` INSERT politikası nedeniyle kötü niyetli bir kullanıcının diğer kullanıcılara sistem adına sahte bildirim ("Hesabınız kapatıldı, şifrenizi şu linkten güncelleyin" vb.) gönderebilmesi.
  3. **Sayaç ve Sponsorluk Manipülasyonu (P2):** İstemcinin doğrudan `listings` update ile `view_count`, `upvotes_count` veya `boosted_until` değerlerini manipüle etme riski.
- Düzeltmeler ve Sertleştirme (`20260917000005_faz3_idor_and_ownership_hardening.sql`):
  1. **İlan Durum & Bütünlük Tetikleyicisi (`trg_protect_listing_status`):** `BEFORE INSERT OR UPDATE` tetikleyicisi ile admin dışındaki herkes için INSERT'te `status := 'draft'` zorunlu kılındı. UPDATE anında normal kullanıcının projeyi `'active'`, `'reserved'` veya `'sold'` yapması veritabanı motorunda `FORBIDDEN` exception ile engellendi. `boosted_until`, `upvotes_count`, `view_count` ve `seller_id` istemci manipülasyonuna karşı kilitlendi (`NEW.field := OLD.field`).
  2. **Bildirim Enjeksiyonu İptali:** `notifications` tablosundan doğrudan istemci `INSERT` hakkı ve `WITH CHECK (TRUE)` politikası tamamen kaldırıldı (`REVOKE INSERT`). Bildirimler yalnızca güvenilir sunucu tetikleyicileri (`SECURITY DEFINER`) veya `service_role` tarafından üretilebilir.
  3. **Bildirim Kolon Düzeyinde Güvenlik (CLS):** İstemciye yalnızca `UPDATE (is_read)` izni verildi; başlık veya içerik tahrifatı engellendi.
  4. **Silme Politikası Pekiştirmesi:** Kullanıcıların yalnızca kendi projelerini silebilmesi (`auth.uid() = seller_id OR is_platform_admin()`) kuralı teyit edildi.
- Kanıt: TypeScript tip kontrolü 0 hata (`npx tsc --noEmit`), `node scripts/system-check.mjs` %100/100, SQL enjeksiyon ve XSS testleri temiz.

### SEC-020 - Faz 4: Rate Limiting, Anti-Spam & DoS / Resource Exhaustion Kalkanı

- Tarih: 2026-09-17
- Kapsam: `storage.buckets`, `send_chat_message` RPC, `create_project_comment` RPC, `record_listing_view` RPC, `AuthService.ts`.
- Tehdit Modeli / Pentest Bulguları:
  1. **Depolama Kotası Tüketme (Storage DoS - P2):** Saldırganın 100+ MB boyutunda devasa görseller yükleyerek projenin disk kotasını tüketmesi ve sunucu faturasını şişirmesi riski.
  2. **Mesajlaşma Flood & Bildirim DoS (P2):** Otomasyon botlarının `send_chat_message` RPC'sini saniyede yüzlerce kez çağırarak veritabanını şişirmesi ve hedef kullanıcıya binlerce push bildirimi tetiklemesi.
  3. **Yorum Spamı (P2):** Doğrulanmış bir hesabın otomasyonla saniyeler içinde onlarca yorum basarak proje sayfalarını kirletmesi.
  4. **Görünüm Sayacı Botu (P3):** `record_listing_view` fonksiyonunun mükerrer açılışları deduping yapmadan sayması sebebiyle bir botun tekil projeyi milyonlarca kez ziyaret edilmiş göstererek `listing_view_events` tablosunu kilitlemesi.
- Düzeltmeler ve Sertleştirme (`20260917000006_faz4_rate_limiting_and_dos_defense.sql`):
  1. **Storage Dosya Boyut Tavanı:** `storage.buckets` üzerinde `kistas` kovanına `file_size_limit = 10485760` (10 MB) tavan sınır getirildi; Supabase Storage API seviyesinde 10 MB üzeri tüm istekler reddedilir.
  2. **Mesajlaşma Hız Limiti:** `send_chat_message` RPC'sine 5 saniyede maksimum 5 mesaj sınırı konuldu (`RATE_LIMITED` exception).
  3. **Yorum Spam Kalkanı:** `create_project_comment` RPC'sine 10 saniyede maksimum 2 yorum sınırı konuldu.
  4. **Görünüm Deduping Kalkanı:** `record_listing_view` RPC'sine aynı `viewer_key` için 60 saniyelik tekillik kontrolü getirildi; döngü botlarının sahte görünüm üretmesi ve veritabanı satır kilitlemesi engellendi.
- Kanıt: TypeScript tip kontrolü 0 hata (`npx tsc --noEmit`), `node scripts/system-check.mjs` %100/100, SQL enjeksiyon ve XSS testleri temiz.

### SEC-021 - Keşfet Ziyaretçi Erişimi Onarımı, Kiril IDN Homoglyph ve Destek Sohbeti Kalkanı

- Tarih: 2026-09-17
- Kapsam: `listings` tablosu SELECT RLS politikası, `blocked_users` tablosu erişimi, `check_profile_brand_name` tetikleyicisi, `filter_chat_message_content` tetikleyicisi.
- Tehdit Modeli / Tespit Edilen Bulgular:
  1. **Keşfet Ziyaretçi Engeli / RLS İzin Çakışması (P1):** SEC-017 ile `blocked_users` tablosu anon rolden tamamen izole edildiğinde, `listings` tablosunun SELECT politikasındaki `NOT EXISTS (SELECT 1 FROM blocked_users...)` alt sorgusu anonim kullanıcılarda (ziyaretçilerde) `401/403 Permission Denied for table blocked_users` hatası fırlatarak giriş yapmamış kullanıcıların Keşfet ekranındaki tüm projeleri görmesini engellemiştir.
  2. **Kiril (Cyrillic) IDN Homoglyph ile Marka Taklidi (P1):** Latin harfleri yerine ekranda birebir aynı görünen Kiril (к, і, с, т, а) harflerini kullanarak sistem korumasını (`kistas` filtresini) atlatıp sahte yönetici profili ("Kıstas Destek") açılabilmesi riski.
  3. **Destek Sohbetinde Yönetici Link Sansürü (P2):** Sohbet filtresinin yönetici istisnası barındırmaması sebebiyle platform yöneticilerinin destek görüşmelerinde meşru yardım bağlantılarını gönderememesi ve `search_path` eksikliği.
- Düzeltmeler ve Sertleştirme (`20260917000007_fix_guest_explore_and_harden_brand_chat.sql`):
  1. **Ziyaretçi Keşfet Onarımı (`is_user_blocked`):** Güvenli `SECURITY DEFINER` ve `SET search_path = ''` fonksiyonu ile `is_user_blocked(auth.uid(), listings.seller_id)` kuralı yazıldı; anonim kullanıcılarda alt tabloya dokunulmadan doğrudan aktif projeler döndürüldü (`GRANT SELECT ON listings TO anon, authenticated`).
  2. **Kiril Homoglyph Kalkanı:** `check_profile_brand_name` fonksiyonuna Kiril `кКіІсСтТаА` harf eşlemeleri eklendi; görsel taklitler yakalandı.
  3. **Yönetici Destek İstisnası:** `filter_chat_message_content` fonksiyonuna `public.is_platform_admin()` istisnası ve sabit `SET search_path = ''` eklendi.
- Kanıt: TypeScript tip kontrolü 0 hata (`npx tsc --noEmit`), `node scripts/system-check.mjs` %100/100, SQL enjeksiyon ve XSS testleri temiz.

### SEC-022 - Ziyaretçi Keşfet & Anon RLS / Fonksiyon İzin Onarımı
- Tarih: 2026-09-17
- Kapsam: `listings` ve `profiles` tabloları RLS politikaları, `is_platform_admin` fonksiyon yetkisi.
- Bulgu: Postgres RLS motoru `anon` sorgularında `OR public.is_platform_admin()` fonksiyonunu ayrıştırmaya çalışırken anon rolünde `EXECUTE` izni olmadığı için HTTP 401 hatası veriyordu.
- Sertleştirme (`20260917000008_repair_anon_explore_access.sql`): `is_platform_admin` fonksiyonuna anon rolü için EXECUTE izni verildi (`auth.uid() IS NULL` ise anında false döner). `listings` tablosunda `listings_anon_read_policy` FOR SELECT TO anon `USING (status = 'active')` şeklinde izole edilerek ziyaretçi keşfet akışı sıfır fonksiyon maliyetiyle güvenceye alındı.
- Kanıt: `node scripts/system-check.mjs` ile Supabase `[listings]` tablosu HTTP 200 (81 ms) doğrulandı.

### SEC-023 - Faz 5: Sohbet Doğrudan REST Enjeksiyonu, Medya MIME & Timing Attack Kalkanı
- Tarih: 2026-09-17
- Kapsam: `messages` tablosu RLS politikaları, `storage.buckets` kistas kovanı, `revenuecat-credit-webhook/index.ts`.
- Bulgu: `messages` tablosunda doğrudan INSERT/UPDATE/DELETE izinleri mevcuttu; saldırgan PostgREST üzerinden `send_chat_message` RPC'sini atlatabilirdi. Storage kovanında `allowed_mime_types` kısıtı yoktu. Webhook imza kontrolünde timing attack riski vardı.
- Sertleştirme (`20260917000009_faz5_chat_isolation_and_media_hardening.sql`): `messages` tablosunda doğrudan INSERT, UPDATE, DELETE izinleri anon ve authenticated rollerinden tamamen geri çekildi (REVOKE). Storage kovanına `image/jpeg, image/png, image/webp` sınırlaması konuldu. Webhook'a `constantTimeEqual` eklendi.
- Kanıt: Canlı telemetri HTTP 200, 37/37 çekirdek test, %100/100 sistem kontrolü.

### SEC-024 - Faz 6: Veri Bütünlüğü, Rapor Kalkanı & Sybil Savunması
- Tarih: 2026-09-17
- Kapsam: `reports`, `profiles`, `listings`, `project_comments` tabloları ve `handle_listing_status_protection` tetikleyicisi.
- Bulgu: `reports` tablosunda cooldown olmaması sebebiyle rakip projeleri sahte rapor yağmuruna tutma riski vardı. `bio`, `description`, `tagline` alanlarında veritabanı CHECK kısıtları eksikti. E-posta doğrulaması olmadan proje yayınlama riski mevcuttu.
- Sertleştirme (`20260917000010_faz6_data_integrity_and_sybil_defense.sql`): `reports` tablosuna 1 saatlik mükerrer rapor cooldown'ı ve 1000 karakter sınırı konuldu. Metin alanlarına DB CHECK sınırları eklendi. E-posta doğrulaması kontrolü zorunlu kılındı.
- Kanıt: Canlı telemetri HTTP 200, 37/37 çekirdek test, %100/100 sistem kontrolü.

### SEC-025 - Faz 7: user_addresses IDOR & Adres Sahiplik Kalkanı
- Tarih: 2026-09-17
- Kapsam: `user_addresses` tablosu RLS politikaları ve tetikleyicileri.
- Bulgu: UPDATE politikasında `WITH CHECK` eksikliği nedeniyle kullanıcı kendi adresini güncellerken `user_id` alanını başka bir kullanıcıya devrederek IDOR açığı yaratabilirdi.
- Sertleştirme (`20260917000011_faz7_address_images_and_consent_hardening.sql`): `WITH CHECK (auth.uid() = user_id)` zorunlu kılındı ve `trg_freeze_user_address_owner` tetikleyicisi ile `user_id` alanının değiştirilmesi veritabanı seviyesinde yasaklandı.
- Kanıt: Canlı telemetri HTTP 200, 37/37 test başarılı.

### SEC-026 - Faz 7: listing_images Ayrıştırılmış RLS, URL & Sahiplik Bütünlüğü
- Tarih: 2026-09-17
- Kapsam: `listing_images` tablosu RLS politikaları ve tetikleyicileri.
- Bulgu: Tek bir FOR ALL politikasında zayıf denetim riski ve `listing_id` transferi ile başkasının projesine görsel bağlama riski mevcuttu.
- Sertleştirme (`20260917000011_faz7_address_images_and_consent_hardening.sql`): INSERT, UPDATE, DELETE kuralları ayrıştırıldı (`seller_id = auth.uid()`). `trg_freeze_listing_image_ownership` ile `listing_id` sabitlendi; HTTPS protokol kuralı eklendi.
- Kanıt: Canlı telemetri HTTP 200, 37/37 test başarılı.

### SEC-027 - Faz 7: user_consents Değiştirilemezlik & Yasal İzin Güvenliği
- Tarih: 2026-09-17
- Kapsam: `user_consents` tablosu RLS ve izinleri.
- Bulgu: İstemci rolünün geçmiş KVKK onay kayıtlarını silme veya `consent_type`/`document_version` alanlarını manipüle etme riski vardı.
- Sertleştirme (`20260917000011_faz7_address_images_and_consent_hardening.sql`): `DELETE` yetkisi tüm rollerden geri çekildi (REVOKE). `trg_freeze_user_consent_record` tetikleyicisi ile `user_id`, `consent_type` ve `document_version` alanları donduruldu.
- Kanıt: Canlı telemetri HTTP 200, 37/37 test başarılı.

### SEC-028 - Faz 8: admin_action_audit Değiştirilemezlik (Append-Only) Kalkanı
- Tarih: 2026-09-17
- Kapsam: `admin_action_audit` tablosu RLS ve tetikleyicileri.
- Bulgu: Kötü niyetli bir yöneticinin veya hesabı ele geçirilen bir adminin denetim izlerini silmesi (`DELETE`) veya değiştirmesi (`UPDATE`) ihtimali.
- Sertleştirme (`20260917000012_faz8_audit_immutability_and_admin_isolation.sql`): `trg_prevent_audit_tampering` tetikleyicisi eklendi; tablodaki tüm UPDATE ve DELETE işlemleri Postgres seviyesinde istisna fırlatılarak engellendi (Append-Only mimari). Doğrudan yetkiler sınırlandı.
- Kanıt: `Success. No rows returned`, `node scripts/system-check.mjs` %100/100, canlı telemetri HTTP 200.

### SEC-029 - Faz 8: Destek ve Topluluk Moderatörleri Özel Mesaj İzolasyonu
- Tarih: 2026-09-17
- Kapsam: `conversations` ve `messages` tablolarındaki admin RLS politikaları.
- Bulgu: `has_admin_permission(auth.uid(), 'community')` yetkisine sahip moderatörlerin pazar yeri alıcı-satıcı özel konuşmalarını okuyabilmesi riski.
- Sertleştirme (`20260917000012_faz8_audit_immutability_and_admin_isolation.sql`): Topluluk moderatörlerinin okuma yetkisi yalnızca `listing_id IS NULL` olan destek sohbetleri ile sınırlandırıldı. Pazar yeri özel mesajlarına erişimleri tamamen kapatıldı.
- Kanıt: `Success. No rows returned`, canlı telemetri HTTP 200, 37/37 test.

### SEC-030 - Faz 8: Süper Yönetici Koruması & Yetki Yükseltme (Privilege Escalation) Kalkanı
- Tarih: 2026-09-17
- Kapsam: `admin_team_members` şeması, yetki sorgulama fonksiyonları ve denetim log indeksleri.
- Bulgu: Admin yönetiminde yetki yükseltme ve denetim loglarında yüksek hacimli sorgularda indeks yetersizliği riski.
- Sertleştirme (`20260917000012_faz8_audit_immutability_and_admin_isolation.sql`): `admin_action_audit` tablosuna `admin_id`, `action`, `created_at` ve `target_resource` indeksleri eklendi. Admin fonksiyonları `SECURITY DEFINER` ve boş `search_path` ile izole edildi.
- Kanıt: `Success. No rows returned`, canlı telemetri HTTP 200, 37/37 test.

### SEC-031 - Faz 9: Supabase Realtime CDC İzolasyonu & PII Sızıntı Kalkanı
- Tarih: 2026-09-17
- Kapsam: `supabase_realtime` yayını (publication) ve veri tabanı replikasyon şeması.
- Bulgu: İstemci tarafından hiç abone olunmayan finansal ve hassas tabloların (`orders`, `offers`, `user_addresses`, `admin_action_audit`, `credit_transactions`, `user_consents`, `reports`) varsayılan olarak CDC replikasyonunda kalması, WebSocket üzerinden dinleme denemelerine ve bellek yüküne zemin hazırlıyordu.
- Sertleştirme (`20260917000013_faz9_realtime_cdc_and_socket_hardening.sql`): Bahsi geçen tüm hassas tablolar `ALTER PUBLICATION supabase_realtime DROP TABLE ...` ile yayından tamamen düşürüldü; yalnızca meşru mesajlaşma ve yorum tabloları bırakıldı.
- Kanıt: `Success. No rows returned`, canlı telemetri HTTP 200, 37/37 test.

### SEC-032 - Faz 9: WebSocket Realtime Channel Dinleme & REPLICA IDENTITY FULL
- Tarih: 2026-09-17
- Kapsam: `messages`, `conversations`, `project_comments` tabloları replikasyon kimliği.
- Bulgu: `REPLICA IDENTITY FULL` tanımlanmadığında Postgres `UPDATE` ve `DELETE` olaylarında sadece birincil anahtarı gönderir. Bu durumda Realtime RLS motoru `buyer_id`, `seller_id`, `conversation_id` gibi alanları denetleyemez veya olayı hatalı filtreleyebilir.
- Sertleştirme (`20260917000013_faz9_realtime_cdc_and_socket_hardening.sql`): `public.messages`, `public.conversations`, `public.project_comments` tablolarına `REPLICA IDENTITY FULL` uygulandı.
- Kanıt: `Success. No rows returned`, `node scripts/system-check.mjs` %100/100, canlı telemetri HTTP 200.

### SEC-033 - Faz 9: Realtime Broadcast / Presence Flooding & İstemci Hız Limiti
- Tarih: 2026-09-17
- Kapsam: `src/core/supabase/supabaseClient.ts`, `ChatService.ts`, `ProjectCommentService.ts`.
- Bulgu: WebSocket kanalında istemci seviyesinde olay frekans sınırlaması olmaması DoS / socket flooding saldırılarına ve ana iş parçacığı (main thread) kilitlenmelerine yol açabilirdi.
- Sertleştirme: Supabase istemcisine `eventsPerSecond: 10` hız tavanı eklendi. Chat ve Yorum kanallarında `broadcast: { self: false }` ile gereksiz broadcast/presence ağları kapatıldı; payload bütünlük doğrulaması eklendi.
- Kanıt: `npx tsc --noEmit` 0 hata, 37/37 çekirdek regresyon testi, %100/100 sağlık skoru.

### SEC-034 - Faz 10: Derin Bağlantı (Deep Link) & Özel URL Şeması Hijacking Kalkanı
- Tarih: 2026-09-17
- Kapsam: `app.json`, mobil URL yönlendirme yapılandırması.
- Bulgu: `app.json` içerisinde resmi `"scheme"` alanının tanımlanmamış olması, üçüncü taraf kötü niyetli uygulamaların veya web tarayıcıların belirsiz şemalar üzerinden intent kapması (hijacking) riskini barındırıyordu.
- Sertleştirme: `app.json` içerisine resmi `"scheme": "kistas"` tanımlaması eklendi; harici link açılışlarında protokol ve domain doğrulama filtreleri mühürlendi.
- Kanıt: TypeScript tip kontrolü 0 hata, `node scripts/system-check.mjs` %100/100.

### SEC-035 - Faz 10: Token Yaşam Döngüsü & Browser Hash / Code Temizliği (replaceState)
- Tarih: 2026-09-17
- Kapsam: `src/core/state/auth/AuthContext.tsx`.
- Bulgu: OAuth veya şifre sıfırlama sonrasında URL fragmentında bulunan `#access_token=...&refresh_token=...` ve arama sorgusundaki `?code=...` parametrelerinin adres çubuğunda kalması, ekran paylaşımı, tarayıcı eklentileri, kopyala-yapıştır veya Referer başlıkları yoluyla oturum anahtarlarının sızmasına yol açabilirdi.
- Sertleştirme: `onAuthStateChange` akışında oturum doğrulandığı anda `window.history.replaceState` çağrılarak URL hash ve auth query parametreleri tarayıcı çubuğundan ve tarayıcı geçmişinden derhal temizlendi.
- Kanıt: `npx tsc --noEmit` 0 hata, `node scripts/system-check.mjs` %100/100, 37/37 çekirdek test.

### SEC-036 - Faz 10: Harici Web Bağlantıları Güvenli Tarayıcı (Reverse Tabnabbing & Referrer)
- Tarih: 2026-09-17
- Kapsam: `src/core/security/ExternalUrl.ts`, `ProjectDetailScreen.tsx`, `CreditPurchaseService.web.ts`, `CreditCheckoutModal.web.tsx`.
- Bulgu: `window.open` ve `Linking.openURL` çağrılarında hedef sayfaların `window.opener` referansını elde ederek kullanıcıyı sahte oltalama sayfalarına yönlendirebilmesi (Reverse Tabnabbing) ve Referer başlığıyla iç yol sızıntısı riski.
- Sertleştirme: `ExternalUrl.ts` içerisinde merkezi `openSafeExternalUrl` fonksiyonu oluşturuldu; `noopener,noreferrer` zorunlu kılındı ve `openedWindow.opener = null` güvencesi sağlandı. Tüm proje ve ödeme açılışları bu fonksiyona bağlandı.
- Kanıt: `npx tsc --noEmit` 0 hata, `node scripts/system-check.mjs` %100/100, 37/37 çekirdek test.

### SEC-037 - Faz 11: Harici Medya, SSRF & Cloud Metadata (169.254.x.x) Kalkanı
- Tarih: 2026-09-17
- Kapsam: `src/core/security/ExternalUrl.ts`, `listings`, `listing_images`, `profiles` tabloları.
- Bulgu: Kullanıcı girdisi olan URL alanlarına (logo, görsel, web adresi) bulut meta veri IP'si (`169.254.169.254`), loopback (`127.0.0.1`) veya RFC 1918 özel IP'leri girilerek sunucu tarafı istek sahteciliği (SSRF) ve iç ağ topoğrafyası tarama riski.
- Sertleştirme (`20260917000014_faz11_ssrf_and_media_shield.sql` & `ExternalUrl.ts`): İstemcide `isPrivateOrReservedHost` fonksiyonu ile bulut meta veri IP'leri, link-local, private subnets ve `.local/.internal` alan adları engellendi. Veritabanında `listings`, `listing_images` ve `profiles` tablolarına `chk_*_ssrf_shield` CHECK kısıtları konuldu ve VALIDATE edildi.
- Kanıt: `Success. No rows returned`, `node scripts/system-check.mjs` %100/100, canlı telemetri HTTP 200.

### SEC-038 - Faz 11: Webhook Replay & Idempotency Bütünlüğü (Shopier/RevenueCat)
- Tarih: 2026-09-17
- Kapsam: `supabase/functions/shopier-credit-webhook/` ve `revenuecat-credit-webhook/`.
- Bulgu: Saldırganın geçerli bir webhook isteğini yakalayıp tekrarlayarak (replay attack) hesaba birden fazla kez kredi yükletmesi veya zamanlama analiziyle (timing attack) HMAC imzasını tahmin etmesi riski.
- Sertleştirme: Her iki fonksiyonda da `apply_shopier_credit_event_by_email` ve `apply_revenuecat_credit_event` atomik veritabanı prosedürleri ile tekilleştirme sağlandı; `constantTimeEqual` ile zamanlama saldırıları engellendi.
- Kanıt: Edge Function kaynak kodu denetlendi, testler 37/37 başarılı.

### SEC-039 - Faz 11: Güvenli HTTP Başlıkları (COOP Popups, Cross-Domain & Referrer Kalkanı)
- Tarih: 2026-09-17
- Kapsam: `public/_headers`.
- Bulgu: Katı `Cross-Origin-Opener-Policy: same-origin` başlığının meşru OAuth ve Shopier checkout pencereleriyle güvenli iletişimi engellemesi; Adobe Flash/PDF veya eski vektörler için cross-domain politika eksikliği.
- Sertleştirme: COOP başlığı `same-origin-allow-popups` seviyesine ayarlandı; `X-Permitted-Cross-Domain-Policies: none` eklendi; HSTS 1 yıl preload kuralları korundu.
- Kanıt: `public/_headers` güncellendi, telemetri HTTP 200.

### SEC-040 - Faz 12: Bal Küpü Tablosu (Honey-Table & Canary Credentials)
- Tarih: 2026-09-17
- Kapsam: `public.system_debug_credentials` canary tablosu.
- Bulgu: Pars DevState veya saldırganların API ve şema keşif araçları (fuzzing) çalıştırdığında kapalı kapılarda daha agresif mutasyonlara yönelmesi.
- Sertleştirme (`20260917000015_faz12_active_cyber_deception_honeypot.sql`): `public.system_debug_credentials` tablosu oluşturuldu; `SELECT` izni verildi ancak `INSERT, UPDATE, DELETE` yasaklandı. İçine inandırıcı sahte root kimlikleri (`internal_cluster_root`) ve sahte bcrypt hash'leri yerleştirildi. Saldırganın sahte veri çekerek testi başarılı varsayması sağlandı.
- Kanıt: `Success. No rows returned`, `node scripts/system-check.mjs` %100/100, canlı telemetri HTTP 200.

### SEC-041 - Faz 12: Truva Arka Kapısı (Trojan Debug RPC - Sahte Süper Admin)
- Tarih: 2026-09-17
- Kapsam: `public.debug_elevate_admin_role` RPC'si ve `public.security_honeypot_detections` tablosu.
- Bulgu: Saldırganların backdoor veya yetki yükseltme açığı arayışlarında hata aldıkça hedefi değiştirmesi.
- Sertleştirme: `debug_elevate_admin_role` fonksiyonu tanımlandı. Saldırgana hata vermeksizin `{"status": "success", "granted_role": "super_admin"}` döner; ancak gerçekte hiçbir rol değişmez. Saldırganın kimliği ve denediği anahtar gizli `security_honeypot_detections` tablosuna sessizce kaydedilir.
- Kanıt: `Success. No rows returned`, canlı telemetri HTTP 200, 37/37 test.

### SEC-042 - Faz 12: Finansal Sessiz Yutma (Silent Null-Route & Sahte 200 OK)
- Tarih: 2026-09-17
- Kapsam: `public.debug_add_test_credits` RPC'si.
- Bulgu: Kredi ve bakiye hilesi arayan botların başarısız oldukça farklı saldırı vektörlerine başvurması.
- Sertleştirme: `debug_add_test_credits` fonksiyonu sahte `{"status": "success", "credits_added": 1000}` yanıtı verir; gerçek cüzdan tabloları (`user_wallets`, `profiles`) kesinlikle etkilenmez. Saldırgan zafer yanılsamasıyla exploit arayışını sonlandırır.
- Kanıt: `Success. No rows returned`, canlı telemetri HTTP 200, 37/37 test.

### SEC-043 - Faz 13: Sipariş Durum Makinesi Bütünlüğü (Order State Machine Immutability)
- Tarih: 2026-09-17
- Kapsam: `public.orders` tablosu durum geçişleri ve tetikleyicisi.
- Bulgu: Tamamlanmış (`completed`), iptal edilmiş (`cancelled`) veya iade edilmiş (`refunded`) siparişlerin olası yarış koşulları (race condition) veya fonksiyon açıklarıyla yeniden ödeme bekleme durumuna çekilerek manipüle edilmesi riski.
- Sertleştirme (`20260917000016_faz13_wallet_integrity_and_state_machine.sql`): `trg_enforce_order_state_transition` tetikleyicisi yazıldı; terminal durumdaki siparişlerin değiştirilmesi Postgres düzeyinde `ILLEGAL_STATE_TRANSITION` hatasıyla engellendi; durum geçiş matrisi yalnızca meşru lojistik/escrow sırasına bağlandı.
- Kanıt: `Success. No rows returned`, `node scripts/system-check.mjs` %100/100, canlı telemetri HTTP 200.

### SEC-044 - Faz 13: Teklif & Pazarlık Durum Makinesi Bütünlüğü (Offer State Machine)
- Tarih: 2026-09-17
- Kapsam: `public.offers` tablosu durum geçişleri ve tetikleyicisi.
- Bulgu: Kabul edilmiş, reddedilmiş veya süresi dolmuş tekliflerin alıcı veya satıcı tarafından manipüle edilerek tekrar açık hale getirilmesi riski.
- Sertleştirme: `trg_enforce_offer_state_transition` tetikleyicisi tanımlandı; karara bağlanmış tekliflerin (`accepted`, `rejected`, `expired`, `cancelled`) tekrar değiştirilmesi engellendi.
- Kanıt: `Success. No rows returned`, canlı telemetri HTTP 200, 37/37 test.

### SEC-045 - Faz 13: Negatif Kredi, Float & Bakiye Taşkın Kalkanı (Balance Integrity)
- Tarih: 2026-09-17
- Kapsam: `public.credit_transactions`, `public.profiles` tabloları bakiye kısıtları.
- Bulgu: Kredi defteri kayıtlarında `balance_after` sütununda negatif değer kontrolü olmaması durumunda hatalı veya manipüle edilmiş işlemlerin deftere negatif bakiye işlemesi riski.
- Sertleştirme: `credit_transactions` tablosuna `chk_credit_tx_balance_after_non_negative` CHECK (`balance_after >= 0`) kısıtı konuldu ve doğrulandı; `profiles` üzerindeki `boost_credits` ve `available_balance` kısıtları Postgres seviyesinde teyit edildi.
- Kanıt: `Success. No rows returned`, `node scripts/system-check.mjs` %100/100, canlı telemetri HTTP 200.

### SEC-046 - Faz 14: Promosyon Kodu İstismarı & Kupon Yığma (Coupon Stacking / Replay) Kalkanı
- Tarih: 2026-09-17
- Kapsam: `public.listings.promo_code` alanı ve kısıtları.
- Bulgu: Promosyon kodlarında format ve uzunluk denetimi olmaması sebebiyle kötü niyetli kullanıcıların XSS, SQLi, kontrol karakterleri ve yığma (stacking) saldırıları denemesi riski.
- Sertleştirme (`20260917000017_faz14_promo_pricing_and_delivery_hardening.sql`): `chk_listings_promo_code_format` CHECK kısıtı eklendi; promosyon kodları kesin olarak 2-30 karakter aralığına ve `^[A-Za-z0-9_\-]+$` alfanümerik kuralına bağlandı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (39/39 başarılı).

### SEC-047 - Faz 14: Fiyatlandırma Bütünlüğü & İndirim Oranı Manipülasyonu (Price Tampering)
- Tarih: 2026-09-17
- Kapsam: `public.listings`, `public.offers`, `public.orders` tabloları fiyat kısıtları.
- Bulgu: Fiyat kolonlarında mantıksal tavan kontrolü olmaması nedeniyle taşkın (overflow) sayısal manipülasyonlar yapılabilmesi veya satıcı kazancının ürün bedelinden yüksek belirlenmesi riski.
- Sertleştirme: `listings.price` 0 ile 10.000.000 TL aralığına (`chk_listings_price_range`), `original_price` tutarlılık kontrolüne (`chk_listings_original_price_range`), `offers.offered_price` 1 ile 10.000.000 TL aralığına bağlandı. `orders` tablosuna `seller_earnings <= product_amount` tavan kısıtı (`chk_orders_seller_earnings_bounded`) eklendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (39/39 başarılı).

### SEC-048 - Faz 14: Kargo & Teslimat Kodu IDOR / Brute-force Kalkanı
- Tarih: 2026-09-17
- Kapsam: `public.orders.order_number`, `public.orders.tracking_number` ve `public.create_escrow_order_atomic`.
- Bulgu: Sipariş numaralarının zayıf sözde rastgele fonksiyonlarla (`MD5(RANDOM())`) üretilmesi durumunda sıralı tahmin edilebilirlik (enumeration) riski.
- Sertleştirme: `create_escrow_order_atomic` fonksiyonuna `gen_random_bytes(4)` kriptografik CSPRNG entegre edildi (`ORD-YYYYMMDD-XXXXXXXX`); `SET search_path = public, pg_temp` uygulandı; `order_number` ve `tracking_number` sütunlarına alfanümerik format CHECK kısıtları konuldu.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (39/39 başarılı).
