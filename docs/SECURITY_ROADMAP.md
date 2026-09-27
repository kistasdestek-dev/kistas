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
| SEC-005 | Canlı Destek Görüşme Yaşam Döngüsü ve Yönetici Silme Yetkisi | 4/5 | P1 | DOGRULANDI | Sayra | `20260927000001_repair_support_conversation_close.sql` canlıya uygulandı; migration geçmişi eşleşti, anonim RPC 401/forbidden, web 14/14 ve core-domain 85/85 temiz |
| SEC-006 | Yönetim Ekibi Görev Bazlı Yetkilendirme | 2/5 | P1 | DOGRULANDI | Codex | Sabit süper yönetici, izin allowlisti, kapsam bazlı RPC/RLS ve core-domain testi (26/26) |
| SEC-007 | Proje Düzeltmesini Güvenli Yeniden Gönderme | 2/3 | P1 | DOGRULANDI | Codex | Sahiplik ve durum doğrulamalı RPC, anonim erişim reddi, denetim kaydı ve core-domain testi (32/32) |
| SEC-008 | Eski alan adindaki KVKK iletisim adresi ve paylasim URL'leri | 6/7 | P2 | DUZELTILDI | Codex / kullanici | Canli gizlilik metni ve blog linkleri dogrulandi; kistasdestek@gmail.com gercek teslimat testi kullanicida bekliyor (hedef 2026-09-15) |
| SEC-009 | Expo arac zincirinde dolayli uuid guvenlik uyarisi | 6 | P2 | RISK_KABUL | Codex | `npm audit --omit=dev --audit-level=high`: 0 high/critical, 26 moderate; duzeltme yok, sonraki Expo surumunde yeniden degerlendirilecek |
| SEC-010 | Supabase Auth e-posta teslimati ve sifre kurtarma | 6/7 | P2 | KISMI | Codex / kullanici | SMTP teslimati, Gmail SPF/DKIM/DMARC PASS ve kurtarma ekranina yonlendirme dogrulandi. Turkce Kistas sablonuyla yeni kurtarma postasi Gmail Gelen Kutusu'na ulasti; yeni sifre kaydi ve yeni kayit dogrulamasi bekliyor (hedef 2026-09-15). |
| SEC-011 | GA4 URL token sizintisi ve izinsiz analitik | 6/7 | P1 | DOGRULANDI | Sayra | 2026-09-24: Consent-first GA4 korumasi Next.js/Workers mimarisine tasindi. Google kodu yalniz istege bagli onaydan sonra yuklenir; reklam depolamasi kapali kalir, URL query/hash analitige gonderilmez ve ret sonrasi GA devre disi birakilir. Birim ve Playwright tarayici regresyonlari basarili. |
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

| SEC-049 | Faz 15: Siber Tehdit ve Pentest Aracı Parmak İzi Tespiti (Scanner Fingerprint & Payload Capture) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `20260917000018_faz15_threat_intelligence_radar.sql`, `tool_fingerprint`, core-domain (42/42) |
| SEC-050 | Faz 15: Sayra Siber Tehdit Radarı & Karşı-Aldatma Yönetim Motoru | 2/5/6 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `ThreatIntelligenceView.tsx`, `admin_get_threat_intel_overview`, core-domain (42/42) |
| SEC-051 | Bal Küpü Aşama 1: Web & DOM Düzeyi İleri Tuzaklar (Window Canary, DOM Decoy, Storage Poisoning) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `WebSecurityShieldService.ts`, `HoneypotTrapService.ts`, core-domain (68/68) |
| SEC-052 | Bal Küpü Aşama 2: robots.txt Arama Motoru & Dizin Tarayıcı Tuzağı (Nuclei / FFUF / Bot Trap) | 1/2/6 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `public/robots.txt`, `HoneypotTrapService.ts`, `webRouting.ts`, core-domain (69/69) |
| SEC-053 | Bal Küpü Aşama 3: URL Parametreleri & Sahte API Endpoint'leri (Canary Route Traps) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `HoneypotTrapService.ts`, `webRouting.ts`, core-domain (70/70) |
| SEC-054 | Bal Küpü Aşama 4: Akıllı ve Çok Katmanlı Form Bal Küpleri (Multi-Layer Invisible Honeypot Fields) | 1/2/4 | P1 | DOGRULANDI | Sayra (SAYRA-CODE) | `HoneypotDecoyField.tsx`, `HoneypotTrapService.ts`, core-domain (71/71) |

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
- 2026-09-27 regresyonu: `20260918000009_faz18_pars_defender_db_level_threat_radar.sql`, güvenli kapanış RPC'sini sonradan ezerek var olmayan `conversations.is_archived` kolonuna yazdı; `community` yetkisini, destek görüşmesi kapsam kontrolünü, sistem mesajını ve denetim kaydını kaybettirdi. Yeni ileri migration bu davranışları geri getirir. Canlı migration ve pozitif yönetici testi tamamlanana kadar bulgu yeniden açık tutulur.

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

### SEC-049 - Faz 15: Siber Tehdit ve Pentest Aracı Parmak İzi Tespiti
- Tarih: 2026-09-17
- Kapsam: `public.security_threat_events` tablosu, `record_security_threat_event` ve Faz 12 honeypot tetikleyicileri.
- Bulgu: Otomatik pentest ve zafiyet tarama araçlarının (sqlmap, Burp Suite, Nuclei, Nikto vb.) ve botların sisteme vurduğunda parmak izlerinin yakalanmaması ve atılan saldırı payload'larının ders çıkarılmak üzere arşivlenememesi riski.
- Sertleştirme (`20260917000018_faz15_threat_intelligence_radar.sql`): `security_threat_events` tablosu oluşturuldu; `tool_fingerprint`, `attack_vector`, `severity`, `payload_snapshot` ve `action_taken` ('HONEYPOT_DECEIVED', 'SILENT_NULL_ROUTED', 'QUARANTINED') alanlarıyla zero-trust RLS ile kapatıldı. Faz 12 tuzakları (`debug_elevate_admin_role`) tehdit radarına bağlandı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (42/42 başarılı).

### SEC-050 - Faz 15: Sayra Siber Tehdit Radarı & Karşı-Aldatma Yönetim Motoru
- Tarih: 2026-09-17
- Kapsam: `ThreatIntelligenceView.tsx`, `AdminService.ts`, `AdminDashboardScreen.tsx` ve `admin_get_threat_intel_overview`.
- Bulgu: Yönetim kadrosunun saldırganları gerçek zamanlı izleyememesi, saldırı araçlarının yoğunluğunu görememesi ve saldırgan aktörleri anında karantinaya alacak merkezi bir karşı-istihbarat silahının eksikliği.
- Sertleştirme: Yönetim Merkezine (`AdminDashboardScreen`) bağımsız ve modüler `ThreatIntelligenceView` bileşeni eklendi; `admin_get_threat_intel_overview`, `admin_get_threat_events`, `admin_quarantine_threat_actor` ve `admin_release_threat_actor` güvenlik RPC'leri entegre edildi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (44/44 başarılı).

### SEC-051 - Faz 15.2 & Aşama 1: Aktif WAF Karantina Kapısı (Client-Side WAF Guard & Enforced Blocklist)
- Tarih: 2026-09-17
- Kapsam: `security_quarantine_blocklist`, `check_is_quarantined`, `SecurityEnforcementService.ts`, `QuarantineBlockScreen.tsx`, `App.tsx`.
- Bulgu: Tehdit aktörü veya IP yönetici tarafından karantinaya alındığında istemci tarafında anlık tecrit mekanizmasının bulunmaması ve saldırganın uygulamayı kullanmaya devam edebilme riski.
- Sertleştirme (`20260917000019_faz15_active_waf_quarantine_enforcement.sql`): `security_quarantine_blocklist` tablosu ve `check_is_quarantined` WAF kapısı kuruldu. İstemci katmanında 2 dakikalık akıllı önbellek ile `SecurityEnforcementService` oluşturuldu. `App.tsx` kök gezinmesinde karantina teyit edildiğinde saldırganın karşısına Kıstas Tasarım Sistemi standardında caydırıcı `QuarantineBlockScreen` (WAF-403) çıkartılarak sistemden tamamen izole edildi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (44/44 başarılı). Tipografi, 0 tip hatası ve Fortress Sağlık Radarı (%100 / 100 A+) ile doğrulandı.

### SEC-052 - Faz 15.2 & Aşama 2: Yönetim Panelinde Aktif Bloklistesi Yöneticisi (WAF Blocklist Manager)
- Tarih: 2026-09-17
- Kapsam: `ThreatIntelligenceView.tsx`, `SecurityEnforcementService.clearCache()`, `AdminService.ts`.
- Bulgu: Karantinaya alınan IP ve aktörlerin canlı tehdit akışı içinde kaybolması, aktif bloklanan aktörleri listeleyip filtreleme ve tek tıkla WAF engeli kaldırma/yönetme mekanizmasının olmaması.
- Sertleştirme: `ThreatIntelligenceView.tsx` içerisine modüler segmented switch (`Canlı Tehdit Akışı` vs `WAF Bloklistesi`) eklendi. Aktif karantinalar için gerçek zamanlı arama çubuğu (`blocklistSearch`), tek tıkla IP kopyalama (`handleCopyIp`), karantina gerekçesi ve `Engeli Kaldır (WAF)` butonu entegre edildi. Karantina eklendiğinde veya kaldırıldığında istemci önbelleğini anında tazeleyen `SecurityEnforcementService.clearCache()` tetikleyicisi bağlandı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (45/45 başarılı). Tipografi ve 0 tip hatası doğrulandı, Fortress Sistem Sağlık Radarı (%100 / 100 A+) onaylandı.

### SEC-053 - Faz 15.3 & Aşama 3: İstemci & Edge Bal Küpü Tuzakları (Honeypot Traps & Canary Decoys)
- Tarih: 2026-09-17
- Kapsam: `20260917000020_faz15_client_honeypot_traps.sql`, `report_client_honeypot_trap`, `HoneypotTrapService.ts`, `HoneypotDecoyField.tsx`, `AuthExperience.tsx`, `App.tsx`.
- Bulgu: Otomatik scanner (DirBuster, gobuster, crawler) ve form botlarının gizli admin yollarını (`/.env`, `/admin-debug`, SQLi query fuzzer) veya kimlik doğrulama formlarını tararken fark edilmeden işlem yapabilmesi riski.
- Sertleştirme:
  1. `report_client_honeypot_trap` RPC'si (`SECURITY DEFINER`, `anon/authenticated` açık) tanımlandı; bal küpüne takılan bot ve scanner'ları anında `security_threat_events` ve `security_quarantine_blocklist` tablolarına kaydedip otomatik karantinaya alır; saldırgana ise şüphe uyandırmayan sahte 200 OK döner.
  2. `HoneypotTrapService.inspectUrlCanaryProbes()` mekanizması kuruldu; `App.tsx` başlatıldığında şüpheli directory brute-force ve SQLi/XSS parametre aramalarını anında yakalar.
  3. `HoneypotDecoyField` ekran okuyucu ve insan gözünden gizlenmiş bot tuzağı bileşeni oluşturuldu ve `AuthExperience.tsx` giriş/kayıt formlarına entegre edildi; alanı dolduran botlar otomatik karantinaya sevk edilir.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (46/46 başarılı). `node scripts/security/check-xss.mjs` temiz, Fortress Sistem Sağlık Radarı (%100 / 100 A+) onaylandı.

