/**
 * تعريفات الأصول الثابتة — بتخلي `npm run typecheck` يشتغل على clone نضيف
 * من غير ما يكون اتعمله build قبل كده (next-env.d.ts مش بيتعمله commit في Next 16).
 */
/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.mp4" {
  const src: string;
  export default src;
}
