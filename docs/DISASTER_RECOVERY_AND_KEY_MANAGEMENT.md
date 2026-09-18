# KISTAS — FELAKET KURTARMA & GİZLİ ANAHTAR YÖNETİMİ (B9 & B10 KILAVUZU)

> **Belge No:** SEC-B9-B10-v1.0  
> **Kapsam:** Pars DevState Bank-Grade Framework (B9 Disaster Recovery & B10 Key Management)  
> **Hedef:** Sıfır Veri Kaybı, Kesintisiz İş Sürekliliği ve Kriptografik Anahtar Bütünlüğü

---

## 1. B9 — FELAKET KURTARMA & İŞ SÜREKLİLİĞİ PLANI (DRP)

### 1.1. Kritik Metrikler ve Hedefler
KISTAS platformu finansal ve vitrin işlemleri barındırdığından, felaket hedefleri banka standardında belirlenmiştir:

| Metrik | Anlamı | KISTAS Hedefi | Gerçekleşme Yolu |
|---|---|---|---|
| **RPO (Recovery Point Objective)** | Kabul edilebilir maksimum veri kaybı süresi | **< 1 Saat** | Supabase sürekli WAL/PITR günlüğü + Periyodik ZIP yedekleri |
| **RTO (Recovery Time Objective)** | Felaket anında sistemin yeniden ayağa kalkma süresi | **< 30 Dakika** | Otomatik migration zinciri + Bağımsız yedek deposu |

---

### 1.2. Yedekleme Mimarisi ve Depolama Standartları
1. **Kaynak Kod ve Migration Yedekleri:**
   - Proje kök dizinindeki `scripts/create-backup.ps1` scripti çalıştırılarak `backups/KISTAS_backup_YYYY-MM-DD_HH-mm.zip` formatında tam arşiv alınır.
   - Dahil Edilenler: `src/`, `assets/`, `supabase/`, `docs/`, `scripts/`, `PARSRAPOR/`, `App.tsx`, `package.json`, `.env`.
   - Hariç Tutulanlar: `node_modules/`, `.expo/`, geçici dosyalar ve test artıkları (Zero Dead-Code).
2. **Veritabanı PITR (Point-in-Time Recovery):**
   - Supabase Pro altyapısında veritabanı her saniye WAL (Write-Ahead Logging) ile kaydedilir.
   - Herhangi bir veri bozulması veya insan hatasında son 7 günün istenen dakikasına ve saniyesine tek tıkla dönülebilir.

---

### 1.3. Geri Dönüş Tatbikatı (Restore Runbook)
Felaket anında sistemi sıfırdan ayağa kaldırma adımları:
1. **Adım 1 (Arşivden Açma):** `backups/` altındaki son sağlam ZIP yedeğini temiz bir klasöre açın.
2. **Adım 2 (Bağımlılıkların Kurulumu):** `npm install` komutunu çalıştırın.
3. **Adım 3 (Veritabanı Restorasyonu):**
   - Supabase Dashboard -> **Settings** -> **Database** -> **Backups** sekmesinden ilgili PITR zamanına geri yükleme yapın.
   - Veya yeni bir veritabanı açıldıysa, `supabase/migrations/FAZ17_CONSOLIDATED_BANK_GRADE_MIGRATION.sql` dosyasını SQL Editor üzerinden 'Run' edin.
4. **Adım 4 (Kale Kontrolü):** `node scripts/system-check.mjs` komutunu çalıştırarak tüm 8 savunma kalkanının (%100 Sağlık Puanı) yeşil olduğunu doğrulayın.

---

## 2. B10 — GİZLİ ANAHTAR YÖNETİMİ & ROTASYON PROTOKOLÜ

### 2.1. Anahtar Envanteri ve Ayrım İlkeleri (Key Segregation)

| Anahtar | Bulunduğu Yer | Rol / Kapsam | İstemci Erişimi | Rotasyon Sıklığı |
|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env`, İstemci | API Gateway URL'i | Açık (Public) | Altyapı değişimi |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env`, İstemci | RLS sınırında Anon / Public istekler | Açık (Public) | 180 Gün / İhlal |
| `SUPABASE_SERVICE_ROLE_KEY` | Yalnızca Sunucu / Vault | Veritabanı Admin / Bypass RLS | **KESİNLİKLE YASAK** | 90 Gün / İhlal |
| `SHOPIER_API_KEY` & `SECRET` | Yalnızca Edge Function | Ödeme başlatma / callback imza | **KESİNLİKLE YASAK** | 90 Gün / İhlal |
| `app.settings.encryption_key` | DB Settings / Vault | B1 Saha düzeyinde AES-256 şifreleme | **KESİNLİKLE YASAK** | Yıllık / İhlal |

---

### 2.2. Acil Durum Anahtar İhlali Protokolü (Compromised Key Response)
Eğer bir gizli anahtar (service_role veya ödeme sırrı) açık bir repoya, loga veya üçüncü tarafa sızarsa:

```
[Sızıntı Tespiti] 
       │
       ▼
1. Derhal İptal (Revoke): Sağlayıcı panelinden (Supabase / Shopier) anahtar 1 dakika içinde iptal edilir.
       │
       ▼
2. Yeni Anahtar Üretimi: Sağlayıcıdan yeni güçlü (32+ karakter) anahtar üretilir.
       │
       ▼
3. Ortam Değişkenleri: Güvenli sunucuda / Edge Function'da yeni anahtar güncellenir.
       │
       ▼
4. Oturum Feshi (Kill Switch): Supabase üzerinden 'revoke_user_sessions' tetiklenerek şüpheli oturumlar kapatılır.
       │
       ▼
5. Denetim & İnceleme: Anomaly_events ve financial_audit kayıtları taranarak sızıntı esnasında yetkisiz işlem yapılıp yapılmadığı doğrulanır.
```

---

### 2.3. Planlı Anahtar Rotasyonu Adımları
1. **Supabase Anon & Service Role Rotasyonu:**
   - Supabase Dashboard -> **Project Settings** -> **API** -> **JWT Settings** -> `Generate new JWT secret`.
   - İlgili yeni `anon` ve `service_role` anahtarları kopyalanır.
   - `.env` güncellenir, yeni mobil/web paketi build edilir.
2. **Kasa (B1) Şifreleme Anahtarı Rotasyonu:**
   - Veritabanı `app.settings.encryption_key` ayarı güncellenmeden önce, eski anahtarla şifreli `user_vault_records` verileri geçici bellekte deşifre edilip yeni anahtarla yeniden şifrelenir (Re-encryption Migration).