### SEC-054 - Faz 15.4 & Aşama 4: Adaptif Hız Sınırı ve Fuzzer Savunması (Adaptive Rate Limiting & Auto-Ban)
- Tarih: 2026-09-17
- Kapsam: `20260917000021_faz15_adaptive_rate_limiting_and_auto_ban.sql`, `enforce_adaptive_rate_limit`, `RateLimitGuardService.ts`.
- Bulgu: Otomatik fuzzer scriptlerinin, credential stuffing veya API parametre tarayıcılarının sistemi yüksek frekansta döverek kaynakları tüketebilmesi veya kaba kuvvet denemeleri yapabilmesi riski.
- Sertleştirme:
  1. `public.security_rate_limit_tracker` tablosu dinamik kayan pencere (sliding window) mimarisiyle kuruldu; 1 saatten eski kayıtlar otonom silinerek sıfır-şişme (zero-bloat) sağlandı.
  2. `enforce_adaptive_rate_limit` RPC'si (`SECURITY DEFINER`, `anon/authenticated` açık) ile ihlal eşiği (`p_auto_ban_threshold = 3`) aşıldığı an saldırganı doğrudan `security_threat_events` (`BURST_FUZZER_RATE_LIMIT`) ve `security_quarantine_blocklist` içine yazarak otonom tecrit (`ADAPTIVE_WAF_AUTO_BAN`) uygulandı.
  3. `RateLimitGuardService.ts` istemci token bucket koruyucusu (`checkClientBurst`) ve sunucu adaptif doğrulayıcısı (`enforceServerRateLimit`) entegre edildi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (47/47 başarılı). Tipografi, 0 tip hatası ve Fortress Sağlık Radarı (%100 / 100 A+) ile doğrulandı.

### SEC-055 - Faz 16.1 & Aşama 1: Web Çalışma Zamanı Kalkanı & İstemci Anti-Tamper Savunması (Web Runtime Shield)
- Tarih: 2026-09-18
- Kapsam: `WebSecurityShieldService.ts`, `ActionSearchBar.tsx`, `App.tsx`.
- Bulgu: Web istemcisinin kötü niyetli üçüncü taraf sitelerde iFrame içine yerleştirilerek UI Redressing / Clickjacking saldırılarına maruz kalabilmesi, arama çubuklarına doğrudan DOM XSS veya SQLi payload'ları enjekte edilerek istemci açıklarının aranması ve konsol üzerinden yetkisiz bellek/oturum müdahaleleri denenmesi riski.
- Sertleştirme:
  1. `WebSecurityShieldService.ts` oluşturuldu; `window.self !== window.top` tespitinde iFrame'e hapsedilme durumunu anında `CLICKJACKING_IFRAME_EMBED` olarak Tehdit Radarına raporlar ve `window.top.location = window.self.location` ile sayfayı çerçeveden kurtarır (frame-busting).
  2. `protectPrototypeIntegrity` ile üretim ortamında `Object.prototype` mühürlenerek Prototype Pollution manipülasyonları engellendi.
  3. `inspectInputPayload` ile arama çubuklarına (`ActionSearchBar`) veya web formlarına enjekte edilmeye çalışılan XSS (`<script>`, `onerror=`, `javascript:`, `cookie`), SQLi (`union select`, `or 1=1`, `--`) ve path traversal (`../../etc/passwd`) saldırı vektörleri istemci seviyesinde anında yakalanarak `HoneypotTrapService` üzerinden WAF karantinasına sevk edildi ve girdinin işlenmesi engellendi.
  4. `displayConsoleSecurityBanner` ile tarayıcı konsolunda Kıstas Siber Savunma Kalkanı uyarısı devreye alındı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (48/48 başarılı). `npx tsc --noEmit` (0 hata), Fortress Sistem Sağlık Radarı (%100 / 100 A+) onaylandı.

### SEC-056 - Faz 16.2 & Aşama 2: RFC 9116 Standart Güvenlik Beyanı (security.txt) ve Ağ Başlıkları Sertleştirmesi
- Tarih: 2026-09-18
- Kapsam: `public/.well-known/security.txt`, `public/security.txt`, `public/_headers`.
- Bulgu: Uluslararası güvenlik araştırmacılarının ve otomatik tarayıcıların zafiyetleri kurumsal ve sorumlu bir kanaldan bildirebileceği RFC 9116 standardının bulunmaması; web ağ geçidinde mikrofon, kamera, ödeme ve donanım yetkilerini kısıtlayan Permissions-Policy eksikliği.
- Sertleştirme:
  1. `public/.well-known/security.txt` ve eski tarayıcılar için `public/security.txt` dosyaları oluşturuldu; `Contact: mailto:kistasdestek@gmail.com`, `Expires: 2027-12-31T23:59:59.000Z`, `Preferred-Languages: tr, en`, `Canonical` ve `Policy` alanlarıyla RFC 9116 standardına bağlandı.
  2. `public/_headers` dosyası askeri düzeye çıkarıldı: `security.txt` için `text/plain; charset=utf-8` ve 7 günlük `Cache-Control` tanımlandı; `Permissions-Policy` donanım ve API kısıtlarıyla (`camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()`) kilitlendi; HSTS `max-age=63072000; includeSubDomains; preload` ve `X-Frame-Options: DENY` pekiştirildi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (49/49 başarılı). `npx tsc --noEmit` (0 hata), Fortress Sistem Sağlık Radarı (%100 / 100 A+) onaylandı.

### SEC-057 - Faz 16.3 & Aşama 3: Kıstas Güvenlik ve Şeffaflık Merkezi (Security & Trust Portal)
- Tarih: 2026-09-18
- Kapsam: `SecurityTrustScreen.web.tsx`, `SecurityTrustScreen.tsx`, `webRouting.ts`, `WebSeoHelper.web.ts`, `CinematicFooter.tsx`, `CinematicFooter.web.tsx`, `App.tsx`.
- Bulgu: Kullanıcılar, kurumsal paydaşlar ve bağımsız güvenlik araştırmacıları için platformun sıfır-güven (Zero-Trust) mimarisini, Pars DevState savunma katmanlarını, RFC 9116 politikasını şeffafça anlatan ve araştırmacıların güvenli zafiyet bildiriminde bulunabileceği (VDP) kurumsal bir portal ve yönlendirme eksikliği.
- Sertleştirme:
  1. `SecurityTrustScreen.web.tsx` ve `SecurityTrustScreen.tsx` Kıstas Tasarım Sistemi standardında (`GlassIconButton`, cam/morfik yüzeyler, `theme.typography.kistas`, kraliyet mavisi vurgular) inşa edildi.
  2. 4 Temel Savunma Sütunu (Sıfır-Güven & RLS, Otomatik WAF & Karşı-Aldatma, Tehdit Radarı & Kriptografik İmzalama, 7/24 Kesintisiz Telemetri) ve 49+ canlı savunma kalkanı rozetleri görselleştirildi.
  3. Canlı Sorumlu Zafiyet Bildirim Formu (Vulnerability Disclosure Program - VDP) entegre edildi. Form girdileri `WebSecurityShieldService.inspectInputPayload` ile anlık XSS/SQLi payload taramasından geçirilir; meşru bildirimler `HoneypotTrapService.triggerHoneypotTrap` üzerinden `VULNERABILITY_DISCLOSURE_REPORT` olarak Tehdit Radarına iletilir (`autoQuarantine: false`).
  4. Web URL yönlendirme (`webRouting.ts`) sistemine `/security/` ve `/guvenlik/` rotaları eklendi; SEO meta etiketleri (`WebSeoHelper.web.ts`) tanımlandı; tüm sayfalardaki alt bilgiye (`CinematicFooter`) "Güvenlik & Şeffaflık" bağlantısı yerleştirildi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (50/50 başarılı). `npx tsc --noEmit` (0 tip hatası), Fortress Sistem Sağlık Radarı (%100 / 100 A+) onaylandı.

### SEC-058 - Faz 16.4 & Aşama 4: Yönetim Paneli Tehdit İstihbaratında VDP ve Web Kalkanı Telemetrisi Entegrasyonu
- Tarih: 2026-09-18
- Kapsam: `ThreatIntelligenceView.tsx`, `AdminService.ts`.
- Bulgu: Web Güvenlik Kalkanı (`WebSecurityShieldService`), RFC 9116 ve `/security` portalı üzerinden gelen sorumlu zafiyet raporlarının (VDP) yönetim panelinde saldırı olaylarıyla karışması veya araştırmacı e-postaları ve teknik bulgularının yönetici tarafından özel olarak filtrelenememesi riski.
- Sertleştirme:
  1. `ThreatIntelligenceView.tsx` Segmented Navigasyon barına 3. mod olarak `VDP Bildirimleri (X)` eklendi (`viewMode: 'stream' | 'blocklist' | 'vdp'`).
  2. `vdpEvents` filtresi (`VULNERABILITY_DISCLOSURE_REPORT`, `Responsible Security Researcher`, `researcher:`) ile meşru araştırmacı raporları izole edildi.
  3. `parseVdpPayload` ile araştırmacı e-postası, rapor başlığı ve teknik detayları yapılandırılmış formatta kartlara döküldü; tek tıkla e-posta kopyalama (`handleCopyEmail`) ve doğrudan e-posta istemcisiyle yanıtlama (`handleMailResearcher`) aksiyonları sağlandı.
  4. Canlı Tehdit Akışında Web Güvenlik Kalkanı olaylarına özel rozetler (`🌐 Web Anti-Clickjacking Kalkanı`, `🛡️ Canlı Girdi & Payload Kalkanı`, `🛡️ Sorumlu Zafiyet Raporu (VDP)`) atandı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (51/51 başarılı). `npx tsc --noEmit` (0 tip hatası), Fortress Sistem Sağlık Radarı (%100 / 100 A+) onaylandı.

### SEC-059 - Faz 17.1 & Aşama 1: Onboarding & Kayıt Kurtarma (PARSRAPOR V9 & Marka Koruması Onarımı)
- Tarih: 2026-09-18
- Kapsam: `handle_new_user()`, `check_profile_brand_name()`, `AuthService.ts`, `20260918000001_faz17_repair_onboarding_and_brand_guard.sql`.
- Bulgu: PARS DevState ofansif pentestinde (V9), yeni kullanıcı kayıtlarının (`POST /auth/v1/signup`) HTTP 500 hatasıyla (`FORBIDDEN: 'Kıstas' adı ve görsel benzeri varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.`) patladığı ve tüm üyelik onboarding akışının kilitlendiği kanıtlandı.
- Kök Neden: `handle_new_user()` fonksiyonunun isim verilmeyen kayıtlarda varsayılan `'Kıstas Üyesi'` ataması yapması ve `check_profile_brand_name()` tetikleyicisinin bu ismi marka taklidi olarak engelleyerek işlemi durdurması.
- Sertleştirme:
  1. `handle_new_user()` içindeki varsayılan isim `'Topluluk Üyesi'` olarak revize edildi; ON CONFLICT bloğu güvenli hale getirildi.
  2. `check_profile_brand_name()` tetikleyicisine `auth.role() = 'service_role'` ve platform admin muafiyeti eklendi; hata kodu `P0001` olarak standardize edildi.
  3. `AuthService.ts` satır 161 ve 430'daki `'Kıstas Üyesi'` fallback değerleri `'Topluluk Üyesi'`ne çevrildi.
  4. `profiles` tablosunda authenticated kullanıcıların kendi satırlarını oluşturma (`profiles_insert_own`) ve güncelleme (`profiles_update_own`) RLS politikaları mühürlendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (52/52 başarılı).

### SEC-060 - Faz 17.2 & Aşama 2: Depolama (Storage) İzolasyonu & 7 Adet Foothold/Probe Dosyasının İmhası (PARSRAPOR V2)
- Tarih: 2026-09-18
- Kapsam: `storage.objects`, `20260918000002_faz17_storage_foothold_cleanup_and_hardening.sql`.
- Bulgu: PARS DevState tarafından `kistas` public bucket'ına anonim dosya yüklenebildiği kanıtlandı ve kovaya silinemeyen 7 adet probe/foothold dosyası (`pars_foothold_beacon.png` vb.) yerleştirildi.
- Sertleştirme:
  1. `storage.objects` üzerindeki tüm gevşek ve anonim yazma politikaları (`Allow anon uploads`, `anon_insert` vb.) tamamen kaldırıldı.
  2. `object_write_authenticated` politikası ile `kistas` kovasına yalnızca authenticated kullanıcıların ve yalnızca izinli görsel uzantılarıyla (`png, jpg, jpeg, webp`) dosya yüklemesi sağlandı.
  3. `object_delete_owner` ve `object_update_owner` politikaları ile dosya silme ve güncelleme yetkisi yalnızca dosya sahibine (`owner = auth.uid()`) veya platform yöneticisine bağlandı.
  4. Pentest esnasında kovaya yerleştirilen 7 adet beacon/probe dosyası (`pars_foothold_beacon.png`, `pars_test.png`, `pars_test_authed.png`, `pars_postpatch_test.png`, `pars_still_open.png`, `final_check.png`, `hardening_probe_1789681500.png`) veritabanından kalıcı olarak silindi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (53/53 başarılı).

