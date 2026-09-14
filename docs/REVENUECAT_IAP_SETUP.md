# Kıstas Mobil Kredi Ödemeleri — Sandbox Kurulumu

Kıstas kredileri uygulama içinde tüketilen dijital ürünlerdir. iOS satın almaları Apple
In-App Purchase, Android satın almaları Google Play Billing üzerinden çalışır. RevenueCat
iki mağazanın doğrulama katmanıdır; kredi bakiyesinin doğruluk kaynağı Supabase'tir.

## 1. Mağaza ürünleri

İlk uçtan uca test için yalnız `kistas_credits_100` ürününü oluşturmak yeterlidir. Akış
doğrulandıktan sonra aynı türde diğer iki ürün açılır.

| Product ID | Tür | Kredi |
| --- | --- | ---: |
| `kistas_credits_100` | Consumable / one-time in-app product | 100 |
| `kistas_credits_350` | Consumable / one-time in-app product | 350 |
| `kistas_credits_1000` | Consumable / one-time in-app product | 1000 |

- Apple bundle ID ve Google package name: `com.kistas.mobile`
- Ürünlerin fiyatı uygulamada sabitlenmez; App Store/Play Store yerel fiyatı gösterilir.
- Kredi ürünleri süreli değildir. Satın alınan kredi sona erdirilmez.

## 2. RevenueCat

1. RevenueCat projesine App Store ve Play Store uygulamalarını ekleyin.
2. Mağaza kimlik bilgilerini ve Apple In-App Purchase Key'i RevenueCat panelinde bağlayın.
3. `KCR` koduyla, süresi dolmayan bir in-app currency oluşturun.
4. Mağaza ürünlerini içe aktarın ve yukarıdaki kredi miktarlarını product grant olarak eşleyin.
5. Platform public SDK key'lerini mobil `.env` dosyasına koyun:

```dotenv
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
```

RevenueCat secret key veya webhook secret hiçbir zaman `EXPO_PUBLIC_*` değişkenine konmaz.

## 3. Supabase

Migration ve Edge Function'ı canlı projeye uygulayın:

```powershell
npx supabase db push
npx supabase functions deploy revenuecat-credit-webhook --no-verify-jwt
```

Uzun, rastgele bir webhook secret üretip Supabase secret olarak tanımlayın:

```powershell
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET="YOUR_RANDOM_SECRET"
npx supabase secrets set REVENUECAT_CREDIT_CURRENCY_CODE="KCR"
```

RevenueCat webhook adresi:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/revenuecat-credit-webhook
```

RevenueCat panelindeki webhook Authorization header değeri şu formatta olmalıdır:

```text
Bearer YOUR_RANDOM_SECRET
```

Webhook olaylarında `VIRTUAL_CURRENCY_TRANSACTION` etkinleştirilir. Fonksiyon yalnız
`source=in_app_purchase`, `currency=KCR`, izin verilen product ID ve doğru kredi tutarlarını
kabul eder. Aynı RevenueCat event ID ikinci kez bakiye değiştiremez.

## 4. Test sırası

1. Migration ve Edge Function deploy edilir; webhook test isteği `200` dönmelidir.
2. iOS Sandbox / Google internal testing hesabı hazırlanır.
3. IAP native modül gerektirdiği için Expo Go yerine EAS development build kullanılır.
4. 100 kredi satın alınır; `credit_purchase_events`, `credit_transactions` ve
   `profiles.boost_credits` tek işlem olarak kontrol edilir.
5. Aynı webhook yeniden gönderilir; bakiye değişmemelidir.
6. Kullanıcı iptali ve pending purchase kredi üretmemelidir.
7. Sandbox iadesi negatif hareket oluşturmalı; bakiye sıfırın altına düşmemelidir.

Canlı ödeme, mağaza sözleşmeleri/banka-vergi bilgileri ve GVK 20/B uygunluğu tamamlanmadan
açılmamalıdır.
