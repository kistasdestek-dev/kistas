# Kıstas Web Yayın Akışı

Ana adres: `https://www.kistas.com.tr`. Kök `https://kistas.com.tr` ve önceki `https://www.kıstas.com` adresleri, yeni adrese yol ve sorgu korunarak 301 ile yönlendirilir. İlk web sürümünde kredi satın alma kapalıdır.

## Yayın kapısı

1. Cloudflare R2 panelinde daha önce web paketine girmiş eski Secret Access Key'i iptal et ve iptal edildiğine dair kanıtı güvenlik kaydına işle. Bu tamamlanmadan Pages production dağıtımı veya public tünel açma.
2. `npm run release:web` çalıştır. Bu komut kaynak sır taraması, TypeScript, XSS/SQL kontrolleri, alan testleri, Expo exportu ve `dist/` sır taramasını yürütür.
3. Uzak Supabase migration listesi ile yerel migration'ları karşılaştır. Anonim ve başka hesapla RLS/admin negatif testlerini, oturum ve yükleme akışlarını doğrula. Açık P0/P1 kalmamalı; `docs/SECURITY_ROADMAP.md` yayın kapısı kanıtla doldurulmalı.
4. KVKK e-postası `kistasdestek@gmail.com` için gerçek gönderim/teslimat testi yap. Canlı web adresinde SSL, güvenlik başlıkları, giriş/OAuth, şifre sıfırlama ve doğrudan blog bağlantısını test et.

## GitHub ve Cloudflare Pages

- Manuel kolay yayin: proje kokundeki `YAYINLA.cmd` dosyasina cift tikla. `1`, Git'te zaten hazir olan commit'leri gonderir ve devam eden yerel dosyalari dahil etmez. `2`, listelenen **tum** yerel degisiklikleri yeni pakete alir; yalniz hepsi tamamlandiysa sec. Arac hedef depoyu ve dali dogrular, GitHub'daki yeni degisiklikleri kontrol eder, acik P0/P1 veya migration varsa durur, yeni paket icin sir taramasi ile `release:web` calistirir ve son gonderimden once `YAYINLA` yazilmasini ister. Gonderimden sonra Cloudflare Pages > `kistas` > Deployments ekraninda sonucun `Success` oldugunu kontrol et. Supabase migration ve e-posta sablonlari bu GitHub yayiniyla otomatik uygulanmaz.
- Kaynak özel GitHub deposundaki `main` dalında tutulur. `.env`, `backups/`, `scratch/`, `.tools/` ve `dist/` depoya girmez. Gönderimden önce `node scripts/security/check-repo-secrets.mjs` çalıştır.
- Cloudflare Pages yeni proje tipi **Git integration** olarak oluşturulur. GitHub özel deposuna yalnızca bu depo için erişim verilir; production dalı `main`, proje kökü `/`, build komutu `npm run release:web`, çıktı dizini `dist` olur. Expo SDK 57 için Node.js 22.13 veya yenisi gerekir.
- Pages build değişkenleri yalnızca `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` olur. Bu değerler publishable istemci ayarlarıdır. R2, ödeme, taşıyıcı ve Supabase service-role sırları Pages'e veya `EXPO_PUBLIC_*` alanına girmez.
- İlk Pages dağıtımı yalnızca güvenlik kapısı kapandıktan sonra başlatılır. Sonraki gönderimler otomatik dağıtılmadan önce aynı `release:web` kontrollerinden geçer. Geri dönüş için Pages'in önceki başarılı production dağıtımı yeniden seçilir.

## DNS, SSL ve kimlik

- `kistas.com.tr` alanının yetkili ad sunucuları `mimi.ns.cloudflare.com` ve `nero.ns.cloudflare.com` olarak dış DNS'te doğrulandı. Pages kök ve `www` alanları `Active / SSL enabled`; iki adres de HTTPS ile Kıstas ana sayfasını açıyor. Resend `auth.kistas.com.tr` alanı `Verified`. Cloudflare DNSSEC daha sonra ayrıca değerlendirilecek.
- Pages Custom domains bölümüne hem `www.kistas.com.tr` hem `kistas.com.tr` ekle. Sertifika etkinleşmesini bekle. Kök alan adından `www` adresine kalıcı yönlendirme kur; önceki `xn--kstas-n4a.com` ve `www.xn--kstas-n4a.com` adreslerini yeni adrese 301 ile yönlendirirken yol/sorguyu koru. HTTPS zorlamasını ve temel WAF/DDoS korumasını aç. Pages'in `_headers` dosyasındaki CSP/HSTS başlıklarını canlı yanıtta doğrula.
- Supabase Dashboard → Authentication → URL Configuration: Site URL `https://www.kistas.com.tr`; izinli yönlendirme URL'si tam ana adres. Geçiş boyunca eski adresi izinli yönlendirmelerde tut; eski posta bağlantıları süresi bitince kaldır. OAuth sağlayıcıları etkinse sağlayıcı callback ayarlarını da doğrula.

## Bilinen ilk sürüm sınırları

Web uygulaması SPA olarak dışa aktarılır. Blogun temiz `/blog/...` bağlantısı istemci tarafından açılır; yazıya özel sosyal kartların sunucu tarafı önizlemesi bu sürümde yoktur. Web kredi satın alma sağlayıcısı bağlı değildir. Cloudflare koruması web adresini kapsar; doğrudan Supabase API yetkisi RLS/RPC ile korunur.

GA4 (`G-2XXP5LHME9`) kodu yalnız ziyaretçi analitik çerezlerine açıkça izin verdikten sonra yüklenir. Tercih gizlilik sayfasından yeniden açılıp değiştirilebilir. Sayfa ve etkinlik verilerinde şifre sıfırlama URL'sinin query/hash parametreleri gönderilmez. `node scripts/tests/analytics-consent.test.mjs` bu davranışı yayın kontrolünde doğrular.

Supabase özel SMTP halen Resend'in doğrulanmış `auth.xn--kstas-n4a.com` gönderim alanına bağlıdır. Yeni `auth.kistas.com.tr` alanı Resend'de doğrulandı; bu eski gönderici, Supabase SMTP gönderici adresi değiştirilene kadar çalışır; kullanıcıya sıfırlama e-postası gönderimini kesmemek için erken kaldırılmaz. Destek hesabına şifre sıfırlama e-postası gönderildi, Resend'de `Delivered` görüldü ve kullanıcı bağlantıyla canlı yeni şifre ekranını açtı. İlk İngilizce Gmail mesajı spam klasörüne düştü; SPF, DKIM ve DMARC üçü de PASS. Şifre yenileme ve kayıt doğrulama e-postaları Türkçe Kıstas tasarımına çevrildi; yeni Türkçe kurtarma mesajı Resend'de `Delivered` görüldü ve Gmail Gelen Kutusu'na ulaştı. Şablon kaynakları `supabase/email-templates/` altındadır ve Supabase panelindeki canlı ayarlarla ayrıca eşleştirilmelidir. Yeni şifre kaydı ve yeni kullanıcı kayıt doğrulaması henüz uçtan uca test edilmedi; `SEC-010` bu nedenle kısmi durumdadır. Google ve GitHub sağlayıcıları etkin olsa da normal kullanıcı tarayıcısında giriş testi ayrıca gerekir.