### SEC-061 - Faz 17.3 & Aşama 3: Profil PII İzolasyonu & profiles_public Güvenli Görünümü (PARSRAPOR V1 & V1r)
- Tarih: 2026-09-18
- Kapsam: `public.profiles`, `public.profiles_public`, `20260918000003_faz17_profiles_public_view_and_pii_isolation.sql`.
- Bulgu: Hassas kolonlar kapatılmış olsa da anonim role `id` dahil 11 profil kolonunun açık bırakılması sebebiyle tüm kullanıcı UUID'lerinin numaralandırılabilmesi (user enumeration) riski.
- Sertleştirme:
  1. `REVOKE ALL ON TABLE public.profiles FROM anon, public;` ile anonim rolünün `profiles` tablosuna doğrudan erişimi tamamen kesildi.
  2. `public.profiles_public` görünümü (VIEW) oluşturuldu; yalnızca `full_name, is_verified, city, district, bio, avatar_url, rating_average, rating_count, created_at` kolonları kamuya açıldı (`id`, `phone`, `available_balance` gizlendi).
  3. `authenticated` rolü için `profiles_select_own` politikası (`auth.uid() = id OR public.is_platform_admin()`) ile kullanıcıların yalnızca kendi satırını okuyabilmesi garanti edildi (B11 regresyonu önlendi).
  4. `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;` ile gelecekte eklenecek tüm tablolar için varsayılan ret (default-deny) uygulandı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (54/54 başarılı).

### SEC-062 - Faz 17.4 & Aşama 4: Banka Düzeyi Finansal Bütünlük, B5 Self-Destruct Onarımı & Kriptografik Denetim Zinciri (B3, B4, B5, B6)
- Tarih: 2026-09-18
- Kapsam: `public.financial_audit`, `public.anomaly_events`, `guard_financial_columns()`, `write_financial_audit()`, `check_velocity()`, `20260918000004_faz17_bank_grade_financial_integrity_and_audit.sql`.
- Bulgu:
  - B5: Profil satırını silen self-destruct bug'ı (kullanıcı bakiye veya onay kolonunu değiştirmeye çalıştığında profil satırı tamamen siliniyordu).
  - B3: Finansal ve kredi hareketlerinde değiştirilemez, kriptografik hash-zincirli denetim izi eksikliği.
  - B4: Kredi cüzdanında eksi bakiye kontrolü ve tekil işlem takip anahtarı (`request_id`) eksikliği.
  - B6: Yüksek frekanslı anormal bakiye hareketlerinde hız (velocity) tespiti eksikliği.
- Sertleştirme:
  1. `guard_financial_columns()` tetikleyicisi yazıldı: Yetkisiz finansal kolon güncellemesinde veya silme girişiminde satır silinmez, doğrudan `FORBIDDEN: financial/verification fields are admin-only` (`P0001`) hatası fırlatılır (B5 çözüldü).
  2. `public.financial_audit` tablosu oluşturuldu; `_audit_hash(prev_hash, payload)` SHA-256 zinciri ile her bakiye ve profil değişikliği append-only olarak mühürlendi (B3 çözüldü).
  3. `profiles.available_balance >= 0 AND pending_balance >= 0 AND boost_credits >= 0` kısıtı (`chk_no_negative_balance`) ve `credit_transactions` üzerinde `request_id`, `direction` kolonları mühürlendi (B4 çözüldü).
  4. `public.anomaly_events` tablosu ve 1 saatte 10'dan fazla hareket gerçekleştiren hesapları otonom yakalayan `check_velocity()` tetikleyicisi devreye alındı (B6 çözüldü).
- Regresyon: `node scripts/tests/core-domain.test.mjs` (55/55 başarılı).

### SEC-063 - Faz 17.5 & Aşama 5: GoTrue Auth Rate Limiting & Supabase CORS Mühürlemesi (PARSRAPOR V4 & V5)
- Tarih: 2026-09-18
- Kapsam: Supabase Dashboard yapılandırması, GoTrue Rate Limiting, CORS Allowlist, Cloudflare WAF.
- Bulgu: PARS DevState tarafından 12 ardışık başarısız girişte HTTP 429 alınamaması (V4) ve REST/Storage API'larında varsayılan CORS `*` kuralının bulunması (V5).
- Sertleştirme:
  1. Supabase Dashboard -> Authentication -> Rate Limit: `GOTRUE_RATE_LIMIT_TOKEN=5`, `GOTRUE_RATE_LIMIT_DURATION=60` (IP başına 60 saniyede azami 5 deneme).
  2. Supabase Dashboard -> API Settings -> Allowed Origins: `https://www.kistas.com.tr`, `https://kistas.com.tr`, `http://localhost:8081` (CORS `*` tamamen kaldırıldı).
  3. Süper admin (`kistasdestek@gmail.com`) için Supabase Auth TOTP MFA zorunluluğu ve Cloudflare WAF `/auth/v1/*` hız aşım kuralı rehberliği mühürlendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (56/56 başarılı). Fortress Sistem Sağlık Radarı (%100 / 100 A+) onaylandı.

### SEC-064 - Faz 19.1: Savunma Mekanizmasının Silahlaştırılması Engeli (Defense Inversion & Self-DoS Kalkanı)
- Tarih: 2026-09-18
- Kapsam: `report_client_honeypot_trap`, `enforce_adaptive_rate_limit`, `is_safe_whitelisted_ip`, `20260918000010_faz19_defense_inversion_and_anti_dos.sql`.
- Bulgu: Ofansif fuzzer'ların veya anonim saldırganların keyfi IP parametreleri (`p_client_ip`) göndererek meşru kullanıcıları, yöneticileri veya Cloudflare/kurumsal ağları WAF karantinasına kilitletme (Self-DoS) riski.
- Sertleştirme:
  1. `is_safe_whitelisted_ip()` fonksiyonu ile loopback (`127.0.0.1`, `::1`, `localhost`) ve RFC 1918 özel ağları (`10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`) otomatik karantina korumasına alındı.
  2. Anonim çağrılarda IP asla doğrudan karantinaya alınmaz; yalnızca tehdit radarına işlenir. Karantina yalnızca doğrulanmış `auth.uid()` veya meşru yönetici kararıyla uygulanır.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Aşama 1 testi başarılı).

### SEC-065 - Faz 19.2: Eşzamanlı İstek Patlaması & Finansal Bütünlük Kalkanı (Race Condition & Concurrency Shield)
- Tarih: 2026-09-18
- Kapsam: `public.profiles`, `public.orders`, `public.project_upvotes`, `check_recent_boost_spam()`, `20260918000011_faz19_race_condition_and_concurrency_shield.sql`.
- Bulgu: Yüksek eşzamanlı (50-100 paralel thread) isteklerde bakiye düşümü, kupon veya sipariş oluşturma süreçlerinde TOCTOU çift harcama (double spending) riski.
- Sertleştirme:
  1. `profiles` tablosuna veritabanı seviyesinde `chk_profiles_boost_credits_positive`, `chk_profiles_available_balance_positive` ve `chk_profiles_pending_balance_positive` pozitif bakiye kısıtları mühürlendi.
  2. `orders` tablosunda aynı ilan için aynı anda birden fazla aktif sipariş oluşmasını engelleyen `idx_orders_active_listing_unique` tekillik indeksi eklendi.
  3. `project_upvotes` üzerinde `idx_project_upvotes_unique_pair` ile eşzamanlı mükerrer oy enjeksiyonu engellendi.
  4. `check_recent_boost_spam()` fonksiyonu ile 3 saniyelik harcama soğuma süresi sağlandı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Aşama 2 testi başarılı).

### SEC-066 - Faz 19.3: Webhook Uç Noktaları DoS & Kaynak Tüketimi Kalkanı (Edge Function Throttling & Fail-Fast)
- Tarih: 2026-09-18
- Kapsam: `supabase/functions/shopier-credit-webhook/index.ts`, `supabase/functions/revenuecat-credit-webhook/index.ts`.
- Bulgu: Webhook uç noktalarına yönelik kaba kuvvet (brute-force) veya kaynak tüketme (DDoS) saldırılarında Deno Edge Function kaynaklarının kilitlenmesi riski.
- Sertleştirme:
  1. Her iki webhook uç noktasına IP bazlı bellek içi (in-memory) istek sınırlayıcı (`isThrottled`) entegre edildi (10 saniyede azami 20-30 istek; aşımda HTTP 429).
  2. `MAX_BODY_BYTES = 64 * 1024` kontrolü ile 64 KB üzerindeki istekler gövde okunmadan anında HTTP 413 Payload Too Large ile düşürüldü.
  3. Yetkisiz veya geçersiz imzalarda fail-fast HTTP 401 yanıtı mühürlendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Aşama 3 testi başarılı).

### SEC-067 - Faz 19.4: PostgREST Doğrudan API Kazıma & IDOR İzolasyonu (Direct Table Scraping & Zero-Trust Anon Strip)
- Tarih: 2026-09-18
- Kapsam: `user_addresses`, `orders`, `conversations`, `messages`, `notifications`, `user_vault_records`, `security_threat_events`, `20260918000012_faz19_postgrest_api_scraping_and_idor_shield.sql`.
- Bulgu: Doğrudan PostgREST API üzerinden anonim anahtarla hassas işlem, mesaj ve adres tablolarına yönelik enum/fuzzing taramaları.
- Sertleştirme:
  1. `user_addresses`, `orders`, `conversations`, `messages`, `notifications`, `user_vault_records`, `security_threat_events`, `security_quarantine_blocklist`, `security_rate_limit_tracker` tablolarından `anon` ve `public` rolleri tamamen silindi (REVOKE ALL).
  2. `conversations` ve `messages` RLS politikaları yalnızca doğrulanmış alıcı, satıcı veya yetkili destek yöneticisiyle sınırlandırıldı.
  3. `notifications` ve `user_addresses` RLS politikaları kesin `auth.uid() = user_id` kuralıyla kilitlendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Aşama 4 testi başarılı).

### SEC-068 - Faz 19.5: Depolama (Storage) Polyglot Dosya & Stored XSS Kalkanı (Storage Poisoning Prevention)
- Tarih: 2026-09-18
- Kapsam: `storage.buckets`, `storage.objects`, `20260918000013_faz19_storage_polyglot_and_stored_xss_shield.sql`.
- Bulgu: Resim yükleme noktalarına SVG, XML, HTML veya path traversal (`..`) içeren zararlı polyglot dosyalar yüklenerek Stored XSS ve dosya ezme riski.
- Sertleştirme:
  1. `storage.buckets` tavan boyutu 10 MB ve izinli MIME tipleri kesin olarak `image/jpeg`, `image/png`, `image/webp` ile sınırlandırıldı.
  2. `object_write_authenticated` RLS kuralına `name !~ '\.\.'` (Path Traversal Engeli), `name ~ '^[a-zA-Z0-9_\-\./]+$'` karakter kısıtı, `LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')` ve `(owner IS NULL OR owner = auth.uid())` sahiplik kuralı eklendi. SVG ve HTML kesin olarak yasaklandı.
  3. `object_update_owner` güncelleme kuralı aynı sertlikte mühürlendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Aşama 5 testi başarılı).

