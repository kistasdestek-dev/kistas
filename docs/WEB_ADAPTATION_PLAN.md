# Kıstas Web Adaptasyon Planı

## Değişmez Mimari Karar

Kıstas tek bir marka ve ortak iş mantığı kullanır; telefon, tablet ve masaüstü için ayrı ürünler oluşturulmaz. Görsel kabuk cihaz sınıfına göre uyarlanır:

- Telefon: mobil akış ve cam alt navigasyon.
- Tablet: daha geniş içerik, üç kolon ve uygun ekranlarda yan panel.
- Masaüstü: sınırlı içerik genişliği, dört kolon ve kalıcı web navigasyonu.
- iOS/Android: native ödeme ve cihaz özellikleri platform dosyalarında kalır.
- Web: web ödeme sağlayıcısı ayrıca bağlanana kadar istemciden kredi üretmez.

## Fazlar

### Faz 1 — Platform Sınırı ve Temel Hazırlık

- [x] RevenueCat satın alma servisi native ve web olarak fiziksel ayrıldı.
- [x] Web paketi native RevenueCat SDK ve mağaza anahtarlarından arındırıldı.
- [x] Telefon, tablet ve masaüstü breakpoint/token katmanı oluşturuldu.
- [x] TypeScript, web üretim exportu ve Android üretim exportu doğrulandı.
- [x] Geçici export klasörleri kaynak kontrolünden hariç tutuldu.

### Faz 2 — Adaptive Uygulama Kabuğu ve Navigasyon

- [x] Telefon ve native cihazlar mevcut cam alt menüyü kullanır.
- [x] Tablet için 84 px kompakt cam navigasyon rayı hazırlandı.
- [x] Masaüstü için 252 px kurumsal sidebar, tam sekme seti ve sade durum footer'ı hazırlandı.
- [x] Web içerik alanı navigasyon genişliğinden bağımsız hesaplanıp en fazla 1600 px ile sınırlandı.
- [x] Native ve web navigasyonları platform dosyalarıyla fiziksel olarak ayrıldı.

### Faz 3 — Keşfet, Göz At ve Vitrinler

- [x] Sponsorlu Vitrin ve Günün Vitrini iş kuralları korunarak responsive yerleşime alındı.
- [x] Günün Vitrini webde animasyonsuz, geniş ekrana uygun premium kart bileşenine ayrıldı.
- [x] Popüler ve Yeni Çıkanlar geniş webde cam yüzeyli, iki sayfanın aynı anda okunabildiği düzene alındı.
- [x] Göz At kategori vitrini telefonda 2, tablette 3, masaüstünde 4 kolon kullanır.
- [x] Arama, kategori ve platform filtreleri geniş web üst alanına uyarlandı.
- [x] Web platform filtresindeki sonsuz marquee kaldırılıp kullanıcı kontrollü statik chip düzenine geçirildi.
- [x] Sponsor kartlarının boşta çalışan bob ve requestAnimationFrame döngüleri kaldırıldı; 3D tepki yalnızca pointer hareketinde çalışır.
- [x] Web aramasındaki otomatik yazı demosu/nefes animasyonu ve Aurora butonlarının sürekli RAF döngüsü kaldırıldı; efektler yalnızca kullanıcı etkileşiminde çalışır.
- [x] Web ilk açılışında native lansman katmanı kaldırıldı; iOS/Android açılışı korundu.

### Faz 4 — Proje Detayı ve Lansman Akışı

- [ ] Proje detayı masaüstünde App Store benzeri geniş vitrine dönüşecek.
- [x] Lansman formu telefonda adımlı/tek kolonlu, geniş ekranda iki kolonlu responsive ızgaraya ve canlı önizlemeye alındı.
- [x] Dosya yükleme (R2), anlık önizleme, canlı vitrin kartı, lansman hazırlık skoru ve markdown doğrulaması tamamlandı.

### Faz 5 — Auth, Profil, Sohbet ve Yönetim

- [ ] Auth ekranları geniş ekranda odaklı panel olarak sunulacak.
- [ ] Profil ve yönetim ekranları yoğun bilgi için masaüstü düzenine kavuşacak.
- [ ] Sohbet telefonda tek panel, geniş ekranda konuşma + içerik bölünmüş görünüm kullanacak.

### Faz 6 — Performans, Güvenlik ve Yayın

- [ ] Kullanılmayan bağımlılık ve ölü kod denetimi yapılacak.
- [ ] Web bundle, görsel boyutları ve ilk açılış performansı ölçülecek.
- [ ] Güvenlik başlıkları, yönlendirme korumaları ve Supabase RLS senaryoları doğrulanacak.
- [ ] SEO, paylaşım kartları, domain ve üretim dağıtımı tamamlanacak.

## Korunan Sınırlar

- Service/domain çağrıları responsive bileşenlere taşınmaz.
- Supabase service-role anahtarı istemciye girmez.
- Web ve native ödeme akışları aynı dosyada koşullu import ile karıştırılmaz.
- Test exportları `.tmp-*` altında tutulur ve dağıtıma dahil edilmez.
