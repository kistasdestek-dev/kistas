# Kıstas kimlik e-postaları

Bu dosyalar canlı Supabase Authentication > Emails > Templates ayarlarının kaynak kopyasıdır. GitHub veya Cloudflare Pages dağıtımı bu şablonları Supabase'e otomatik yüklemez; değişiklikleri ilgili Supabase şablonunun Subject ve Source alanlarına ayrıca kaydetmek gerekir.

| Supabase şablonu | Konu | Kaynak |
| --- | --- | --- |
| Reset password | `Kıstas | Şifreni yenile` | `recovery.html` |
| Confirm sign up | `Kıstas | E-posta adresini doğrula` | `confirmation.html` |

Her iki şablonda da tek işlem bağlantısı `{{ .ConfirmationURL }}` değişkenidir. Testte gerçek bağlantıyı veya token'ı dokümana, loga ya da sohbete kopyalama. Değişiklikten sonra Supabase önizlemesini ve gerçek bir e-posta gönderimini doğrula.