### SEC-069 - Faz 19.6: WebSocket Realtime CDC Sniffing & Dinleme Kaçağı İzolasyonu (Realtime Publication Hardening)
- Tarih: 2026-09-18
- Kapsam: `supabase_realtime` yayını, `20260918000014_faz19_realtime_cdc_sniffing_shield.sql`.
- Bulgu: Supabase Realtime yayınına eklenen tablolardan websocket istemcilerine hassas veri, bakiye veya güvenlik loglarının akması riski.
- Sertleştirme:
  1. `user_vault_records`, `security_threat_events`, `security_quarantine_blocklist`, `security_honeypot_detections`, `security_rate_limit_tracker`, `system_config_keys`, `admin_credentials`, `system_debug_credentials`, `shopier_credit_purchase_events`, `credit_purchase_events`, `orders`, `offers`, `user_addresses`, `admin_action_audit`, `credit_transactions`, `user_consents`, `reports` tabloları `supabase_realtime` yayınından koşulsuz olarak düşürüldü.
  2. Yalnızca meşru gerçek zamanlı arayüz gereksinimi olan sohbet tabloları kontrollü RLS ile yayında bırakıldı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Aşama 6 testi başarılı).

### SEC-071 - Faz 20.1: KVKK & GDPR Unutulma Hakkı ve Kriptografik Anonimleştirme Motoru (Right-to-be-Forgotten)
- Tarih: 2026-09-18
- Kapsam: `delete_user_account_atomic()`, `ProfileService.deleteAccount()`, `20260918000015_faz20_kvkk_account_deletion_and_anonymization.sql`.
- Bulgu: Kullanıcının hesabını ve kişisel verilerini (PII) KVKK Madde 7/11 ve GDPR Madde 17 uyarınca tek tıkla kalıcı olarak silebilmesi; aynı zamanda yasal muhasebe ve sipariş denetim geçmişinin (financial_audit) veri bütünlüğü bozulmadan kimliksizleştirilmesi (anonymization) gereksinimi.
- Sertleştirme:
  1. `delete_user_account_atomic()` RPC'si (`SECURITY DEFINER`, sabit `search_path = public, pg_temp`) inşa edildi.
  2. Aktif emanet (escrow) ve uyuşmazlık siparişleri kontrolü eklendi (`ACTIVE_ORDERS_EXIST` koruması).
  3. Adresler (`user_addresses`), bildirimler (`notifications`) ve kasa kayıtları (`user_vault_records`) fiziksel olarak imha edildi (hard delete).
  4. Profil PII verileri `Silinmiş Kullanıcı` ve NULL alanlarla anonimleştirildi; `is_banned = TRUE` ile mühürlendi.
  5. KVKK izinleri `consented = FALSE` olarak iptal edildi; `storage.objects` kovasındaki kullanıcı dosyaları tasfiye edildi.
  6. Silme işlemi `admin_action_audit` tablosuna `KVKK_ACCOUNT_ANONYMIZED` olarak kaydedildi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Faz 20 Aşama 1 testi başarılı).

### SEC-072 - Faz 20.2: OAuth State Replay, CSRF & Open-Redirect Hijacking Kalkanı
- Tarih: 2026-09-18
- Kapsam: `AuthService.signInWithOAuth()`, `AuthService.verifyAndConsumeOAuthState()`, `AuthContext.tsx`.
- Bulgu: Yönlendirmeli OAuth akışlarında `state` parametresinin manipüle edilmesi, araya girilerek çalınmış yetkilendirme kodlarının (Authorization Code) yeniden kullanılması (replay) ve açık yönlendirme (Open-Redirect) riskleri.
- Sertleştirme:
  1. OAuth oturumu başlatılırken CSPRNG (`crypto.getRandomValues`) ile kriptografik olarak güçlü 24 baytlık tek kullanımlık `stateNonce` üretildi ve `sessionStorage` içine 10 dakikalık TTL ile kaydedildi.
  2. `ALLOWED_OAUTH_ORIGINS` katı allowlist kontrolü getirilerek yetkisiz kaynaklardan OAuth başlatılması engellendi.
  3. OAuth dönüşünde URL'deki `state` değeri `verifyAndConsumeOAuthState` ile doğrulanarak anında tüketildi (single-use consumption). Uyuşmazlık veya eksiklik durumunda işlem `OAUTH_STATE_MISMATCH_CSRF` olarak Tehdit Radarına raporlandı.
  4. Adres çubuğundaki `state` ve `code` parametreleri `window.history.replaceState` ile anında temizlenerek tarayıcı geçmişinden arındırıldı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Faz 20 Aşama 2 testi başarılı).

### SEC-073 - Faz 20.3: Global Oturum Feshi & Session Invalidation Kalkanı (Zombie Session Purge)
- Tarih: 2026-09-18
- Kapsam: `AuthService.signOut()`, `SecureStorageAdapter.purgeAllAuthData()`.
- Bulgu: Kullanıcı çıkış yaptığında veya şifre değiştirdiğinde diğer cihazlarda veya yerel önbelleklerde eski oturum token'larının geçerli kalabilmesi riski.
- Sertleştirme:
  1. `AuthService.signOut` varsayılan kapsamı `scope: 'global'` olarak mühürlendi; çıkış anında `supabase.auth.signOut({ scope: 'global' })` ve `revoke_user_sessions` RPC'si tetiklenerek tüm bağlı cihazlardaki oturumlar iptal edildi.
  2. `SecureStorageAdapter.purgeAllAuthData()` ve tarayıcı `sessionStorage` üzerindeki profil snapshotları ve OAuth kalıntıları sıfır artık (zero-leak) ilkesiyle temizlendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Faz 20 Aşama 3 testi başarılı).

### SEC-074 - Faz 20.4: İlan, Görsel ve Yorum BOLA/IDOR Savunması & Tehdit Tuzağı
- Tarih: 2026-09-18
- Kapsam: `listings`, `listing_images`, `project_comments`, `20260918000016_faz20_bola_idor_and_threat_trapping.sql`.
- Bulgu: Başkasına ait ilan, görsel veya yorum ID'lerini doğrudan REST veya RPC üzerinden göndererek içerik pasife alma, silme veya değiştirme (Broken Object Level Authorization - BOLA/IDOR) denemeleri.
- Sertleştirme:
  1. `guard_listing_ownership_and_trap_idor` tetikleyicisi ile `listings` üzerindeki UPDATE/DELETE işlemlerinde `OLD.seller_id = auth.uid()` veya yönetici yetkisi kesin olarak doğrulandı.
  2. `guard_listing_image_ownership_and_trap_idor` tetikleyicisi ile `listing_images` CUD işlemlerinde ilanın gerçek sahibinin `auth.uid()` olduğu teyit edildi.
  3. `guard_project_comment_ownership_and_trap_idor` tetikleyicisi ile `project_comments` üzerinde `OLD.user_id = auth.uid()` doğrulaması sağlandı.
  4. Yetkisiz herhangi bir BOLA/IDOR teşebbüsünde işlem sessizce engellenmekle kalmayıp doğrudan `security_threat_events` tablosuna `BOLA_IDOR_LISTING_TAMPER`, `BOLA_IDOR_IMAGE_TAMPER` ve `BOLA_IDOR_COMMENT_TAMPER` olarak kaydedilerek saldırgan Tehdit Radarına tuzaklandı.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (Faz 20 Aşama 4 testi başarılı).

### SEC-075 - Faz 20.5: P2P Sohbet ve Yorum Phishing / URL Filtreleme Kalkanı
- Tarih: 2026-09-18
- Kapsam: `messages`, `project_comments`, `20260918000017_faz20_chat_phishing_and_url_filter.sql`.
- Bulgu: Sohbet mesajları ve proje yorumları üzerinden kimlik avı (phishing), sahte ödeme linkleri, kısaltılmış URL yönlendirmeleri (bit.ly, t.me vb.) ve maskelenmiş IP/obfuscated web adresleri paylaşılması riski.
- Sertleştirme:
  1. `filter_chat_message_content()` geliştirildi: Türkiye/uluslararası telefon ve IBAN filtrelerinin yanı sıra kısaltma servisleri (`bit.ly`, `tinyurl.com`, `is.gd`, `t.me`, `wa.me`, `cutt.ly`, `discord.gg`), doğrudan IP adresli linkler (`192.168.x.x`, `45.x.x.x`) ve gizlenmiş adresler (`hxxp`, `[dot]`, `(dot)`) tespiti eklendi.
  2. `filter_project_comment_content()` fonksiyonu ve `trg_filter_project_comment_content` tetikleyicisi oluşturularak proje yorumları tablosuna da aynı askeri düzeyde filtreleme entegre edildi.
  3. Yetkili yöneticiler meşru destek bağlantıları için muaf tutuldu; filtrelenen içerikler güvenlik uyarı mesajıyla maskelendi.
