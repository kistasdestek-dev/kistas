# Kıstas Web Yayın Akışı

Ana adres: `https://www.kıstas.com` (`https://www.xn--kstas-n4a.com`). `https://kıstas.com` ana adrese 301 ile yönlendirilir. İlk web sürümünde kredi satın alma kapalıdır.

## Yayın kapısı

1. Cloudflare R2 panelinde daha önce web paketine girmiş eski Secret Access Key'i iptal et ve iptal edildiğine dair kanıtı güvenlik kaydına işle. Bu tamamlanmadan Pages production dağıtımı veya public tünel açma.
2. `npm run release:web` çalıştır. Bu komut kaynak sır taraması, TypeScript, XSS/SQL kontrolleri, alan testleri, Expo exportu ve `dist/` sır taramasını yürütür.
3. Uzak Supabase migration listesi ile yerel migration'ları karşılaştır. Anonim ve başka hesapla RLS/admin negatif testlerini, oturum ve yükleme akışlarını doğrula. Açık P0/P1 kalmamalı; `docs/SECURITY_ROADMAP.md` yayın kapısı kanıtla doldurulmalı.
4. KVKK e-postası `kistasdestek@gmail.com` için gerçek gönderim/teslimat testi yap. Canlı web adresinde SSL, güvenlik başlıkları, giriş/OAuth, şifre sıfırlama ve doğrudan blog bağlantısını test et.

## GitHub ve Cloudflare Pages

- Kaynak özel GitHub deposundaki `main` dalında tutulur. `.env`, `backups/`, `scratch/`, `.tools/` ve `dist/` depoya girmez. Gönderimden önce `node scripts/security/check-repo-secrets.mjs` çalıştır.
- Cloudflare Pages yeni proje tipi **Git integration** olarak oluşturulur. GitHub özel deposuna yalnızca bu depo için erişim verilir; production dalı `main`, proje kökü `/`, build komutu `npm run release:web`, çıktı dizini `dist` olur. Expo SDK 57 için Node.js 22.13 veya yenisi gerekir.
- Pages build değişkenleri yalnızca `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` olur. Bu değerler publishable istemci ayarlarıdır. R2, ödeme, taşıyıcı ve Supabase service-role sırları Pages'e veya `EXPO_PUBLIC_*` alanına girmez.
- İlk Pages dağıtımı yalnızca güvenlik kapısı kapandıktan sonra başlatılır. Sonraki gönderimler otomatik dağıtılmadan önce aynı `release:web` kontrollerinden geçer. Geri dönüş için Pages'in önceki başarılı production dağıtımı yeniden seçilir.

## DNS, SSL ve kimlik

- Cloudflare'a `xn--kstas-n4a.com` bölgesini ekle. Turhost'taki DNS kayıtlarını, özellikle MX/TXT e-posta kayıtlarını, Cloudflare'a taşı. DNSSEC açıksa nameserver değişiminden önce registrar tarafında kapat; sonrasında Cloudflare üzerinden yeniden aç. Turhost nameserver'larını Cloudflare'ın verdiği iki adla değiştir.
- Pages Custom domains bölümüne hem `www.xn--kstas-n4a.com` hem `xn--kstas-n4a.com` ekle. Sertifika etkinleşmesini bekle. Kök alan adından `www` adresine kalıcı yönlendirme kur; HTTPS zorlamasını ve temel WAF/DDoS korumasını aç. Pages'in `_headers` dosyasındaki CSP/HSTS başlıklarını canlı yanıtta doğrula.
- Supabase Dashboard → Authentication → URL Configuration: Site URL `https://www.xn--kstas-n4a.com`; izinli yönlendirme URL'si tam ana adres. `www` ve kök alanını karıştırma. OAuth sağlayıcıları etkinse sağlayıcı callback ayarlarını da doğrula.

## Bilinen ilk sürüm sınırları

Web uygulaması SPA olarak dışa aktarılır. Blogun temiz `/blog/...` bağlantısı istemci tarafından açılır; yazıya özel sosyal kartların sunucu tarafı önizlemesi bu sürümde yoktur. Web kredi satın alma sağlayıcısı bağlı değildir. Cloudflare koruması web adresini kapsar; doğrudan Supabase API yetkisi RLS/RPC ile korunur.
