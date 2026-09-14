# BUILD, GÜVENLİK VE MAĞAZA GEREKSİNİMLERİ (SECURITY & BUILD)

## 1. Akıllı Kimlik Doğrulama & SMS Maliyet Kalkanı
* **E-Posta & Şifre (0 TL Maliyet):** Kullanıcılar ilk kayıtlarını ve girişlerini e-posta ile tamamen ücretsiz yapar. Sırf vitrin gezecek kullanıcılara SMS maliyeti ödenmez.
* **Telefon Doğrulaması (Lazy / Yüksek Güvenlik):** İlan verme veya Escrow satın alma gibi kritik aşamalarda telefon onayı devreye girer.
* **0 TL Geliştirici Test Numaraları:** 
  * `0532 649 9700` (Kullanıcı numarası) ve `+905550001122` için geliştirme ortamında sabit kod `123456` tanımlıdır; telekom şebekesine gitmeden sıfır maliyetle test edilir.
  * Canlı ortamda ise BTK lisanslı yerel SMS sağlayıcısı (Netgsm / İletiMerkezi) ile SMS başı ~0.25 TL kuruş maliyetle çalışır.

## 2. Sosyal Girişler & App Store Uyumu
* **Apple & Google Entegrasyonu:**
  * İlerleyen aşamada Google girişi açıldığında App Store Guideline 4.8 gereğince Apple ile Giriş (`expo-apple-authentication`) zorunludur.
  * Şu an temel giriş E-posta + Telefon üzerinden kurulduğu için Apple herhangi bir zorunluluk dayatmaz.

## 3. Donanım Düzeyi Güvenlik & KVKK
* **iOS Keychain & Android Keystore:** Tokenlar ve şifreli oturum verileri `expo-secure-store` ile donanım düzeyinde saklanır.
* **KVKK Denetim İzi:** İlk kayıt anında aydınlatma ve açık rıza onayları `user_consents` tablosuna IP ve sürüm bilgisiyle kaydedilir.
