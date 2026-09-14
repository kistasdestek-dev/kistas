# Alt gezinme dock'u

Ana gezinme menüsü webde üstten alta taşındı. Masaüstünde kompakt kapsül, mobilde ikon ve kısa etiketlerden oluşan sabit bir bar kullanılır. Cam yüzey CSS backdrop-filter ile arkasından kayan içeriği bulanıklaştırır; desteklemeyen tarayıcılarda daha opak yüzey kullanılır. Mobil web alt güvenli alanı hesaba katar.

Yerel mobil menü de sayfanın üzerinde yüzer. Mevcut expo-blur paketi kullanılır; Android için içerik BlurTargetView ile hedeflenir. Android 31 öncesinde paketin yarı saydam geri dönüşü kullanılır. Kaydırmaya bağlı solma ve büyük animasyonlu logo kaldırılmıştır.

App.tsx içindeki eski üst/yan menü boşlukları ve üst içerik kırpması kaldırıldı. Keşfet, Göz At, profil ve konuşma listesinin sonuna dock yüksekliğini karşılayan kaydırılabilir boşluk eklendi. Mevcut gezinme, oturuma göre sekme görünürlüğü ve okunmamış mesaj sayısı korunur.

Doğrulama: TypeScript kontrolü ve Expo web export başarılı. Mobil web önizlemesinde alt konum, kartların camdan görünmesi ve Göz At sekmesine geçiş kontrol edildi. Yerel iOS/Android cihazında görsel test yapılmadı.

Güvenlik kontrolü: Değişiklik sunum ve gezinme yerleşimi kapsamındadır. Yeni tablo, RPC, yetki, ödeme, kullanıcı girdisi, dosya yükleme, dış URL veya credential/log akışı eklenmedi. Yeni güvenlik bulgusu yok. Public tünel veya production yayını başlatılmadı.

Geri alma: Web menüsünün konumunu ve App.tsx üst boşluklarını birlikte geri alın; MobileBottomNav, navigationTypes ve BlurTargetView bağlantısını önceki sürüme döndürün. İçerik sonu boşluklarını yeni menü konumuna göre ayarlayın.
