# Yönetim işlem pencereleri

Proje ve blog silme onayları ile başarılı işlem bildirimi ortak bir görsel sisteme taşındı. Silme penceresi bordo-koral, başarı penceresi zümrüt tonlu opak bir üst panel kullanır. Başlık ve durum simgesi bu panelde; açıklama ve eylemler beyaz gövde içinde ayrı bir bilgi kutusunda yer alır.

Pencerelerin `Modal` görünürlük koşulları, işlem fonksiyonları, kapatma davranışları ve `animationType="fade"` geçişleri korunmuştur. Veri silme akışında veya yetkilendirmede değişiklik yapılmamıştır.

Doğrulama: TypeScript kontrolü ve Expo web export başarılıdır.

Güvenlik kontrolü: Değişiklik yalnızca yönetim arayüzü sunumundadır. RLS, RPC, kimlik, sahiplik, kullanıcı girdisi, upload, dış URL, credential, log ve admin yetkilendirme davranışı değişmedi. Yeni güvenlik bulgusu yok; public yayın veya tünel açılmadı.

Geri alma: `AdminDashboardScreen.tsx` içindeki üç `commandDialog` gövdesini önceki dialog yapısına ve ilişkili `modalBackdrop`/dialog stillerini önceki değerlerine döndürün.

## Kategori değiştirme penceresi

Kategori değiştirme penceresi mavi opak yönetim başlığı, proje/mevcut kategori bilgi alanı, eşit genişlikte filtre şeridi, metin odaklı seçim listesi ve seçilen değeri özetleyen alt aksiyon alanıyla yenilendi. Modalın `fade` geçişi, arama, filtreleme, seçim ve kaydetme davranışları korunur.

Kategori satırlarındaki 3D PNG çağrıları, görsel fallback'ler ve oyun/uygulama emojileri kaldırıldı. Yönetim ekranı artık `category3dIcons` eşlemesini içe aktarmaz; Göz At ekranındaki kategori ikonları ve varlıkları etkilenmez.

Doğrulama: TypeScript kontrolü ve Expo web export başarılı. `AdminDashboardScreen.tsx` içinde `getCategory3DIcon`, kategori görsel stilleri veya kategori emojisi referansı kalmadı.

Güvenlik kontrolü: Kategori güncelleme servisi, hedef kimliği ve admin işlemi değişmedi. RLS, RPC, kimlik, sahiplik, girdi, upload, dış URL, credential ve log davranışında değişiklik yok. Yeni güvenlik bulgusu yok; public yayın veya tünel açılmadı.

Geri alma: Kategori modalındaki metin odaklı satırları önceki ikonlu satırlara döndürün, `getCategory3DIcon` içe aktarımını geri ekleyin ve `categoryModal*` stillerini önceki değerlerine alın.

## Yönetim desteği penceresi

Destek Ver penceresi mavi-petrol başlıklı bir Kıstas destek konsolu olarak yenilendi. Hedef proje ve mevcut destek ayrı bir bilgi kartında; hazır miktarlar seçilebilir puan kartlarında; özel değer girişi aynı seçim panelinde gösterilir. Mevcut, eklenecek ve yeni toplam değerleri koyu bir hesap şeridinde okunur. Alt bölüm seçilen miktarı tekrar eder ve işlemi tek bir ana eylemle onaylar.

Küçük ekranlarda orta içerik kaydırılabilir, başlık ve alt eylem alanı pencere yapısında kalır. Tasarım PNG veya başka görsel dosya kullanmaz.

Doğrulama: TypeScript kontrolü ve Expo web export başarılı. Modalın `fade` geçişi, 1/3/5/10/25 hazır değerleri, 1–100 doğrulaması, özel miktar girişi ve `handleConfirmGrantSupport` çağrısı korunmuştur.

Güvenlik kontrolü: Destek miktarı doğrulaması, admin servis çağrısı, hedef proje kimliği ve hata yönetimi değişmedi. Yeni istemci sırrı, veri alanı, RPC, upload, dış URL veya log eklenmedi. Yeni güvenlik bulgusu yok; public yayın veya tünel açılmadı.

Geri alma: `AdminDashboardScreen.tsx` içindeki destek modalı JSX'ini ve `supportModal*`/`support*` stillerini önceki sürüme döndürün. Destek servisinde geri alma gerekmez.

## Yönetim merkezi genel görünümü

Yönetim merkezi, kontrollü mavi geçişli bir operasyon özeti ve her yönetim alanına özel hafif renk tonu taşıyan metrik kartlarıyla yenilendi. Üst özet alanı yetki durumunu ve panel kapsamını tek bakışta gösterir. Metrik kartları geniş ekranda dengeli 4 + 3 dizilime geçer; seçili alan ince vurgu çizgisi ve belirgin yön düğmesiyle ayrılır.

Arama, filtre ve proje moderasyonu kartları aynı tasarım sistemine taşındı. Kart köşeleri, boşluklar, ikon yüzeyleri, durum etiketleri ve işlem düğmeleri daha tutarlı hale getirildi. Efektler düşük yoğunluklu gölge ve sınırlı renk tonlarıyla tutuldu; veri yoğunluğu ve mevcut işlem akışları korunmuştur.

Doğrulama: TypeScript kontrolü ve Expo web export başarılıdır. Sekme seçimi, arama, filtreleme, yenileme, proje inceleme ve tüm yönetim eylemleri mevcut fonksiyonlarını kullanmaya devam eder.

Güvenlik kontrolü: Değişiklik yalnızca yönetim ekranının JSX ve stil katmanındadır. Admin yetkilendirmesi, servis çağrıları, RLS, RPC, kimlik, sahiplik, kullanıcı girdisi, upload, dış URL, credential ve log davranışı değişmedi. Yeni güvenlik bulgusu yok; production yayını veya public test tüneli açılmadı.

Geri alma: `AdminDashboardScreen.tsx` içindeki `overviewHero`, `metric*`, `dataCard`, `filter*`, `health*` ve ilgili yönetim ekranı stillerini önceki değerlerine döndürün. Servis veya veri katmanında geri alma gerekmez.
