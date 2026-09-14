# Kategori kartlarının renk paleti

38 kart için ortak sekiz renk ailesi kullanıldı: petrol, lavanta, gül kurusu, deniz mavisi, kiremit, yaprak yeşili, mürdüm ve indigo. İkonun baskın tonuna karşı ayrışan zeminler seçildi; aynı renkler oyun ve uygulama sekmelerinde tekrar edilerek bütünlük sağlandı.

Yüzeyler opak. Kullanıcı geri bildirimi üzerine mat tonlar zenginleştirildi; çapraz açık/koyu renk geçişi, ikon arkasında sıcak ışık, ince yüzey yayı ve aydınlık üst kenar eklendi. Web üzerinde radyal ışık ve iç kenar gölgesi, diğer platformlarda ortak doğrusal ışık katmanı kullanılır. Blur/backdrop veya glass uygulanmaz. Ok rozetleri opak krem ve koyu ok olarak düzenlendi. İkon dosyaları, 87/102 piksel boyutları ve konumları korundu.

Doğrulama: Son efekt değişikliğinden sonra TypeScript kontrolü ve Expo web export başarılı. Yerel tarayıcıda masaüstü oyun kartlarının ışık, kenar ve renk geçişleri görsel olarak kontrol edildi; geçici viewport ayarı geri alındı.

Güvenlik kontrolü: yalnızca sabit renkler ve sunum stilleri değişti. Veri, yetki, RPC, kullanıcı girdisi, upload, dış URL, credential, log ve admin davranışında değişiklik yok; bu alanlardaki kontrol maddeleri kapsam dışı. Yeni güvenlik bulgusu yok. Public yayın veya tünel açılmadı.

Geri alma: BrowseScreen.tsx içindeki kategori gradient değerlerini önceki mat palete döndürün; cardLighting, cardSurfaceArc ve doğrusal ışık katmanını kaldırıp cardStroke kenarlarını önceki stile döndürün.

## Görsel optimizasyonu

1254 × 1254 piksel kaynak ikonlar korunur. `scripts/optimize-category-icons.ps1`, bu dosyalardan tasarımı ve alfa şeffaflığını değiştirmeden 256 × 256 piksel uygulama kopyaları üretir. Uygulamadaki kategori eşlemeleri `assets/categories/icons/optimized/` altındaki kopyaları kullanır.

38 kaynak PNG 69,34 MB iken optimize set 4,37 MB'dir. Kategori listesi yalnızca 15 veya 23 öğe içerdiğinden sanallaştırma bu ekranda kapatıldı. Aktif sekmedeki kartların tamamı ilk açılışta oluşturulur; ikon yükleme işlemi kaydırmaya bırakılmaz.

Geri alma: `category3dIcons.ts` içindeki `optimized/` yol parçalarını kaldırın ve `BrowseScreen.tsx` liste parti değerlerini önceki 8 değerine döndürün. Kaynak görseller değiştirilmediği için yeniden üretim gerekmez.
