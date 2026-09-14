# Vitrin görünürlüğü satın alma penceresi

Vitrin görünürlüğü penceresi, kullanıcının hedef alanı ve süre paketini güvenle karşılaştırabileceği premium bir satın alma akışına dönüştürüldü. Kategori vitrini yeşil, Genel Keşfet mavi vurgu kullanır; pencerenin üst alanı seçilen kapsama göre renk değiştirir.

Paket kartları süre, fayda açıklaması ve kredi bedelini ayrı bir hiyerarşide gösterir. 24 saatlik paket `Hızlı başlangıç`, 3 günlük paket `En çok tercih edilen`, 7 günlük paket `En avantajlı` etiketi taşır. Paket altındaki kategori kimliği ve teknik vitrin metni kaldırıldı; bunun yerine `CreditService` içindeki kullanıcıya dönük paket açıklamaları gösterilir. Kategori seçim kartındaki olası kategori UUID değeri de kullanıcı arayüzünden çıkarıldı.

Alt özet alanı mevcut bakiyeyi ve seçilen paket sonrasında kalacak krediyi gösterir. Ana eylem `Projeyi Öne Çıkar · X Kredi` biçiminde açık maliyet bilgisi taşır. Yetersiz bakiye durumunda mevcut Kredi Mağazası yönlendirmesi korunur. Küçük ekranlarda modal gövdesi kaydırılabilir.

Doğrulama: TypeScript kontrolü ve Expo web export başarılıdır.

Güvenlik kontrolü: Paket kimliği, kapsamı, süresi ve kredi maliyeti mevcut `CreditService` verilerinden gelir. `refreshCredits`, `boostListingScoped` çağrısı, sunucu tarafı RPC doğrulaması ve işlem kilidi değiştirilmedi. Yeni kullanıcı girdisi, secret, dış URL, log, ödeme çağrısı veya istemci yetkisi eklenmedi. Production yayını veya public test tüneli açılmadı.

Geri alma: `VisibilityManagementScreen.tsx` içindeki paket modalı JSX'ini ve `modalHero`, `modalBody`, `scope*`, `package*`, `balanceNotice*`, `confirm*` stillerini önceki değerlere döndürün. Kredi servisi veya veri katmanında geri alma gerekmez.

## Vitrin Yönetimi ana ekranı

Ana ekran, koyu mavi geçişli bir görünürlük merkezi olarak yeniden tasarlandı. Üst panel yalnızca bakiyeyi göstermek yerine kredinin sağlayacağı faydayı açıklar; kredi bakiyesi, mağaza eylemi, yayındaki proje ve öne çıkan proje sayıları tek yüzeyde gösterilir.

Proje alanının başlığı ve açıklaması daha okunur hale getirildi. Yayındaki ve henüz sponsorlu olmayan projelerde kategori vitrini ile Genel Keşfet faydasını anlatan kısa bir bilgilendirme satırı bulunur. Ana eylem `Vitrinde Öne Çıkar`, aktif sponsorlukta `Görünürlüğü Uzat` olarak gösterilir. Proje kartları ve eylem düğmesi daha güçlü görsel hiyerarşi, sistem fontu ve kontrollü gölge kullanır. Kullanıcı arayüzündeki olası kategori UUID yedeği kaldırılmıştır.

Güvenlik kontrolü: Ana ekran değişiklikleri sunum ve kullanıcı metinleriyle sınırlıdır. Kredi bakiyesi, paket maliyetleri, sponsorluk süresi, `boostListingScoped`, sunucu doğrulaması ve tekrar işlem koruması değişmedi.

Başlık satırının sağındaki dekoratif Kıstas logo kutusu ile özet panelindeki `KISTAS GÖRÜNÜRLÜK` üst etiketi kaldırıldı. Başlık ve bakiye paneli boşlukları kalan içerikle yeniden hizalandı.
