# CODEX İÇİN UI/UX DİREKTİFİ & TASARIM REVİZYON PROMPTU

Aşağıdaki promptu kopyalayıp doğrudan Codex modeline iletebilirsiniz. Codex'in bağlamı şişirmeden, sadece belirlenen tasarım standartlarına odaklanarak çalışmasını sağlayacak şekilde hazırlanmıştır.

---

```markdown
Rol: Kıdemli Mobil UI/UX Tasarımcısı ve React Native Stil Uzmanı.
Proje: Kıstas - Mobil Odaklı "App & Dijital Proje Tanıtım ve Keşif Vitrini" (Product Hunt + App Store + Organik Keşif Hibriti).

Bağlam & Mevcut Durum:
Projenin backend'i, Supabase canlı veritabanı, RLS güvenlik politikaları ve dijital proje mimarisi (Clean Architecture) tamamlanmıştır.
Proje dizini ve aktif durum haritası: `PROJECT_MAP.md` ve `docs/ROADMAP_STATUS.md`.
Tasarım tokenları: `src/core/theme/colors.ts` ve `src/core/theme/spacing.ts`.

GÖREV:
Uygulamanın mevcut çalışan iş mantığına (business logic) ve servis çağrılarına dokunmadan, UI/UX tasarımını piyasadaki en lüks, akıcı ve fütüristik standartlara (Cyber-Luxury Obsidian Dark + Product Hunt Upvote & App Store Showcase zarafeti) yükseltmek.

UYGULANACAK TASARIM İLKELERİ:
1. Görsel Dil (Cyber-Luxury Obsidian Dark):
   - Derin Gece Siyahı (`#070A12`), Koyu Kristal Slate (`#0F172A`) ve Electric Indigo (`#6366F1`) / Neon Cyan (`#38BDF8`) ışıltı dengesi.
   - Öne çıkan sponsorlu (Boost) projelerde altın sarısı (`#F59E0B`) parıltılı çerçeveler.
   - Cam efekti (Glassmorphism): Yarı saydam koyu cam paneller (`rgba(15, 23, 42, 0.82)`) ve ince kristal kenarlıklar (`rgba(148, 163, 184, 0.16)`).
   - Tipografi: Başlıklar ultra parlak beyaz (`#F8FAFC`), gövde açık gümüş (`#CBD5E1`), açıklamalar duman grisi (`#94A3B8`).

2. Odaklanılacak Ekranlar & Bileşenler:
   - `src/features/listings/presentation/DiscoverScreen.tsx`: Product Hunt stili interaktif Upvote butonu (▲ 384), yuvarlak köşeli parlak uygulama ikonları, platform rozetleri ([iOS], [Android], [Web]) ve mağazaya doğrudan yönlendiren indirme butonları.
   - `src/features/listings/presentation/CreateListingScreen.tsx`: "Projeni / Uygulamanı Tanıt (Lansman Yap)" formunda dikey ekran görüntüsü (4:5) karuseli, platform seçici hapları ve kupon kodu alanları.
   - `src/features/chat/presentation/ChatScreen.tsx`: Geliştiriciyle yatırımcı, test kullanıcısı ve iş birliği mesajlaşma baloncukları.
   - `src/features/profile/presentation/ProfileAndWalletScreen.tsx`: Maker (Geliştirici) profili, vitrinde yayınlanan projeler, kazanılan toplam destek sayısı ve Sponsorlu Vitrin kredisi cüzdanı.
   - `src/shared/components/MobileBottomNav.tsx`: Yarı saydam koyu cam alt bar, parıldayan aktif neon sekme göstergeleri ve ortada parlayan [+ Lansman Yap] butonu.

3. Kural & Kısıtlamalar:
   - TypeScript tip güvenliğini bozma (`npm run lint` daima 0 hata vermelidir).
   - İş mantığını (Service ve Domain çağrılarını) silme veya değiştirme.
   - Kodları şişirmeden, component tabanlı ve temiz React Native StyleSheet kurallarıyla yaz.
```
