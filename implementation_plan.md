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

## Faz 2 — Lint ve Kalite Kapısı

- Next.js 16 tarafından kaldırılan `next lint`, ESLint 9 flat config ile değiştirilecektir.
- Web uygulamasında `core-web-vitals` ve TypeScript kuralları uyarı toleransı olmadan çalışacaktır.
- Root lint görevi dört workspace paketini Turbo üzerinden doğrulayacaktır.
- Bağımlılık güvenlik denetimi hata kodunu yutmayacak; yüksek/kritik bulgu kalite kapısını durduracaktır.
- Faz; lint, TypeScript, güvenlik/regresyon testleri ve üretim build kanıtlarıyla kapatılacaktır.
- Geçiş istisnaları: mevcut Supabase adaptörlerindeki açık `any` tipleri, davranış değiştiren React saflık/efekt refactorları ve Cloudflare Images bağlanmadan önceki `<img>` kullanımları ayrı teknik borç olarak tutulacaktır. Hook bağımlılıkları, navigasyon, kullanılmayan kod ve JSX güvenliği bu fazda düzeltilir.

## Faz 2 Doğrulama Kaydı — 2026-09-24

- Next.js 16 uyumlu ESLint 9 flat config, Core Web Vitals ve TypeScript kuralları kuruldu.
- Web lint: 0 hata, 0 uyarı; Turbo workspace lint: 4/4 başarılı.
- TypeScript/Turbo: 7/7 görev başarılı.
- Bağımlılık denetimi fail-closed çalıştı; bilinen açık bulunmadı.
- XSS ve SQL enjeksiyonu kontrolleri başarılı.
- Regresyon: çekirdek domain 84/84, sohbet kimliği 4/4 başarılı.
- Next.js ve vinext üretim derlemeleri başarılı; deploy yapılmadı.
- Düzeltmeler: kararlı Supabase istemci referansları, eksiksiz hook bağımlılıkları, render dışında Google callback ref güncellemesi, güvenli iç navigasyon ve sıralı sohbet animasyonu.
- Windows üzerinde Turbo build görevleri tamamlandıktan sonra süreç askıda kaldığı için root build kapısı topolojik ve tek eşzamanlı `pnpm -r` çalıştırıcısına geçirildi; lint ve type-check Turbo önbelleğini kullanmayı sürdürür.

## Faz 3 — Test Görev Grafiği

- Mevcut yerel regresyon testleri `shared`, `supabase`, `ui` ve `web` sorumluluklarına ayrılır.
- Her workspace gerçek bir `test` görevi çalıştırır; eksik veya var olmayan görev başarı sayılmaz.
- Test dosyaları Turbo global girdisi olarak izlenir ve başarılı sonuçlar önbelleğe alınır.
- Ağ ve canlı Supabase erişimi gerektiren Pars Defender testi deterministik kapıdan ayrılarak yalnız `pnpm test:live` ile çalıştırılır.
- `pnpm sayos:audit`, üretim derlemesinden önce bütün deterministik testleri fail-closed çalıştırır.
- Eski Expo `dist` çıktısına bağlı SEO ve tipografi testleri Next.js App Router ile ortak UI token sözleşmesine taşınır.

## Faz 3 Doğrulama Kaydı — 2026-09-24

- Dört workspace’in tamamında test görevi mevcut; Turbo test grafiği 7/7 başarılıdır.
- 15 deterministik test dosyası çalıştı; çekirdek domain 84/84 ve sohbet kimliği 4/4 başarılı, atlanan test yoktur.
- İkinci çalıştırmada 7/7 görev Turbo önbelleğinden geldi; kök test dosyaları `globalDependencies` ile cache invalidation kapsamındadır.
- Next.js SEO sözleşmesi 8 kaynak rota ve 11 sitemap URL’sini; UI tipografi sözleşmesi ortak Kıstas tokenını ve sistem font zincirini doğrular.
- `pnpm sayos:audit`: bilinen yüksek/kritik açık yok, lint 4/4, tip kontrolü 7/7, test grafiği 7/7 ve Next üretim derlemesi başarılıdır. XSS/SQL korumaları ve vinext Workers derlemesi ayrıca geçmiştir.
- Canlı ağ testi bilinçli olarak otomatik kapıya alınmadı; deploy veya veritabanı değişikliği yapılmadı.

## Geri Dönüş

Faz 1 yalnız depo hijyeni ve belgeleri değiştirir. Sorun halinde bu fazda değiştirilen `.gitignore` ve dokümantasyon satırları geri alınır; canlı Worker, Supabase ve eski Pages yayınına dokunulmaz.
