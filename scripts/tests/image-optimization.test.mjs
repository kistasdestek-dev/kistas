import assert from 'node:assert/strict';
import { buildOptimizedImageUrl } from '../../src/core/media/imageDelivery.ts';
import { calculateContainedSize } from '../../src/core/media/optimizeUploadImage.ts';

const source = 'https://iojgqicgeztqwkbetboa.supabase.co/storage/v1/object/public/kistas/vitrin/example.png';
const optimized = buildOptimizedImageUrl(source, 640);
assert.equal(
  optimized,
  `https://www.kistas.com.tr/cdn-cgi/image/width=640,quality=76,format=auto,onerror=redirect/${source}`,
);
assert.equal(buildOptimizedImageUrl(source, 1)?.includes('width=32,'), true);
assert.equal(buildOptimizedImageUrl(source, 5000)?.includes('width=1600,'), true);
assert.equal(buildOptimizedImageUrl('https://attacker.example/image.png', 640), 'https://attacker.example/image.png');
assert.deepEqual(calculateContainedSize(1600, 900, 1280), { width: 1280, height: 720 });
assert.deepEqual(calculateContainedSize(500, 500, 512), { width: 500, height: 500 });

console.log('Image delivery and upload sizing checks passed.');
