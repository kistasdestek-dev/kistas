# Kıstas Zero Code Kontrolü

Her kod değişikliğinden önce bu sayfa kısaca okunur.

## Zorunlu kontrol

- Değiştirilen akıştaki eski handler, prop, import, stil ve yorumlar kaldırılır.
- Aynı işi yapan paralel veya legacy yapı bırakılmaz.
- Kullanılmayan bileşen, değişken, CSS sınıfı ve dosya tutulmaz.
- Yeni soyutlama yalnızca tekrar veya gerçek bakım ihtiyacı varsa eklenir.
- Kaldırılan davranışın erişilebilirlik rolleri ve test beklentileri de temizlenir.
- Değişiklikten sonra hedefli arama, TypeScript, lint ve ilgili regresyon testleri çalıştırılır.
- Kullanıcıya ait ilgisiz çalışma ağacı değişikliklerine dokunulmaz.

## Çıkış ölçütü

Değiştirilen bölgede eski ve yeni çözüm yan yana yaşamıyorsa, kullanılmayan iz kalmadıysa ve doğrulamalar temizse iş tamamlanır.
