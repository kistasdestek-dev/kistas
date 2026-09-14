# Dinamik Keşfet filtre barı

Keşfet ekranındaki sıralama, kategori ve platform satırları geniş web görünümünde tek bir dinamik filtre barında birleştirildi. Kapalı durumda üç kontrol ve güncel seçimleri görünür. İlgili kontrole tıklanınca seçim paneli genişler; içerik kısa gecikmeli opaklık ve konum geçişiyle açılır. Fare kapsayıcıdan ayrıldığında panel açık kalır. Aynı kontrole yeniden tıklamak veya paneldeki kapatma düğmesi barı kapatır.

Sıralama paneli Öne Çıkan, En Çok Desteklenen ve Yeni seçeneklerini; kategori paneli Tümü ile proje kategorilerini; platform paneli de mevcut platform filtrelerini sunar. Seçimler Keşfet ekranının var olan state ve filtreleme akışını kullanır. Kategori panelindeki bağlantı mevcut Göz At yönlendirmesini korur.

Dinamik filtre barı masaüstü web, mobil web ve yerel mobil görünümde kullanılır. Mobilde kontroller üç kompakt düğmeye dönüşür; kategori seçenekleri yatay kaydırılabilir panelde, platformlar kompakt ızgarada gösterilir. Göz At ekranına yapılan önceki entegrasyon geri alınmıştır. Yeni bir animasyon veya UI bağımlılığı eklenmedi.

Doğrulama: TypeScript kontrolü ve Expo web export başarılıdır.

Güvenlik kontrolü: Değişiklik kategori sunumu ve mevcut kategori yönlendirmesiyle sınırlıdır. Veri sorguları, kimlik, kullanıcı girdisi, dış URL, upload, credential ve log davranışı değişmedi. Yeni güvenlik bulgusu yok; production yayını veya public test tüneli açılmadı.

Geri alma: `DiscoverScreen.tsx` içindeki `DynamicDiscoverFilters` koşullu kullanımını kaldırın ve mobil filtre bloklarını tüm ekranlarda gösterin. `DynamicDiscoverFilters.tsx` ile `DynamicDiscoverFilters.web.tsx` dosyalarını kaldırın.
