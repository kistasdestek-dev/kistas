# KISTAS Monorepo Mimarisi Sertleştirme Planı

## Hedef

Next.js 16, Cloudflare Workers ve Supabase tabanlı KISTAS web uygulamasını; güvenli yayın kapıları, açık paket sınırları, tekrar üretilebilir testler ve SEO uyumlu sunucu render mimarisiyle ölçeklenebilir bir monorepo standardına taşımak.

## İlkeler

- Canlı davranış her fazda korunur.
- İlgisiz çalışma ağacı değişiklikleri değiştirilmez veya temizlenmez.
- Gizli anahtarlar kaynak kod, istemci paketi, log veya paylaşılan yedeklere girmez.
- Her faz kendi doğrulama kanıtı ve geri dönüş adımıyla kapanır.
- Yeni özellikler dağıtım motoru, indekslenebilirlik ve paylaşılabilir içerik üretimi açısından değerlendirilir.

## Fazlar

1. **Monorepo temel sabitleme** — kaynak ve üretilmiş dosya sınırları, secret taraması, workspace/build doğrulaması.
2. **Lint ve kalite kapısı** — Next.js 16 uyumlu lint, başarısızlıkları yutmayan komutlar.
3. **Test görev grafiği** — domain, güvenlik ve sohbet testlerini Turbo workspace görevlerine bağlama.
4. **CI güvenlik ve build kapısı** — temiz kurulum, tip, lint, test, audit ve üretim build kontrolleri.
5. **Paket sınırları** — `shared`, `supabase` ve `ui` paketlerinde açık API/exports ve bağımlılık yönü.
6. **Tasarım sistemi tekilleştirme** — ortak bileşen ve tokenların tek doğruluk kaynağına taşınması.
7. **Büyük bileşenlerin ayrıştırılması** — davranışı değiştirmeden domain hook, form ve görünüm sınırları.
8. **Üretim E2E ve SEO kapanışı** — kritik oturumlu akışlar, metadata, yapılandırılmış veri ve indekslenebilirlik kanıtları.

## Faz 1 Çıkış Kriterleri

- Next.js/Turbo/Workers çıktı ve cache klasörleri Git aday listesinden çıkarılmıştır.
- `.env` ve yüksek güvenli secret kalıpları kaynak adaylarında temizdir.
- Workspace çözümlemesi ve TypeScript kontrolü başarılıdır.
- Next.js ve vinext üretim derlemeleri başarılıdır.
- XSS, SQL enjeksiyonu, çekirdek domain ve sohbet kimliği testleri başarılıdır.
- Yüksek/kritik bağımlılık açığı bulunmaz.
- Commit ve deploy ayrıca onaylanmadan çalıştırılmaz.

## Faz 1 Doğrulama Kaydı — 2026-09-24

- Git aday kayıtları framework cache kurallarıyla 5.513'ten 402'ye indirildi; dosya silinmedi.
- Workspace çözümlemesi: `@kistas/web`, `@kistas/shared`, `@kistas/supabase`, `@kistas/ui` başarılı.
- TypeScript/Turbo: 7/7 görev başarılı.
- Güvenlik: XSS ve SQL enjeksiyonu kontrolleri başarılı; aday kaynaklarda gerçek secret bulunmadı.
- Regresyon: çekirdek domain 84/84, sohbet kimliği 4/4 başarılı.
- Bağımlılık denetimi: bilinen açık bulunmadı.
- Üretim: Next.js ve vinext derlemeleri ile Workers dry-run başarılı; deploy yapılmadı.
- Takip notu: Edge Runtime deprecation, 500 KB üzeri istemci chunk'ları ve Cloudflare görsel optimizasyonu eksikliği sonraki performans/SEO fazlarına kaydedildi.
- Depo temizliği: Kullanılmayan 128 ham PNG/JPG kategori varlığı (88,23 MB) kaldırıldı. Çalışma zamanında kullanılan 38 WebP varlığının tamamı doğrulandı; eksik referans yok. Yeni monorepo aday kapsamı 208 dosya ve yaklaşık 8,31 MB'a indirildi.

## Geri Dönüş

Faz 1 yalnız depo hijyeni ve belgeleri değiştirir. Sorun halinde bu fazda değiştirilen `.gitignore` ve dokümantasyon satırları geri alınır; canlı Worker, Supabase ve eski Pages yayınına dokunulmaz.
