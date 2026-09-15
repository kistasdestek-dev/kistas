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
| SEC-013 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-014 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-015 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-016 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-017 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-018 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-019 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-020 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-021 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-022 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-023 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-024 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-025 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-026 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-027 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-028 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-029 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-030 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-031 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-032 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-033 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-034 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-035 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-036 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-037 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-038 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-039 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-040 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-041 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-042 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-043 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-044 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-045 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-046 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-047 | Bekleniyor | - | - | BEKLIYOR | - | - |
| SEC-048 | Bekleniyor | - | - | BEKLIYOR | - | - |
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

### 2026-09-14 - Haftalik Gunün Vitrini

- Faz: 3 - RPC ve is kurallari.
- Degisen kod/migration: `20260914000001_showcase_leaders_expansion.sql`, haftalik lider servisi ve vitrin arayuzu.
- Pozitif test: Her kategoriden en az 1 dogrulanmis destek alan lider; haftalik destek ve sabit esitlik sirasi; tekrar kazananlara izin.
- Negatif test: Proje sahibinin destegi, dogrulanmamis kullanici, sponsorlu ve aktif olmayan proje dislanir; secici RPC anon/authenticated rollerine kapali kalir.
- Dogrulama: TypeScript 0 hata, core-domain 29/29, SQL injection ve XSS korumalari basarili; migration yerel/uzak eslesti.
- Kalan risk: `KST-KNOWN-001` kullanici aksiyonu nedeniyle production yayin ve public test tuneli kapali tutulur.
- Sponsor uzlastirma: Global veya kategori sponsorluğu biten proje saatlik görevle sabit haftalik doğrulanmis destek puanina göre yeniden değerlendirilir; aktif sponsorlar public getter tarafinda da organik vitrinden dislanir.
- Canli vitrin sayaci: Liderlik sonucu sabit kalirken vitrin baslangicindan sonra gelen, e-postasi dogrulanmis ve proje sahibine ait olmayan destekler aggregate RPC sonucuna eklenir; kullanici kimligi veya oy detayi public cevaba acilmaz.

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
