# KISTAS kategori görselleri — 1. Aile

2026-09-09

İlk kategori tek tek tasarım çalışması kapsamında yenilendi. Yerleşik image_gen kullanıldı.

Dosya: assets/categories/icons/game-family-v2.png
Önceki görsel: assets/categories/icons/game-family.png (korundu).

Stil: özgün üç oyun karakteri, kayısı/lavanta/nane paleti, kobalt aksesuarlar, kısa kadife kürk ve emaye zar, yönlü stüdyo ışığı, transparan arka plan. Güncel kapsam ve ortak boyut standardı aşağıdadır.

## 2. Aksiyon ve ortak boyut standardı

Aksiyon dosyası: assets/categories/icons/game-action-v2.png. Yerleşik image_gen kullanıldı; eski game-action.png korundu. Aile ve Aksiyon yenilendi, diğer 36 kategori henüz yenilenmedi.

Kullanıcının onayladığı Aile boyutu bundan sonraki tasarımların standardıdır: mobilde 87 × 87, geniş web görünümünde 102 × 102 piksel. BrowseScreen.tsx içindeki customArtwork/customArtworkWeb/customIcon ortak stilleri kullanılır. Transparan arka plan, kompakt siluet ve küçük boyutta okunabilirlik esastır.

Geri alma: game-action.png referansını geri getirin ve hasCustomArtwork koşulundan game-action kimliğini kaldırın. Aile için de aynı yöntem geçerlidir; önceki familyArtwork stillerinin adı artık customArtwork olarak güncellendi.

Güvenlik kontrolü: yalnızca yerel görsel ve sunum stilleri değişti. Yeni dış servis çağrısı, URL, veri akışı, yetki, giriş, upload veya secret/log eklenmedi.

### Aksiyon üretim promptu

Use case: stylized-concept.
Asset type: original KISTAS discovery category icon, ACTION GAMES, premium 3D videogame inventory art.
Primary request: one spectacular compact stylized armored power gauntlet clenched into a fist, punching diagonally upward toward the viewer in 3/4 perspective, the unmistakable silhouette of four armored knuckles, thumb correctly curled outside fingers, short wrist cuff fully visible, no arm or person. Rich cobalt-blue enamel armor plates, finely brushed warm champagne-gold bevels, dark navy flexible joints, a single luminous icy-cyan power core on the back of the hand. A small sculptural cyan lightning swoosh tightly wraps behind the wrist and emerges beside the fist, integrating into the compact silhouette. Dynamic, powerful, playful high-budget videogame asset, meticulous appealing chunky geometry, beautifully modeled forms and bevels, subtle surface texture, physically convincing reflections, cinematic warm key light upper left and cool edge lighting. As sophisticated and tactile as a premium animated movie/game collectible.
Composition: square canvas, single centered tightly integrated icon, fills 86-90 percent of canvas, clear silhouette at 87px display size; whole object visible, balanced visual weight, strong bright edges against a coral-red UI card. Slight perspective foreshortening, visual focus on fist. Do not make a long narrow icon.
Background: genuine transparent alpha, pristine clean antialiased cutout, no white matte or halo, no ground, no cast shadow beyond object, no checkerboard, no gradient background.
Constraints: original design, no brand or franchise symbols, no lettering, no watermark, no blood, no guns, no border, no circular badge, no pedestal, no extra disconnected objects. Avoid excessive particles, fine tiny details, flat clipart, hazy bloom. Final production artwork, not a mockup.


Geri alma: category3dIcons.ts içinde game-family.png referansını geri getirip BrowseScreen.tsx içindeki familyArtwork/familyIcon stillerini ve koşullarını kaldırın.

Güvenlik kontrolü: yalnızca yerel statik görsel referansı ve sunum stilleri değişti. Yeni veri, kimlik/rol işlemi, RPC, kullanıcı girdisi, upload, dış URL, credential veya log eklenmedi. SECURITY_ROADMAP.md zorunlu kontrol listesi bu kapsamda değerlendirildi.

## Üretim promptu

Use case: stylized-concept.
Asset type: KISTAS mobile discovery category icon, first asset of an original premium 3D game-like icon family.
Primary request: Design the FAMILY GAMES category as an exceptionally polished original 3D collectible game asset: a close-knit trio of friendly fantastical woodland creatures, two larger rounded creatures and one small creature centered forward, joyfully leaning together around a single chunky ivory game die. They must feel like actual charming high-budget videogame characters, with expressive clear eyes, sculpted tiny ears, confident appealing silhouettes, carefully art-directed proportions. One warm apricot creature, one lavender creature, one small mint creature; tiny coherent cobalt enamel accessory details unify the set. The die has recessed dark blue circular pips, plausible geometry.
Style: premium stylized cinematic 3D, rich tactile finely groomed short velvet fur contrasted against smooth enamel die, beautifully modeled forms, sophisticated warm key lighting upper left, cool rim light, soft ambient occlusion only between forms. Not stock clipart.
Composition: one tightly integrated compact triangular icon cluster, 3/4 view, entire silhouettes in frame with 8 percent transparent padding. Fills canvas, legible at 100px. No extra floating decorations or scene.
Background: genuinely transparent alpha background, no white background, no white halo, no baked checkerboard, no ground plane, no cast shadow outside the objects.
Constraints: square image, no lettering, no logos, no watermark, no border, no circular badge, no pedestal, no house, no hearts. Original characters, no existing franchise characters. Meticulous clean anti-aliased alpha edges.

## Ortak hizalama güncellemesi
Tüm kategoriler artworkPlate/artworkPlateWeb içinde mobil 87, web 102 piksel boyutunda gösterilir. Üst boşluk 12; sağ boşluk mobil 14, web 16 pikseldir. Daire, çerçeve ve plaka gölgesi kaldırıldı. Önceki customArtwork istisnası kaldırıldı; yeni ikonlar aynı ortak yerleşimi kullanır. Yalnızca sunum değişti; yeni veri veya yetki akışı yoktur. Web export başarılı.

