import sharp from "sharp";

/**
 * توحيد مقاس صور «قبل / بعد» لسلايدر المقارنة (16:9 مضبوط 1280×720)
 * عشان الصورة تتطبق على بعضها بالظبط أثناء السحب.
 * التشغيل: node scripts/make-transform-pairs.mjs
 */
const PAIRS = ["cut", "yoga", "bulk"];
const W = 1280;
const H = 720;

(async () => {
  for (const key of PAIRS) {
    for (const side of ["before", "after"]) {
      const file = `public/images/${side}-${key}.jpg`;
      const out = `public/images/${side}-${key}.opt.jpg`;
      await sharp(file)
        .resize(W, H, { fit: "cover", position: "centre" })
        .jpeg({ quality: 82, progressive: true })
        .toFile(out);
      const { rename, unlink } = await import("node:fs/promises");
      await unlink(file);
      await rename(out, file);
      const m = await sharp(file).metadata();
      console.log(`${file} → ${m.width}x${m.height}`);
    }
  }
})();
