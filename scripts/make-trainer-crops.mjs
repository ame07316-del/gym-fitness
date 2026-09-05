import sharp from "sharp";

const JOBS = [
  ["public/images/gym-classes.jpg", "public/images/trainer-3.jpg"],
  ["public/images/gym-boxing.jpg", "public/images/trainer-4.jpg"],
];

const GRADIENT = `<svg width="900" height="1125" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.30" stop-color="#07070a" stop-opacity="0"/>
      <stop offset="1" stop-color="#07070a" stop-opacity="0.92"/>
    </linearGradient>
    <radialGradient id="r" cx="0.5" cy="0.32" r="0.75">
      <stop offset="0.55" stop-color="#e11d2e" stop-opacity="0"/>
      <stop offset="1" stop-color="#e11d2e" stop-opacity="0.18"/>
    </radialGradient>
  </defs>
  <rect width="900" height="1125" fill="url(#g)"/>
  <rect width="900" height="1125" fill="url(#r)"/>
</svg>`;

(async () => {
  const overlay = await sharp(Buffer.from(GRADIENT)).png().toBuffer();
  for (const [src, out] of JOBS) {
    const m = await sharp(src).metadata();
    const tw = Math.min(m.width, Math.round((m.height * 4) / 5));
    const th = Math.round((tw * 5) / 4);
    await sharp(src)
      .extract({ left: Math.round((m.width - tw) / 2), top: Math.round((m.height - th) / 2), width: tw, height: th })
      .resize(900, 1125, { fit: "cover", position: "centre" })
      .modulate({ brightness: 0.97, saturation: 0.94 })
      .composite([{ input: overlay, top: 0, left: 0 }])
      .jpeg({ quality: 84 })
      .toFile(out);
    const o = await sharp(out).metadata();
    console.log(`${out}  ${o.width}x${o.height}  ${Math.round(o.size / 1024)}KB`);
  }
})();