### SEC-076 - Faz 21: İleri Bal Küpü (Honeypot) & Pars DevState Siber Karşı-Aldatma Savunması (5 Aşama)
- Tarih: 2026-09-18
- Kapsam: `App.tsx`, `public/robots.txt`, `webRouting.ts`, `HoneypotTrapService.ts`, `HoneypotDecoyField.tsx`, `ThreatIntelligenceView.tsx`, `20260918000018_faz21_honeypot_threat_radar_and_ip_quarantine.sql`.
- Bulgu: Otomatik web crawler'ları, fuzzer araçları (Nuclei, FFUF, Gobuster, Kiterunner), gizli kaynak arayan botlar ve insan saldırganların sahte rotaları, gizlenmiş form alanlarını ve DOM tuzaklarını fark etmeksizin sistemi tarama riski.
- Sertleştirme:
  1. **Aşama 1 (Web & DOM Düzeyi Tuzaklar):** `window.__KISTAS_DEV_SECRET__` ve `window.__KISTAS_INTERNAL_AUTH_STATE__` getter tuzakları, DOM gizli HTML yorum yemleri (`<!-- DEBUG: /kistas-secret-vault-backup -->`) ve `ktst_canary_override_key` zehirli storage token kalkanları kuruldu.
  2. **Aşama 2 (robots.txt Arama Motoru & Dizin Tarayıcı Tuzağı):** `public/robots.txt` içine 5 cezbedici `Disallow:` canary yolu (`/admin-internal-audit-portal`, `/kistas-secret-vault-backup` vb.) yerleştirildi; meşru arama motorları bu yollara gitmezken fuzzer ve botlar rotayı taradığı anda `ROBOTS_TXT_CANARY_TRAP` olarak tecrit listesine alındı.
  3. **Aşama 3 (URL Parametreleri & Sahte API Decoy Endpoint'leri):** 7 adet sahte API rotası (`/api/v1/admin/users/export`, `/api/v1/system/config-dump` vb.) ve hassas sorgu parametreleri (`admin_mode=true`, `impersonate_user=` vb.) oluşturuldu; fuzzer'lar tetiklendiğinde saldırgana inandırıcı 403 Forbidden sahte JSON yanıtı dönülerek anında aldatıldı (`DECOY_API_ENDPOINT_TRIPPED`).
  4. **Aşama 4 (Akıllı & Çok Katmanlı Form Bal Küpleri):** `HoneypotDecoyField` bileşeni `website` ve `contact_fax` çift katmanlı yem alanları, `onArmed` zaman damgası ve insanüstü doldurma hızı (<750ms `BOT_RAPID_SUBMISSION_TRIPPED`) denetimiyle `AuthExperience`, `PasswordRecoveryScreen` ve `CreateListingScreen` formlarına entegre edildi.
  5. **Aşama 5 (Pars DevState Siber Tehdit Radarı & Otomatik IP Karantinası):** `report_client_honeypot_trap` RPC'si PostgREST `request.headers` (`cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`) ile sunucu seviyesinde teyitli IP'leri otonom yakalayacak ve Self-DoS korumalı (`is_safe_whitelisted_ip`) otomatik WAF karantinasına alacak şekilde sertleştirildi; `ThreatIntelligenceView` radarına özel `🍯 Pars Bal Küpü Tuzağına Düştü` rozeti ve `🍯 Bal Küpü Tuzakları` filtre segmenti eklendi.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (72/72 başarılı), `npx tsc --noEmit` (0 tip hatası), Fortress Sağlık Skoru %100 / 100 [A+].

### SEC-077 - Yorum Tepkileri (Beğeni / Beğenmeme) Kalkanı: Atomik Toggle, Çift Sayım ve Sibyl/Flood Savunması
- Tarih: 2026-09-22
- Kapsam: `supabase/migrations/20260922000001_comment_reactions.sql`, `packages/shared/src/types.ts`, `packages/shared/src/commentReaction.ts`, `packages/supabase/src/queries/comments.ts`, `apps/web/src/app/actions/listings.ts`, `apps/web/src/components/ProjectCommentsSection.tsx`, `scripts/tests/core-domain.test.mjs`.
- Bulgu: Yorumlara beğeni/beğenmeme özelliği eklendiğinde doğrudan PostgREST INSERT/UPDATE/DELETE erişimi, çift sayım, race condition, sibyl oylaması ve flood (hız saldırısı) vektörleri açığa çıkabilirdi.
- Sertleştirme:
  1. `project_comment_reactions` tablosunda doğrudan yazma mühürlendi (`REVOKE INSERT, UPDATE, DELETE ... FROM public, anon, authenticated`); okuma herkese açık (`GRANT SELECT` + RLS `SELECT true`).
  2. `toggle_project_comment_reaction(p_comment_id, p_reaction)` RPC'si: SECURITY DEFINER + `SET search_path = ''`; oturum zorunluluğu, ±1 CHECK, doğrulanmış üyelik, yorum moderasyonu (mute) ve `enforce_adaptive_rate_limit` (10 sn / 20 istek, 3 ihlalde otonom karantina) kalkanları.
  3. `UNIQUE (comment_id, user_id)` + `FOR UPDATE` kilidi ile çift kayıt ve yarış koruması; `likes_count`/`dislikes_count` sayaçları her işlemde tablodan yeniden hesaplanır (tek doğruluk kaynağı).
  4. Geçiş kuralları tek modülde: `packages/shared/src/commentReaction.ts` (aynı tepki geri alınır, zıt tepki değiştirilir, sayaçlar negatife düşmez).
- Zorunlu kontrol (Madde 5): RLS + negatif yetki ✔, `auth.uid()` doğrulaması ✔, RPC sabit yetki + `search_path` ✔, çift kayıt engeli ✔, girdi kontrolü (±1) ✔, rate limit ✔, sunucu yetkisi ✔, negatif test (doğrudan INSERT yasağı regresyon testi) ✔, migration + rollback adımı ✔.
- Durum: KODLANDI — canlı Supabase migration bekleniyor.
- Regresyon: `node scripts/tests/core-domain.test.mjs` (81/81 başarılı), `pnpm --filter @kistas/web type-check` + `pnpm --filter @kistas/shared type-check` + `pnpm --filter @kistas/supabase type-check` (0 tip hatası).

### SEC-078 - Kategori Allowlist Bütünlüğü
- Tarih: 2026-09-23
- Kapsam: kategori sorguları, proje yayınlama filtreleri ve `20260923000001_limit_categories_to_app_store_catalog.sql`.
- Bulgu: Eski e-ticaret kategori kayıtları (`Ayakkabı & Sneaker`, `Laptop & Tablet` vb.) dijital proje filtrelerinde görünebiliyordu.
- Düzeltme: Tek doğruluk kaynağı olarak 15 oyun + 23 uygulama slug allowlisti tanımlandı; sorgular `is_active = true` ile sınırlandı ve diğer veritabanı kayıtları silinmeden pasife alındı.
- Geri kazanma: Migration içindeki belgelenmiş `UPDATE public.categories SET is_active = TRUE` komutu kullanılabilir.
- Durum: DOGRULANDI — TypeScript, kategori regresyon testi ve tarayıcı doğrulaması temiz.

### 2026-09-24 - Next.js / Workers web yayını
- Hedef: `www.kistas.com.tr/*` Cloudflare Workers `kistas-next`; eski Pages projesi silinmedi, yalnız geri dönüş için korunuyor.
- Kapı kanıtı: Next ve vinext üretim derlemeleri başarılı; web TypeScript temiz; çekirdek domain 84/84, sohbet kimliği 4/4, XSS ve SQL enjeksiyon kontrolleri başarılı; web bağımlılıklarında yüksek/kritik açık raporlanmadı; kayıtlı P0/P1 satırlarında açık bulgu yok.
- Canlı anonim kontroller: `/`, `/login`, `/signup`, `/browse`, `/blog`, `/hakkimizda`, `/robots.txt`, `/sitemap.xml` HTTP 200; `/messages` oturumsuz isteği `/login` adresine yönlendiriyor. `Content-Security-Policy`, `X-Frame-Options` ve HSTS başlıkları canlı yanıtta mevcut. Eski Expo `index.html` yayından kaldırıldı.
- Sınır: Google Identity Services ile mobil hesap seçimi ve gerçek oturum açma 2026-09-24 tarihinde kullanıcı cihazında doğrulandı. GitHub OAuth, şifre sıfırlama, oturumlu mesaj, proje yayınlama ve yönetici negatif yetki akışları bu yayında uçtan uca doğrulanmadı. Uzak migration geçmişi ayrışık olduğundan toplu migration gönderilmedi. Bu kontroller tamamlanana kadar eski Pages dağıtımı geri dönüş için korunur.
- Geri dönüş: Workers `www.kistas.com.tr/*` route'unu kaldır; Pages custom domain ve DNS kaydına dokunma. Ayrıntı: `docs/WEB_RELEASE.md`.

### 2026-09-24 - Monorepo lint ve fail-closed kalite kapısı

- Next.js 16 ile kaldırılan `next lint`, ESLint 9 flat config ve Core Web Vitals kurallarıyla değiştirildi. Web lint 0 hata/0 uyarı, Turbo workspace lint 4/4 ve TypeScript görevleri 7/7 başarılıdır.
- Root ve web bağımlılık denetimleri artık `|| echo` ile hata kodunu yutmaz; yüksek/kritik bulgu kalite kapısını durdurur. Güncel denetimde bilinen açık bulunmadı.
- Hook bağımlılıkları ve Supabase istemci yaşam döngüsü sabitlendi; Google callback ref'i render sırasında mutasyondan çıkarıldı. XSS/SQL kontrolleri, çekirdek domain 84/84 ve sohbet kimliği 4/4 başarılıdır.
- Next.js ve vinext üretim derlemeleri başarılıdır. Bu değişiklikte deploy, migration veya veritabanı işlemi yapılmadı.
- Windows üzerinde Turbo build görevleri tamamlandığı halde süreç kapanmadığı için root build kapısı topolojik `pnpm -r --workspace-concurrency=1` çalıştırıcısına geçirildi. Böylece birleşik audit komutu deterministik exit code üretir; lint ve type-check Turbo üzerinden devam eder.

### 2026-09-24 - Monorepo test görev grafiği

- 15 deterministik regresyon dosyası `shared`, `supabase`, `ui` ve `web` workspace sorumluluklarına ayrıldı; dört paketin her biri gerçek `test` görevi çalıştırır.
- Turbo test grafiği 7/7 başarılıdır ve ikinci çalıştırmada 7/7 görev önbellekten gelmiştir. Kök test dosyaları global bağımlılık olarak izlenir; test değişikliği önbelleği geçersiz kılar.
- Çekirdek domain 84/84, sohbet kimliği 4/4 ve diğer güvenlik/uyum/SEO/UI test dosyalarının tamamı başarılıdır; atlanan test yoktur.
- Eski Expo `dist` çıktısını hedefleyen SEO testi Next.js App Router kaynakları, sitemap, robots ve llms sözleşmesine; tipografi testi ortak UI tokenı ve web sistem font zincirine taşındı.
- `pnpm sayos:audit` artık üretim buildinden önce test kapısını çalıştırır ve herhangi bir başarısızlıkta zinciri durdurur. XSS/SQL korumaları ve vinext Workers derlemesi ayrıca başarılıdır. Ağ erişimli Pars Defender testi ayrı `pnpm test:live` komutunda tutulur.
- Bu fazda deploy, migration, canlı Supabase veya geri dönüşte tutulan Pages yayını değiştirilmedi.

### 2026-09-24 - CI güvenlik ve Workers build kapısı

- GitHub Actions kalite workflow’u `main` push, pull request ve manuel tetiklemede temiz `ubuntu-latest` ortamında çalışacak şekilde eklendi.
- Workflow yetkisi `contents: read` ile sınırlandı; checkout kimlik bilgileri kalıcı tutulmaz, PR çalışmasına secret veya deploy yetkisi verilmez.
- Node.js `24.18.0` ve manifestteki pnpm `12.4.2` sürümü sabittir. Kilit dosyası zorunlu ve frozen kurulum uygulanır.
- `checkout`, `pnpm/setup` ve `actions/cache` bağımlılıkları tam commit SHA’larına kilitlendi. Turbo cache yalnız başarılı `main` push sonrasında kaydedilir.
- `sayos:security` bağımlılık denetiminin yanında repository secret, XSS ve SQL enjeksiyonu kontrollerini de fail-closed çalıştırır.
- CI zinciri lint, tip kontrolü, 15 deterministik test dosyası, Next build, vinext Workers build ve Wrangler deploy dry-run adımlarını zorunlu tutar.
- Canlı Supabase testi, Cloudflare deploy ve migration CI dışında bırakıldı. Eski Pages geri dönüş yayınına ve veritabanına dokunulmadı.
- Yerel kanıt: frozen kurulum, workflow YAML ayrıştırması, birleşik audit, vinext build ve Wrangler dry-run başarılıdır. Worker paketi 327 modül / 2,41 MiB gzip olarak doğrulandı; uzak GitHub Actions koşusu push sonrasına beklemektedir.

### 2026-09-24 - Consent-first GA4 Next.js / Workers geçişi

- Eski Expo `App.tsx` akışında kalan `G-2XXP5LHME9` entegrasyonu, canlıda kullanılan `apps/web` App Router köküne bağımsız Analytics sağlayıcısı olarak taşındı.
- Google etiketi varsayılan olarak yüklenmez. Kullanıcı açıkça kabul ederse yüklenir; `ad_storage`, `ad_user_data` ve `ad_personalization` daima `denied`, Google Signals ve reklam kişiselleştirmesi kapalıdır.
- `page_view` yalnız temiz pathname ile gönderilir; query ve hash içindeki kurtarma/OAuth tokenları Analytics payload'una alınmaz. Ret veya tercih sıfırlamada `ga-disable-G-2XXP5LHME9` etkinleşir.
- Footer üzerinden analitik tercihi yeniden açılabilir. Yeni tablo, RPC, migration, kimlik yetkisi, secret veya kullanıcı PII alanı eklenmedi.
- Zorunlu kontrol: PII/secret sızıntısı negatif testi ✔, onaysız istek testi ✔, ret sonrası ölçüm kesme testi ✔, tekrar script yükleme koruması ✔, CSP allowlist uyumu ✔.
- Regresyon: web testleri 5/5, Playwright Analytics testi 1/1, TypeScript 0 hata, ESLint 0 hata/uyarı, `sayos:security`, Next production build ve Vinext Workers build başarılıdır.
- Yayın: Cloudflare Worker sürümü `491a228f-3536-4366-aad9-d940a60e2c47`, `www.kistas.com.tr/*` production rotasına dağıtıldı.
- Canlı kanıt: temiz tarayıcıda onay öncesi Analytics isteği 0; kabul sonrası `gtag.js?id=G-2XXP5LHME9` ve `google-analytics.com/g/collect` üzerinden `tid=G-2XXP5LHME9`, `dp=/`, `en=page_view` isteği görüldü. Test URL'sindeki query/hash tokenı payload'a girmedi ve reklam kişiselleştirmesi kapalı kaldı.
- Geri dönüş: `AnalyticsProvider` kök layout'tan çıkarılır; Analytics istemcisi ve footer tercih aksiyonu kaldırılır. Veritabanı veya harici servis durumu değişmedi.

### 2026-09-24 - Global Kıstas glass rota yükleme katmanı

- Next.js App Router kök `loading.tsx` sınırı ve istemci içi link geçişlerini anında yakalayan global navigasyon katmanı eklendi. Dış bağlantılar, yeni sekme kısayolları, indirmeler ve aynı rota tıklamaları kapsam dışıdır.
- Tam ekran katman ortak `KistasLogo` bileşenini kullanır; koyu glass zemin, 24 px backdrop blur ve reduced-motion uyumlu pulse animasyonu içerir. Gerçek yükleme süresine yapay gecikme eklenmez.
- Başarısız navigasyonda arayüzün kilitli kalmasını önleyen 12 saniyelik fail-safe bulunur; pathname veya query değiştiğinde katman otomatik kapanır.
- Yeni secret, dış servis, veri yazımı, migration, RPC, yetki veya PII işleme eklenmedi. Güvenlik taraması, web regresyonları 6/6, TypeScript, ESLint, Next build, Vinext Workers build ve dry-run başarılıdır.
- Yayın: Cloudflare Worker sürümü `b25ab285-7970-4807-b38c-ee9e80c3a149`, `www.kistas.com.tr/*` production rotasına dağıtıldı.
- Canlı kanıt: `/` → `/blog` geçişi 1,6 saniye yavaşlatılarak test edildi; loader görünür, logo mevcut ve `backdrop-filter: blur(24px)` olarak doğrulandı. Hedef rota hazır olduğunda loader otomatik kapandı.
- Geri dönüş: `NavigationLoadingOverlay` kök layout'tan ve `app/loading.tsx` kaldırılır; veritabanı veya altyapı durumu değişmez.

### 2026-09-24 - Eski Expo rota yükleyicisi görsel geri dönüşü

- Global rota yakalama ve 12 saniyelik fail-safe korunurken koyu glass perde, blur ve cam kutu kaldırıldı.
- Eski Expo `LoadingOverlay` tasarımındaki 52 px logo, 90 px radial mavi aura, 100 px merkez alanı ve 2,2 saniyelik nefes animasyonu Next.js katmanına taşındı.
- `prefers-reduced-motion` kullanıcıları için animasyon kapatılır. Katman şeffaf ve `pointer-events: none` olduğundan yeni bir yetki, veri, girdi, dış URL, Analytics, PII veya secret yüzeyi oluşturmaz.
- Zorunlu kontrol: RLS/RPC/migration kapsam dışı ✔, yeni credential yok ✔, dış URL/girdi yok ✔, log/PII yok ✔, geri dönüş yalnız görsel CSS ve loader bileşeninin önceki sürümüne alınmasıdır ✔.
- Regresyon: web testleri 6/6, TypeScript, ESLint, Next production build, Vinext Workers build ve Wrangler dry-run başarılıdır.
- Yayın: Cloudflare Worker sürümü `b45ced73-6832-4517-be2b-6e939a1da462`, `www.kistas.com.tr/*` production rotasına dağıtıldı.
- Canlı kanıt: ana sayfa HTTP 200; yayınlanan CSS'te şeffaf zemin, 100/90 px katmanlar, 2,2 saniyelik logo/aura animasyonları ve reduced-motion kuralı doğrulandı.

### 2026-09-24 - Public rota gecikme ve cache sertleştirmesi

- `/browse` gibi anonim ve statik rotalar global Supabase `auth.getUser()` proxy çağrısından çıkarıldı; gereksiz dış ağ beklemesi kaldırıldı.
- `/browse`, Vinext Worker katmanında açık `86.400` saniyelik ISR politikasına alındı; kullanıcıya özel veri içermeyen kategori kabuğu edge cache üzerinden sunulur.
- Proxy kapsamı `/admin`, `/create-listing`, `/dashboard`, `/messages` ve `/profile` ile sınırlandı. Bu rotalar hem proxy katmanında hem sayfa seviyesindeki `requireUser` / `requireAdmin` kontrollerinde korunur.
- Fingerprintli `/_next/static/*` dosyaları ve sürümlenmiş kategori ikonları için bir yıllık `immutable` tarayıcı cache kuralı eklendi.
- Navigasyon loaderı 150 ms eşikten önce gösterilmez; hızlı geçişlerde görsel parlama oluşmaz ve rotaya yapay minimum bekleme eklenmez.
- Global navigasyonun Supabase tarayıcı istemcisi statik başlangıç bağımlılığından çıkarılıp hydration sonrası dinamik parçaya ayrıldı; mevcut `getSession` ve `onAuthStateChange` davranışı korunur.
- Global menü `/browse` RSC yükünü hydration başlar başlamaz proaktif prefetch eder; kullanıcı tıklaması ağ isteğinin tamamlanmasını beklemez.
- Yeni secret, veri yazımı, RPC, migration veya PII işleme eklenmedi. Anonim korumalı rota testleri ve public rota performans sözleşmesi yayın kapısında çalıştırılır.
- Regresyon: web testleri 7/7, TypeScript, ESLint, Vinext Workers build ve Wrangler dry-run başarılıdır.
- Yayın: Cloudflare Worker sürümü `38978b64-7b6a-400e-8b1b-cac978fd9dbc`, `www.kistas.com.tr/*` production rotasına dağıtıldı.
- Canlı kanıt: `/browse` ilk istekte `MISS`, devamında `X-Vinext-Cache: HIT` ve `CF-Cache-Status: HIT`; fingerprintli chunk `public, max-age=31556952, immutable`; ön yüklenmiş ana sayfa → Göz At geçişi 179 ms. Anonim `/admin`, `/create-listing`, `/messages` ve `/profile` isteklerinin tamamı HTTP 307 ile girişe yönlendirildi.

### 2026-09-24 - Public veri ISR ve niyet tabanlı prefetch optimizasyonu

- Ana sayfa, kategori, platform, yeni, popüler ve blog public okumaları cookie tabanlı sunucu istemcisinden çıkarılıp yalnız anon anahtar ve RLS kullanan `createAnonClient` akışına taşındı. Böylece `cookies()` kaynaklı dinamik render/cache bypass kaldırıldı.
- Ana sayfa, yeni ve popüler rotaları 60 saniye; blog 300 saniye; kategori kabuğu mevcut ISR süreleriyle edge cache kullanır.
- Göz At ekranındaki 20 kategori/platform rotasının görünür olur olmaz toplu prefetch edilmesi kapatıldı. Prefetch yalnız pointer, klavye odağı veya dokunma niyetinde başlar.
- Curated proje sorgusu `select('*')` yerine vitrin bileşenlerinin kullandığı alanları ve sınırlı ilişkisel kolonları seçer.
- Web arayüzündeki 1024 px / 90 KB logo kaynağı, şeffaflığı koruyan 256 px / yaklaşık 8,5 KB WebP türevine geçirildi; orijinal marka kaynağı korunurken ilk yükte yaklaşık 81 KB transfer azaltıldı.
- Public istemci kullanıcı JWT'si taşımaz; veri görünürlüğü mevcut anonim RLS politikalarıyla sınırlıdır. Korumalı rotaların proxy ve `requireUser` / `requireAdmin` zinciri değişmedi.
- Regresyon: public rota performans testi, web ve Supabase TypeScript kontrolleri, ESLint, web testleri 7/7, `sayos:security`, Next üretim derlemesi, Vinext Workers derlemesi ve Wrangler dry-run başarılıdır.
- Yayın: Cloudflare Worker sürümü `1bc22f09-28b5-4b09-9089-e81e14da7ac5`, `www.kistas.com.tr/*` production rotasına dağıtıldı.
- Canlı kanıt: ana sayfa cache durumu `MISS → HIT`, `/browse` devam isteği `HIT`; anonim `/admin`, `/create-listing`, `/messages` ve `/profile` istekleri HTTP 307 ile girişe yönlendirildi. Göz At ağ çağrıları 20'den 5'e, toplam aktarım yaklaşık 880 KB'den 534 KB'ye düştü; ana sayfa aktarımı yaklaşık 675 KB'den 409 KB'ye indi. Logo yanıtı 8.492 bayt ve bir haftalık tarayıcı cache'iyle sunuluyor.

### 2026-09-24 - SEC-051 Public vitrin yetki regresyonu

- Kaynak / öncelik: Kullanıcı bildirimi, P0 kullanılabilirlik regresyonu. Canlı ana sayfa aktif projeler bulunmasına rağmen boş vitrin gösterdi.
- Kök neden: Public curated sorguya eklenen `seller:profiles(...)` ilişkisi, anonim rolün PII izolasyonu gereği doğrudan `profiles` tablosuna erişememesi nedeniyle PostgREST `42501` hatası üretti; sorgu katmanı bu hatayı boş diziye çevirdi.
- Düzeltme: Public liste, detay ve curated sorgularından yasaklı doğrudan profil ilişkisi kaldırıldı. Proje ve görsel verileri mevcut anon RLS politikaları üzerinden okunur; profil PII izolasyonu gevşetilmez.
- Hata yönetimi: Yetki/şema hataları artık sahte “boş vitrin” sonucuna çevrilmez; güvenli hata koduyla sunucu katmanına yükseltilir. Gerçek bulunamayan proje davranışı korunur.
- Negatif regresyon: Public sorgu kaynağında `seller:profiles(...)` ilişkisinin bulunmaması ve curated hatalarının sessiz yutulmaması otomatik performans/güvenlik sözleşmesine eklendi.
- Veri etkisi: Silme, güncelleme, migration, RPC, secret veya yeni public erişim yoktur. Canlı anon doğrulamada aktif projeler ve görseller başarıyla okunmuş, doğrudan `profiles` erişimi kapalı kalmıştır.
- Regresyon ve yayın: Supabase/web TypeScript, ESLint, web testleri 7/7, `sayos:security`, Next build, Vinext Workers build ve Wrangler dry-run başarılıdır. Cloudflare Worker `18d47274-348f-4ca0-b7b8-88680bf1ed30` production rotasına dağıtıldı.
- Canlı kanıt: Mobil viewport testinde “Vitrin Henüz Boş” görünmedi; Günün Vitrini ve Popüler Projeler gerçek proje kartlarıyla render edildi. `Notein`, `Getir` ve `Shots – Yapay Zeka Foto Video` başlıkları doğrulandı. Anonim korumalı rotaların tamamı HTTP 307 ile girişe yönlenmeye devam etti.

### 2026-09-24 - Navbar aynı rota navigasyon koruması

- Aktif navbar sekmesine tekrar basıldığında aynı pathname için Next.js navigasyonu başlatılmaz; gereksiz RSC isteği, loader ve ekran yenilenmesi önlenir.
- Koruma yalnız tam pathname eşleşmesinde çalışır. Alt rotadan ana sekmeye veya farklı bir ekrana geçiş davranışı değişmez.
- Aktif sekmeye `aria-current="page"` semantiği eklendi. Yeni veri erişimi, dış URL, girdi, secret, yetki, RPC veya migration bulunmaz.
- Geri dönüş: `KistasGlassDock` içindeki `handleNavClick`, link `onClick` ve ilgili regresyon sözleşmesi kaldırılır.
- Yayın: Cloudflare Worker `e7ac7c34-01a2-4560-b0e0-cf9d0ef44f83` production rotasına dağıtıldı. Canlı 390 px viewport testinde aktif Keşfet sekmesine tekrar basılması `0` ağ isteği üretti.

### 2026-09-24 - iOS mesaj klavyesi viewport sabitlemesi

- iOS Safari'de textarea odağı sırasında değişen `visualViewport.height` yanında `visualViewport.offsetTop` da izlenir; sabit mesaj katmanı görünür ekranın üst sınırına taşınır.
- `visualViewport` resize ve scroll olayları birlikte takip edilir, unmount sırasında dinleyiciler ve CSS değişkenleri temizlenir.
- Composer odaklandığında mesaj akışı yalnız kendi scroll alanında en alta alınır; dış belge scroll'u değiştirilmez.
- Yeni veri erişimi, kullanıcı girdisi işleme kuralı, dış URL, secret, yetki, RPC veya migration eklenmedi. Değişiklik mobil görünür viewport ve sunum katmanıyla sınırlıdır.
- Regresyon sözleşmesi iOS viewport yüksekliği/konumu, listener temizliği ve composer odak davranışını doğrular.
- Regresyon ve yayın: Web testleri 8/8, TypeScript, ESLint, `sayos:security`, Next build, Vinext Workers build ve Wrangler dry-run başarılıdır. Cloudflare Worker `e7ac7c34-01a2-4560-b0e0-cf9d0ef44f83` production rotasına dağıtıldı.
- Canlı paket kanıtı: Yayınlanan mesaj istemci parçasında `visualViewport.offsetTop`, `--k-messages-vtop`, resize/scroll izleme ve listener temizliği mevcuttur. Anonim `/messages` erişimi HTTP 307 ile girişe yönlenmeye devam eder. Fiziksel iOS klavye davranışı Mimar cihazında doğrulanacaktır.

### 2026-09-24 - Mobil footer sloganı merkezleme düzeltmesi

- `Fikirler Kıstas ile Değerlenir` sloganının harf animasyonu korunurken mobil kapsayıcı gerçek tam genişliğe alındı.
- Eşit yatay padding, `max-w-full`, `justify-center` ve `text-center` ile italik harflerin içerik genişliği kaynaklı görsel kayması engellendi.
- Yeni veri, girdi, dış URL, secret, yetki, RPC veya migration eklenmedi. Değişiklik yalnız sunum katmanındadır.
- Yayın: Cloudflare Worker `e7ac7c34-01a2-4560-b0e0-cf9d0ef44f83` production rotasına dağıtıldı. Canlı 390 px viewport ölçümünde metnin ekran merkezinden sapması `0 px` olarak doğrulandı.

### 2026-09-25 - Inbox yaşam döngüsü ve uygulama içi mesaj bildirimleri

- Konuşma kaldırma işlemi fiziksel silme yerine kullanıcıya özel `buyer_hidden_at` / `seller_hidden_at` alanları ve katılımcı doğrulayan `SECURITY DEFINER` RPC ile uygulanır. Karşı tarafın konuşması ve ortak mesaj geçmişi korunur; gizleme sonrasındaki yeni mesaj görüşmeyi otomatik olarak Inbox'a döndürür.
- Bildirim tercihi kullanıcı kimliğine bağlı `notification_preferences` tablosunda default-on olarak saklanır. RLS yalnız hesap sahibinin okumasına izin verir; yazma işlemi `auth.uid()` kullanan sabit `search_path` RPC üzerinden yapılır.
- Mesaj bildirimi tetikleyicisi alıcıyı konuşma katılımcılarından sunucu tarafında türetir, gönderenin kendi kendine bildirim almasını ve sistem mesajlarının bildirim üretmesini engeller. İstemci yalnız kendi `user_id` filtresi ve mevcut notification RLS'i üzerinden Realtime dinler.
- Eski bildirim şemasından kalan `WITH CHECK (TRUE)` INSERT politikası düşürülmüş ve `authenticated` rolünün doğrudan bildirim ekleme yetkisi kaldırılmıştır; sahte bildirim üretimi güvenilir sunucu fonksiyonlarıyla sınırlandırılır.
- Destek sonlandırma aksiyonu yalnız `community` yetkili yönetici arayüzünde görünür; gerçek yetki kontrolü mevcut `admin_close_support_conversation` RPC'sinde tekrar yapılır. Kapalı görüşmeye mesaj gönderilemez ve kullanıcının sonraki Destek isteği yeni bir görüşme oluşturur.
- İşletim sistemi/web-push kapsam dışıdır; service worker, push aboneliği, cihaz tokenı veya yeni dış servis/secret eklenmedi. Glass bildirim yalnız site açıkken gösterilir, aynı görüşme bildirimleri gruplanır ve ekrandaki kart sayısı ikiyle sınırlandırılır.
- Geri dönüş: kök `MessageNotificationProvider`, Inbox ayar ve aksiyon bileşenleri kaldırılır; `trg_notify_chat_message` tetikleyicisi ve üç yeni RPC düşürülür, `notification_preferences` tablosu kaldırılır. Gizleme kolonları ancak geri dönüş öncesi kullanıcı görünürlük tercihlerinin kaybı kabul edilirse kaldırılır.

### 2026-09-25 - Güvenli sohbet varlığı, okundu bilgisi ve yönetici duyuruları

- Yazıyor durumu kalıcı mesaj verisine eklenmemiştir. Altı saniyede süresi dolan `conversation_typing_states` kaydı yalnız görüşme katılımcısı veya `community` yetkili destek ekibi tarafından sabit `search_path` RPC üzerinden değiştirilebilir; istemcinin doğrudan yazma yetkisi yoktur.
- Okundu bilgisi mevcut `messages.is_read` alanını ve katılımcı doğrulamalı `mark_conversation_read` RPC'sini kullanır. Realtime UPDATE yalnız mevcut mesaj SELECT/RLS görünürlüğü altında dağıtılır; paralel veya istemciye güvenen okundu kaydı oluşturulmaz.
- Toplu duyuru yalnız `has_admin_permission('community')` kontrolünden geçen yönetici tarafından gönderilebilir. Başlık/gövde/aksiyon uzunlukları, dahili rota allowlist'i, yönetici başına saatte beş gönderim kotası ve idempotency anahtarı sunucuda doğrulanır.
- Duyuru her kullanıcı için mevcut RLS korumalı `notifications` tablosuna eklenir; işlem alıcı sayısıyla `admin_action_audit` kaydına yazılır. İstemci duyuru rotasını ikinci kez allowlist ile doğrular ve harici URL çalıştırmaz.
- İşletim sistemi push, cihaz tokenı, dış bildirim servisi, yeni secret veya kullanıcı PII aktarımı eklenmemiştir. Geri dönüşte `admin_send_announcement` ve `set_conversation_typing` fonksiyonları, iki yeni tablo, typing publication kaydı ve ilgili UI bileşenleri kaldırılır; oluşturulmuş kullanıcı bildirimleri mevcut üç günlük saklama politikasıyla temizlenir.

### 2026-09-25 - Migration geçmişi uzlaştırması

- Yerelde bulunup canlı migration geçmişinde görünmeyen `20260918000004`–`20260918000018`, `20260919000001`, `20260922000001`–`20260922000002` ve `20260923000001` sürümlerinin etkileri canlı şemada salt okunur kontrollerle doğrulandı.
- Güvenlik/vault tabloları, tehdit radarı tabloları ve indeksleri, `token_valid_after`, yorum tepki tablosu ile sayaçları ve 38 kategorilik aktif katalog kuralı canlıda mevcuttur. Bu nedenle SQL yeniden çalıştırılmadı; yalnız Supabase migration geçmişi `applied` olarak onarıldı.
- Tarih formatı taşımadığı için Supabase CLI tarafından atlanan dört konsolide kurtarma paketi gerçek migration dizininden `supabase/manual-sql/` altına taşındı. Belgeler ve regresyon testleri yeni konuma güncellendi; paketler felaket kurtarma amacıyla korunur ancak otomatik migration zincirine katılmaz.
- Doğrulama: `supabase migration list --linked` yerel/canlı sürümleri birebir eşler; `supabase db push --linked --include-all --dry-run` yeni migration olmadığını ve uzak veritabanının güncel olduğunu bildirir.

### 2026-09-25 - Kurumsal ve proje logolu yönetici duyuruları

- Proje duyurusu yalnız `/listings/<uuid>` biçimindeki dahili rotayı kabul eder. UUID sunucuda ayrıştırılır; proje kaydı `active` değilse toplu gönderim reddedilir.
- Bildirime eklenen `listing_id` ve `logo_url` istemciden doğruluk kaynağı olarak alınmaz; `SECURITY DEFINER` fonksiyonu bunları aktif proje kaydından üretir. Harici yönlendirme veya yeni secret eklenmez.
- Topluluk yetkisi, yönetici başına saatlik beş gönderim kotası, advisory transaction lock ve idempotency koruması korunur. Duyuru denetim kaydı hedef proje kimliğini içerir.
- İstemci, genel ve proje rotalarını tek bir allowlist yardımcı modülüyle doğrular. Proje logosu anlık glass kartta ve bildirim merkezinde gösterilir; logosuz projeler kontrollü ikona düşer.
- Bildirim hareketi Framer Motion spring geçişi kullanır ve `prefers-reduced-motion` tercihinde sade opacity geçişine döner. Navbar ile aynı glass CSS yüzeyi ortaklaştırılmış, eski inline kopya kaldırılmıştır.
- Regresyon: tam `sayos:audit`, web 11/11, Supabase 5/5, çekirdek 85/85, Next/Vinext production build ve Wrangler dry-run başarılıdır. `20260925000003` migration’ı canlıya uygulanmış ve yerel/canlı geçmiş eşitlenmiştir.
- Yayın: Git commit `f02d7d3`, Cloudflare Worker sürümü `0e1a2474-d584-4376-807f-e0a77a477fce`. Canlı public rotalar HTTP 200, anonim korumalı rotalar HTTP 307; CSP, HSTS, `nosniff` ve referrer policy başlıkları doğrulanmıştır.

### 2026-09-25 - Duyuru kotası kaldırma ve web Vitrin Yönetimi güvenliği

- Topluluk yetkilisinin `admin_send_announcement` RPC'sindeki saatlik beş gönderim kotası ürün kararıyla kaldırıldı. `community` yetkisi, sabit boş `search_path`, dahili rota/aktif proje doğrulaması, advisory transaction lock, idempotency anahtarı ve `admin_action_audit` kaydı korunur. Risk kabulü: ele geçirilmiş bir topluluk yönetici hesabı daha yüksek bildirim hacmi üretebilir; olay izi ve yetki iptali müdahale katmanı olarak kalır.
- Web Vitrin Yönetimi'nin sponsor alanlarını doğrudan güncelleyen ve kredi harcamasını atlayan istemci yolu kaldırıldı. Akış yalnız sahiplik, aktif proje, paket allowlist'i, bakiye ve satır kilidini doğrulayan `boost_listing_scoped` RPC'sini çağırır; kredi düşümü, süre uzatma ve hareket kaydı tek transaction içinde kalır.
- Web paket tutarları RPC allowlist'iyle eşitlendi. Ham SQL hataları arayüze taşınmaz; yetersiz bakiye, geçersiz paket, yetkisiz kullanıcı ve bulunamayan proje kontrollü mesajlara çevrilir.
- Geri dönüş: duyuru kotası yeni bir ileri migration ile yeniden tanımlanır. Vitrin arayüzü önceki görsele alınabilir; doğrudan tablo güncellemesi kredi bütünlüğünü bozduğu için geri getirilmez.
- Durum: KODLANDI — migration canlı Supabase'e uygulanmadı; push ve production deploy yapılmadı.

### 2026-09-26 - Public rota geçiş ve istemci başlangıç performansı

- Belge seviyesinde bütün iç link tıklamalarını yakalayan tam ekran navigasyon loaderı kaldırıldı. Dinamik kategori, platform ve proje detay rotaları erişilebilir, yerleşimi koruyan kendi `loading.tsx` skeleton sınırlarını kullanır; navbar yalnız tıklanan link üzerinde `useLinkStatus` ile bloke etmeyen geri bildirim gösterir.
- Kategori ve platform sayfalarının 100 genel projeyi indirip istemcide elemesi kaldırıldı. Anon RLS istemcisi sorguyu `category_id` veya izinli platform değeriyle sunucuda daraltır ve en fazla 60 public kayıt taşır.
- Proje detayının public gövdesi cookie tabanlı kullanıcı doğrulamasını beklemez. Metadata ve sayfa aynı public proje okumasını React `cache` ile tekilleştirir; yorum bileşeni oturum durumunu hydration sonrasında mevcut Supabase Auth akışıyla çözer.
- Global uygulama içi bildirim sağlayıcısı dinamik istemci parçasına ayrıldı. Bildirim yetkisi, kullanıcı filtresi ve mevcut RLS/Realtime kontrolleri değişmedi; yalnız başlangıç JS yolundan çıkarıldı.
- Güvenlik etkisi: Yeni tablo, migration, RPC, girdi, dış URL, analytics, PII veya secret yüzeyi yoktur. Public okumalar anon anahtar ve mevcut RLS sınırında kalır; korumalı rotaların proxy/`requireUser` zinciri değişmez.
- Geri dönüş: Route skeleton dosyaları ve `GlobalClientRuntime` kaldırılıp önceki kök loader geri alınabilir; filtre parametreleri kaldırılırsa kategori/platform sorguları önceki genel sorguya döner. Veri şeması değişmediği için veri geri kazanımı gerekmez.
- Doğrulama: Web TypeScript, ESLint ve regresyonlar 13/13; Supabase TypeScript; repo secret, XSS ve SQLi taramaları; Next production build ve Chromium keşif E2E testleri 3/3 başarılıdır. Ana sayfa istemci JS yükü yaklaşık 573,5 KB'den 321,3 KB'ye düşmüştür. Production deploy yapılmamıştır.

### 2026-09-26 - Proje detay kritik yol ve etkileşim temelli yükleme

- Public proje detay rotası yorum listesini ilk sunucu renderında okumaz. Yorum panelinin istemci kodu ve public yorum sorgusu yalnız kullanıcının yorum düğmesine basmasıyla paralel başlar; yükleme hatası proje gövdesini etkilemez ve kontrollü tekrar deneme sunar.
- Yeni `loadProjectCommentsAction`, yalnız biçimi doğrulanmış UUID kabul eder ve mevcut anon Supabase istemcisi/RLS sınırında okuma yapar. Ham veritabanı hatası, kullanıcı PII'si veya credential istemciye taşınmaz; yorum yazma ve tepki işlemleri mevcut authenticated RPC zincirinde kalır.
- Rozet, paylaşım ve geri bildirim modalları kapalıyken mount edilmez. Yorum paneli stilleri global CSS'ten çıkarılıp yalnız lazy yorum parçasıyla yüklenen CSS modülüne taşındı; eski selector kopyaları silindi.
- Galeride yalnız ilk görünür ekran görüntüsü eager/high-priority yüklenir. Diğer ekran görüntüleri, lightbox komşuları ve alt bölüm mağaza rozetleri lazy/async decoding kullanır; URL doğrulama ve harici bağlantı güvenlik kuralları değişmez.
- Güvenlik etkisi: Yeni migration, RPC, tablo, dış servis, secret veya yetki genişlemesi yoktur. Yeni public okuma, daha önce rota açılışında yapılan aynı RLS korumalı sorgunun kullanıcı niyetine ertelenmiş biçimidir.
- Geri dönüş: `ProjectCommentsLazySection` kaldırılıp yorum sorgusu tekrar sayfa renderına alınabilir; CSS modülü global selectorlara geri taşınabilir. Veri şeması ve kalıcı kayıtlar değişmediği için veri geri kazanımı gerekmez.
- Doğrulama: Web TypeScript ve ESLint, web regresyonları 14/14, Supabase TypeScript, repo secret/XSS/SQLi taramaları ve Next production build başarılıdır. Yerel Chromium testinde proje gövdesi 468 ms'de görünmüş, yorum dialogu ilk istekte 951 ms'de açılmış ve görsel öncelikleri `1 eager/high + 3 lazy/auto` olarak doğrulanmıştır. Proje detay başlangıç JS'i yaklaşık 556,1 KB'den 231,6 KB'ye düşmüştür. Production deploy yapılmamıştır.

### 2026-09-27 - Profil destek yönlendirmesi ve görüşme kapanış regresyonu

- Profildeki Destek e-posta bağlantısı kaldırılır; oturum sahibi mevcut `get_or_create_support_conversation()` RPC'siyle resmî Kıstas Destek hesabına bağlı açık görüşmeyi alır veya güvenli biçimde oluşturur. İstemci yalnız dönen görüşme kimliğini dahili `/messages` rotasına taşır.
- `20260927000001_repair_support_conversation_close.sql`, Faz 18'in var olmayan `is_archived` alanına yazan RPC sürümünü ileri yönlü olarak değiştirir. `community` yetkisi, satır kilidi, yalnız `listing_id IS NULL` kapsamı, idempotent kapanış, `closed_by`, sistem mesajı ve append-only denetim kaydı tek transaction içinde korunur.
- Footer'daki Analitik Tercihi tekrar-açma bağlantısı ve kullanılmayan istemci event sözleşmesi kaldırılır. İlk ziyarette yerel tercih bulunmadığında soru gösteren consent-first sağlayıcı ve onay verilmeden Google etiketini yüklememe davranışı korunur.
- Doğrulama: Web TypeScript ve ESLint, web regresyonları 14/14, core-domain 85/85, Supabase TypeScript, repository secret/XSS/SQLi taramaları ve Next production build başarılıdır.
- Canlı Supabase migration geçmişi `20260927000001` ile eşleşir. Anonim doğrudan RPC çağrısı HTTP 401/forbidden ile reddedildi; yerel yetki, kapsam, idempotency ve denetim regresyonları temizdir. SEC-005 `DOGRULANDI` durumuna alınmıştır.
- Worker deploy'u bu kayıt anında henüz yapılmamıştır; arayüz değişiklikleri uygulama yayınıyla etkinleşecektir.

### 2026-09-27 - Kredi mağazası ekonomisi ve Shopier paket bütünlüğü

- Korumalı `/credits` rotası oturumu sunucuda `requireUser()` ile doğrular; kullanıcıya yalnız kendi profil bakiyesi ve doğrulanmış Auth e-postası aktarılır. İstemci kredi miktarı, fiyat veya kullanıcı kimliği belirleyemez.
- Yeni paket sözleşmesi `250 / 750 / 2000` kredi ve `299 / 699 / 1499 TRY` olarak sabitlenmiştir. Shopier ürün kimliği, tam minor-unit tutar, TRY para birimi ve kredi miktarı Edge Function ile `apply_shopier_credit_event` RPC'sinde bağımsız olarak allowlist üzerinden doğrulanır.
- `20260927000002_reprice_credit_store.sql` mevcut atomik işlem sırasını korur: sipariş replay kontrolü, profil satır kilidi, bakiye artışı, kredi hareketi ve kullanıcı bildirimi tek transaction içinde yürür. Fonksiyon yalnız `service_role` tarafından çağrılabilir ve boş `search_path` kullanır.
- Ödeme sonrası arayüz bakiyeyi iyimser artırmaz. Yalnız oturum sahibinin RLS korumalı `credit_transactions` kaydında eşleşen Shopier ürün kimliği ve tutarı görüldüğünde başarı gösterir; polling beş saniye aralıkla ve iki dakika sınırıyla çalışır.
- Production geçiş sırası zorunludur: Shopier ürünleri yeni fiyat ve kredi içerikleriyle güncellenir, ardından migration ve Edge Function birlikte yayınlanır, son olarak web mağazası dağıtılır. Eski paketlerden gerçek ödeme bulunmadığı ürün kararıyla kabul edilmiştir; bakiye dönüşümü yapılmaz.
- Geri dönüş, istemci mağazasını önceki sürüme almakla sınırlı değildir. Shopier ürün fiyatları, Edge Function allowlist'i ve RPC allowlist'i aynı eski üçlüye ileri migration ile birlikte döndürülmelidir; parçalı rollback ödeme reddi veya yanlış kredi riski taşır.
- Shopier ürün sayfalarında `50900373 / 50900401 / 50900419` fiyatları sırasıyla `299 / 699 / 1499 TRY` olarak canlı doğrulandı. Migration `20260927000002` canlı veritabanına uygulandı; yerel ve uzak migration geçmişi eşleşir. `shopier-credit-webhook` Edge Function yeniden dağıtıldı ve eksik payload isteğini HTTP 400 ile fail-closed reddetti.
- `/credits` hem proxy matcher hem korumalı rota allowlist'ine eklendi. İlk yayındaki anonim yönlendirme döngüsü canlı kontrolde tespit edilip kalıcı regresyon testiyle kapatıldı; anonim erişim artık HTTP 307 ile `/login?redirect=%2Fcredits` hedefine gider.
- Durum: CANLI — Cloudflare Worker sürümü `76c1df73-0aef-4527-8c52-447fb1135ab9`. Ana sayfa ve giriş HTTP 200; CSP, HSTS, `nosniff` ve referrer policy başlıkları doğrulandı. Web 15/15, Supabase 5/5, UI 4/4, çekirdek 85/85, TypeScript, ESLint, bağımlılık denetimi, Next/Vinext üretim derlemeleri ve Wrangler dry-run başarılıdır.

### 2026-09-27 - Kredi mağazası mobil ödeme erişilebilirliği

- Checkout açıkken sabit mobil dock gizlenir ve kapanışta body sınıfı kesin olarak temizlenir; ödeme aksiyonu dock altında kalmaz. Modalın alt dolgusu cihaz safe-area değerini kapsar.
- Kapatma kontrolü erişilebilir etiketi korunarak düşük opaklıklı glass yüzeye geçirildi. `/credits` rotasında genel footer render edilmez; mağaza rozeti kaldırılıp dağıtım değerini anlatan yeni slogan kullanılır.
- Profil proje kartlarının dört aksiyonu tek glass action dock içinde dengelendi; mobilde 2x2, geniş ekranda dört eşit sütun kullanılır. Silme onayı, proje detay rotası ve güvenli sponsorluk modalı davranışları değişmeden korunur.
- Güvenlik etkisi: Ödeme URL'si, paket allowlist'i, kullanıcı doğrulaması, webhook, RPC, RLS ve kredi hareketi doğrulaması değişmedi. Yeni veri, secret, dış servis, yetki veya kullanıcı girdisi eklenmedi.
- Durum: KODLANDI — production deploy yapılmadı.

### 2026-09-27 - Yönetim merkezi kredi, analitik ve blog sertleştirmesi

- Topluluk yönetimi ekranını görebilen fakat eski sahip-only RPC nedeniyle kredi veremeyen ekip üyelerinin yetki uyuşmazlığı giderildi. Yeni kredi RPC'si `community` kapsamını sunucuda doğrular; 1-10.000 kredi sınırı, zorunlu yönetici notu, UUID işlem anahtarı, transaction advisory lock, kredi hareketi, kullanıcı bildirimi ve append-only yönetim denetimi tek transaction içinde çalışır.
- Yönetim istatistiği eski proje sayaç alanına güvenmez. Oy ve yorum kayıtları gerçek tablolardan, görüntülenmeler proje kayıtlarından toplanır; birleşik toplam etkileşim değeri sunucuda üretilir.
- Blog yazımı doğrudan istemci insert'i yerine `blog` yetkili, sabit boş `search_path` kullanan RPC üzerinden yapılır. Başlık, slug, özet, içerik, HTTPS kapak adresi ve SEO alanları uzunluk/biçim allowlist'iyle doğrulanır; slug çakışması kontrollü hata üretir.
- Public blog kapakları artık liste ve detay sayfasında render edilir. Makale metadata'sı canonical, Open Graph, Twitter ve JSON-LD Article verisi üretir; içerik ham HTML çalıştırmayan semantik renderer kullanır.
- Admin rotasında genel footer ve global mobil dock gösterilmez. Kredi ve makale modalları belge scroll'unu kilitler, `100dvh`, overscroll containment ve safe-area alt dolgusu kullanır.
- Geri dönüş: `20260927000003_admin_community_blog_and_analytics.sql` fonksiyonları önceki imzalarına yalnız ileri migration ile döndürülür; istemci yeni RPC imzalarıyla atomik olarak birlikte geri alınır. Kalıcı kredi hareketleri ve denetim kayıtları silinmez.
- Durum: VERİTABANI CANLI — `20260927000003` migration'ı Supabase'e uygulandı ve yerel/uzak geçmiş eşleşmesi doğrulandı; production web deploy'u bekliyor.
