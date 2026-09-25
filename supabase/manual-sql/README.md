# Manuel SQL paketleri

Bu klasördeki konsolide SQL dosyaları tarihsel inceleme ve felaket kurtarma amacıyla korunur. Supabase CLI migration zincirinin parçası değildir.

- Mevcut canlı veritabanında doğrudan çalıştırılmaz.
- Normal şema değişiklikleri yalnız `supabase/migrations/<timestamp>_*.sql` dosyalarıyla yapılır.
- Yeni veya boş bir veritabanında kullanılmadan önce güncel migration zinciriyle çakışma denetimi yapılır.

Canlı migration geçmişi 25 Eylül 2026 tarihinde yerel zincirle uzlaştırılmıştır.
