# FitZone Pro 🏋️ — جيم ولياقة (Next.js 16 + Tailwind v4)

صفحة هبوط عربية (RTL) لجيم، فيها **نظام اشتراكات كامل** يعمل من غير باك-إند خارجي: بناء باقة، كوبونات، ضريبة، تشيك أوت متعدد الخطوات، كارت عضوية رقمي، كلاسات، وحاسبات لياقة.

## التشغيل

```bash
npm install
npm run dev        # http://localhost:3000  (بيمنع على 0.0.0.0 عشان المعاينات الخارجية)
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## إيه الجديد

| الحاجة | التفاصيل |
| --- | --- |
| اشتراكات كاملة | باقة (أساسي/برو/VIP) + مدة (شهري/٣/٦/١٢ شهر) + إضافات + كود خصم + حساب ض.ق.م ١٤٪ + توفير مقارنة بالشهري |
| تشيك أوت | نافذة من 3 خطوات: مراجعة ← بياناتك ← طريقة الدفع (فيزا / محفظة / تقسيط / كاش) + شاشة نجاح برقم طلب وكارت عضوية |
| لوحة «عضويتي» | كارت رقمي بـ QR مبسّط، شريط تقدم الصلاحية، **تجميد / استئناف / تجديد / إيقاف تجديد تلقائي**، كود إحالة، كلاساتي، طلباتي |
| تفاعلات | Toasts، شريط تقدم السكرول، النافبار بيتابع القسم النشط، مفضّلين للكوتشات، حجز مكان في كلاس مع عداد الأماكن، جدول يوم/أسبوع، لايت بوكس بالكي بورد والسوايب، سلايدر «قبل وبعد» بالسحب، كروسيل قصص نجاح بالسحب وأوتوبلاي، بحث في الأسئلة الشائعة |
| حاسبات حيّة | BMI بمقياس ملوّن + وزن صحي، TDEE + ماكروز برسم دائري، أقصى وزن 1RM بجدول نسب، حاسبة المياه |
| بلاك إند | `POST/GET /api/bookings` و `POST/GET /api/subscribe` (Route Handlers) مع تحقّق (validation) للبيانات — بدل رابط `127.0.0.1:8000` القديم |
| صور | كل الصور محلية في `public/images/` (اتولّدت للبراند) بعد ما كانت روابط Unsplash خارجية — والخط: Cairo (self-hosted من `@fontsource/cairo`) |
| حفظ الحالة | `localStorage` عبر `useSyncExternalStore` → شغّال مع hydration، ومتزامن بين التبويبات، من غير فلاش |

## 🗂️ تقسيم الملفات

```
app/
  layout.tsx            metadata + fonts + ToastProvider + GymProvider
  page.tsx              تركيب السكاشن (server component)
  globals.css           Tailwind v4 @theme (لون البراند) + أنيميشنات + ستايل السلايدرز
  api/
    bookings/route.ts   GET/POST حجز جلسة + validateBooking()
    subscribe/route.ts  GET/POST تفعيل اشتراك + إيراد/توزيع الباقات
  components/
    Navbar Hero Amenities Trainers Schedule Pricing Tools Gallery
    Testimonials Faq Booking Footer(+FloatingActions) MemberPanel Checkout
    ui/{Bits,Modal→Overlay,Toast}
  lib/
    data.ts             كل المحتوى (باقات، إضافات، كوبونات، جداول، صور…)
    subscription.ts     محرك الأسعار + نوع Membership + كود الكارت
    store.tsx           GymProvider: سلة الاشتراك، العضوية، المفضلات، الحجوزات
    storage.ts          usePersistentState / useClock / useHydrated
    utils.ts            egp()، fmtDate()، isEGPhone()، cx()…
public/images/          hero + جيم + كوتشات (4:5)
scripts/make-trainer-crops.mjs  تشغيل: `node scripts/make-trainer-crops.mjs`
```

## عشان يبقى إنتاج حقيقي

1. **الدفع**: الوصل بـ Paymob / Fawry / Stripe — `Checkout.tsx` فيه خطوة الدفع جاهزة للاستبدال، والبيانات الحساسة مش بتترسل أصلًا.
2. **قاعدة بيانات**: `app/api/*/route.ts` بيخزن حاليًا in-memory؛ بدّل السطر ده بالاستعلام بتاعكم (Laravel/MySQL أو Postgres) — الواجهة مش محتاجة تعديل.
3. **الأرقام والروابط**: `app/lib/data.ts` → `GYM` (واتساب، تليفون، إيميل، عنوان، ميعاد الشغل) و`COUPONS` و`ADDONS`.
4. **دومين الـ OG**: `NEXT_PUBLIC_SITE_URL` في البيئة عشان `metadataBase`.

> ملاحظة: مجلد `gym-fitness/` الفارغ اللي جوّه الروت هو gitlink قديم (ريبو جوّه ريبو) من الكوميت الأصلي — اتسابك زي ما هو، وممكن يمسح لو ده مقصود.
