# Profil ekranı tasarımı

Profil ekranı kullanıcıya dönük kişisel merkez olarak yeniden düzenlendi. Arka plan açık ve sakin bir tona taşındı; profil kimliği ile Kıstas Cüzdan ayrı, yuvarlatılmış ve düşük yoğunluklu gölgeli kartlar haline getirildi. Profil kartındaki renkli yüzeyler içerikten rol çalmayacak şekilde düşük opaklıkta tutuldu.

Yönetim erişimi yalnızca admin kullanıcılarda görünen mevcut koşulla çalışmaya devam eder; kart koyu mavi operasyon rengiyle ayrıldı. Cüzdan bakiyesi, güven göstergesi, kredi mağazası ve finans değerleri daha okunur bir hiyerarşiye geçirildi. Yeni Lansman, Mesajlar ve Destek eylemleri kendi anlamlarına uygun mavi, lacivert ve yeşil yüzeyler kullanır.

Lansmanlar bölümündeki başlık, filtreler ve proje kartları aynı tasarım sistemine uyarlandı. Seçili filtre dolu mavi yüzeyle görünür; bekleyen durumu seçili değilken altın renkli uyarı tonunu korur. Mobil ve geniş ekran kolon davranışı ile tüm dokunma ve navigasyon işlemleri değişmeden bırakıldı.

Doğrulama: TypeScript kontrolü ve Expo web export başarılıdır.

Güvenlik kontrolü: Değişiklik profil ekranının JSX ve stil katmanındadır. Profil yükleme/kaydetme, avatar yükleme, cüzdan verisi, admin rol kontrolü, bildirimler ve proje servisleri değiştirilmedi. Yeni veri alanı, secret, RPC, upload türü, dış URL veya log eklenmedi. Yeni güvenlik bulgusu yok; production yayını veya public test tüneli açılmadı.

Geri alma: `ProfileAndWalletScreen.tsx` içindeki `PROFILE_GRADIENT`, `WALLET_GRADIENT`, profil/cüzdan dekoratif yüzeyleri ve ilgili profil, hızlı aksiyon, filtre ve proje kartı stillerini önceki değerlerine döndürün. Servis veya veri katmanında geri alma gerekmez.

## Web zemini ve rozet tipografisi

Geniş web görünümünde profil ekranını çevreleyen açık buz mavisi katman kaldırıldı ve sayfa zemini beyaza geçirildi. Kartların kendi düşük yoğunluklu mavi tonları korunarak masaüstünde iç içe panel görünümü azaltıldı. Mobil görünümde mevcut açık mavi zemin devam eder.

Küçük arayüz etiketlerinde sistem yazı ailesi açıkça tanımlandı. Özellikle rozet önizlemesindeki 7–8 piksel, çok kalın ve tamamı büyük harf olan metinler büyütülüp orta ağırlığa indirildi. `Featured on`, `Kıstas` ve `Top Project` başlık biçiminde gösterilir; Top Project ifadesi altın tonlu, yumuşak bir durum kapsülüne taşındı. Profil, cüzdan, hızlı eylem ve filtre etiketleri de aynı okunaklı ağırlık düzenini kullanır.

Güvenlik kontrolü: Değişiklik yalnızca sunum, responsive zemin ve tipografi stillerindedir. Veri, servis, rol, cüzdan, kullanıcı girdisi, dış URL veya yetkilendirme davranışı değişmedi.

`Hesap ve araçlar` bölüm başlığındaki küçük, çok kalın ve tamamı büyük harf görünümü kaldırıldı; 16 piksel, orta kalınlıkta başlık biçimine geçirildi. Destek kartının ana başlığı da diğer küçük etiketlerden ayrılarak 13,5 piksel ve `700` ağırlıkla daha doğal hale getirildi.
