# Keşfet kategori ikonları

Keşfet filtre panelindeki 46 kategori, tek bir çizgi dili oluşturmak için
`@expo/vector-icons/MaterialCommunityIcons` ile eşleştirilir. Eşleştirmeler
`src/features/listings/presentation/categoryFilterIcons.ts` dosyasında tutulur
ve web ile mobil arayüz aynı kaynağı kullanır.

## Tasarım yaklaşımı

- Her kategori, adını tekrar etmek yerine işlevini doğrudan anlatan bir simge kullanır.
- Benzer kategoriler ayırt edilir. Örneğin oyun müziği için müzik çemberi,
  uygulama müziği için kulaklık kullanılır.
- İnce, tutarlı ve sade çizgiler kategori düğmelerinin mevcut ölçülerine uyar.
- Yeni resim dosyası veya ikon paketi eklenmediği için ağ isteği ve görsel yükü artmaz.
- Seçili durum; kırık beyaz zemin, ince turkuaz vurgu çizgisi, mint ikon haznesi
  ve küçük bir onay işaretiyle belirtilir. İkon koyu renkte kaldığı için seçildiğinde
  görünürlüğünü korur ve panel yoğun mavi renge dönüşmez. Aynı seçili durum dili
  sıralama ve platform seçenekleriyle paneli açan üç alt düğmede de kullanılır.

## Bakım

Yeni bir kategori eklenirse slug değeri `categoryFilterIcons.ts` içindeki haritaya
eklenmelidir. Eşleşmeyen kategoriler `shape-outline` simgesini kullanır.

## Geri alma

Değişikliği geri almak için web ve mobil filtre bileşenlerinde kategori simgesi
olarak önceki `Ionicons` kullanımına dönün ve `categoryFilterIcons.ts` dosyasını kaldırın.

## Güvenlik kontrolü

Bu değişiklik yalnızca istemci tarafındaki görsel sunumu etkiler. Kimlik doğrulama,
yetkilendirme, veri tabanı, RPC, depolama, ödeme, harici URL işleme, kullanıcı girdisi
ve günlükleme davranışlarında değişiklik yoktur.
