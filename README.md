# FitZone Pro 🏋️ — موقع جيم مصري كامل (Next.js 16 + Tailwind v4)

صفحة هبوط عربية (RTL) بجهاز اشتراكات كامل وشغّالة من غير أي باك-إند: بناء باقة، كوبونات،
ضريبة، تشيك أوت متعدد الخطوات فيه **طبقة دفع بسلوك حقيقي (وضع تجريبي)**، كارت عضوية رقمي،
حجوزات، حاسبات لياقة، وقصص قبل/بعد.

## التشغيل

```bash
npm install
npm run dev        # http://localhost:3000 (بيسمع على 0.0.0.0 للمعاينات الخارجية)
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## إيه الجديد

| الحاجة | التفاصيل |
| --- | --- |
| اشتراكات كاملة | باقة (أساسي/برو/VIP) + مدة (شهري/٣/٦/١٢ شهر) + إضافات + كود خصم + حساب ض.ق.م ١٤٪ + توفير مقارنة بالشهري |
| تشيك أوت | 4 خطوات: مراجعة ← بياناتك ← طريقة الدفع (فيزا/محفظة/تقسيط/كاش) ← نجاح برقم طلب وكارت عضوية |
| 💳 دفع واقعي (تجريبي) | فحص Luhn حرفي، اكتشاف نوع الكارت (Visa/Mastercard/Amex/**mada**)، ٣‑D Secure بخطوة OTP، حالات رفض البنك، وإيماءة «جاري الاتصال بالبنك» |
| لوحة «عضويتي» | كارت رقمي بـ QR مبسّط، شريط تقدم الصلاحية، تجميد / استئناف / تجديد / إيقاف تجديد تلقائي، كود إحالة، كلاساتي، طلباتي |
| آراء حقيقية | قصص نجاح بصوت بشري مصري + حائط ٦ ريفيهات بتواريخ وخطط وتقييمات ٣ و٤ نجمة مش كلها ٥ |
| قبل/بعد | صور تحول حقيقية بسلايدر سحب من اليمين + نبضة على المقبض لحد ما المستخدم يلمسه |
| تفاعلات | Toasts، شريط تقدم السكرول، النافبار بيتابع القسم النشط، مفضّلين، حجز مكان في كلاس، جدول يوم/أسبوع، لايت بوكس بالكي بورد والسوايب، بحث في الأسئلة الشائعة |
| حاسبات حيّة | BMI بمقياس ملوّن + وزن صحي، TDEE + ماكروز برسم دائري، أقصى وزن 1RM، حاسبة المياه |
| بلاك إند | `app/api/{bookings,subscribe,pay,pay/confirm}` + طبقة `app/lib/api.ts` + بروكسي `BACKEND_URL` لباك إندك الخارجي |
| حفظ الحالة | `localStorage` عبر `useSyncExternalStore` → شغّال مع hydration، ومتزامن بين التبويبات، من غير فلاش |

## 💳 تجربة الدفع (بدون فلوس حقيقية)

الدفع **وضع تجريبي (Sandbox)** — مفيش شركة دفع حقيقية ولا فلوس بتتحرك، ومفيش رقم كارت
بيتخزن أو بيتبعت لأي حاجة. كل التحقق شغال زي الحقيقي:

| الكارت | النتيجة |
| --- | --- |
| `4242 4242 4242 4242` | يفتح خطوة **3‑D Secure** — أي 6 أرقام تنفع (`000000` = رمز غلط) |
| `5555 5555 5555 4444` | Mastercard نجاح مباشر |
| `4000 0000 0000 0002` | البنك رفض `card_declined` |
| `4000 0000 0000 9995` | رفض `insufficient_funds` (الرصيد لا يكفي) |
| أي رقم يفشل فحص Luhn | مرفوض فورًا تحت الرقم نفسه، والـ submit بيتقفل |
| `5080 …` / `9201 …` | بيتعرف كـ **mada** في الشعار والـ preview |

في التشيك أوت فيه صندوق **كروت للاختبار** — تضغط على أي كارت يتحقن في الخانات. المنطق كله في:

- `app/lib/payment.ts` — Luhn، أنواع الكروت، فساد تاريخ الانتهاء، طبقة `authorize`/`confirmPayment`.
- `app/api/pay/route.ts` + `app/api/pay/confirm/route.ts` — قرار البنك، مرجع العملية، و OTP.

> للربط الحقيقي: حط `NEXT_PUBLIC_PAYMENT_PROVIDER=paymob|fawry|stripe` + `NEXT_PUBLIC_PAYMENT_SECRET=...`
> وبدّل جسم الدالتين فوق بنداءات البوابة — شكل `PayResult` ثابت فالواجهة كلها من غير تعديل.

## 🔌 ربط الباك إند (اللي هترفعه انت)

كل نداءات السيرفر بتخرج من ملف واحد: **`app/lib/api.ts`** (`apiFetch` + `ENDPOINTS`).
مفيش `fetch` مبعثر في الكومبوننتات، فقصديًا مفيش شغل واجهات وقت الربط.

| المتغير (في `.env.local`) | بيعمل إيه |
| --- | --- |
| `BACKEND_URL=http://127.0.0.1:8000` | كل الطلبات على `/api/*` بتتوجه لباك إندك **قبل** هاندلرات نكست (`next.config.ts` → `rewrites.beforeFiles`) |
| `BACKEND_ONLY=bookings,subscribe,pay` | يسيّب باقي المسارات لهاندلرات نكست (لأن `pay` جواه state للـ 3DS) |
| `NEXT_PUBLIC_API_BASE=https://api...` | النداء يطلع للـ باك إند مباشرة من المتصفح (يحتاج CORS) |
| `BACKEND_URL` + `NEXT_PUBLIC_API_BASE` فاضيين | الموقع بيشتغل كامل على هاندلرات نكست — للعرض للعميل |

**خطوات لما ترفع الباك إند:**

1. الحقه في مجلد **بجانب** المشروع (`../fitzone-api`) أو ريبو منفصل — متحطوش جوّه
   `gym-fitness` عشان الـ build مالوش داعي يشيله. لو Laravel: `php artisan serve --port=8000`.
2. `echo 'BACKEND_URL=http://127.0.0.1:8000' > .env.local` وأعد تشغيل `npm run dev`.
3. اختبر العقد من `:3000` — الأمر الثلاثة آخر `docs/BACKEND-CONTRACT.md` لازم يعدّوا.
4. أي `fields: { name: "...", phone: "..." }` بترجعها على 422 بتظهر تحت الحقل نفسه في
   الفورم أوتوماتيك، فمفيش شغل فرونت مطلوب.
5. عايز تشوف السكة شغالة دلوقتي من غير ما ترفع حاجة؟ شغّل الباك إند الوهمي:

   ```bash
   node scripts/mock-backend.mjs                     # يسمع على :8000
   echo 'BACKEND_URL=http://127.0.0.1:8000' > .env.local
   ```

   بينفّذ العقد كله (حجز/اشتراك/دفع/3DS/422) في ميموري، فيصلح مرجع تقارن بيها ردودك.

**العقد بالتفصيل (طلبات/ردود، 422 حقول الغلط، كود Laravel، SQL الجداول، CORS، Idempotency):**
👉 [`docs/BACKEND-CONTRACT.md`](docs/BACKEND-CONTRACT.md)

> أمان: في وضع التجربة الكروت بتعدي على `/api/pay` جوّه نفس السيرفر ومش بتتخزن خالص.
> في باك إندك الحقيقي: ابعت الرقم للبوابة من السيرفر بس، ارفض أي رقم مش Luhn-valid،
> ما تعملش log للطلب كله، واعمل idempotency بمفتاح `orderId`/`id` اللي بيولده العميل.

## 🗂️ تقسيم الملفات

```
app/
  layout.tsx            metadata + fonts + ToastProvider + GymProvider
  page.tsx              تركيب السكاشن (server component)
  globals.css           Tailwind v4 @theme (لون البراند) + أنيميشنات + ستايل السلايدرز
  api/
    bookings/route.ts   GET/POST حجز جلسة + validateBooking()
    subscribe/route.ts  GET/POST تفعيل اشتراك + إيراد/توزيع الباقات
    pay/route.ts        POST حجز عملية دفع (Luhn/رفض بنك/3DS) + GET health
    pay/confirm/route.ts POST تأكيد الـ OTP
  components/
    Navbar Hero Amenities Trainers Schedule Pricing Tools Gallery
    Testimonials Faq Booking Footer(+FloatingActions) MemberPanel Checkout
    ui/{Bits,Overlay,Toast}
  lib/
    api.ts              🎛️ نقطة الخروج الوحيدة لكل نداءات السيرفر
    data.ts             كل المحتوى (باقات، إضافات، كوبونات، جداول، صور، قصص)
    payment.ts          Luhn + أنواع الكروت + validateCard + TEST_CARDS + authorize/confirm
    subscription.ts     محرك الأسعار + نوع Membership + كود الكارت
    store.tsx           GymProvider: سلة الاشتراك، العضوية، المفضلات، الحجوزات
    storage.ts          usePersistentState / useClock / useHydrated
    utils.ts            egp()، fmtDate()، isEGPhone()، cx()…
docs/BACKEND-CONTRACT.md  عقد الربط + SQL + كود Laravel + اختبارات
public/images/           hero + جيم + كوتشات + 6 صور قبل/بعد (1280×720)
scripts/make-trainer-crops.mjs    قص صور الكوتشات
scripts/make-transform-pairs.mjs  توحيد مقاسات صور قبل/بعد
scripts/mock-backend.mjs          باك إند وهمي بنفس العقد
```

## عشان يبقى إنتاج حقيقي

1. **قاعدة بيانات**: `app/api/*/route.ts` بيخزن حاليًا in-memory؛ بدّل السطر ده بالاستعلام
   بتاعكم (MySQL/Postgres) — الواجهة مش محتاجة تعديل.
2. **بوابة دفع فعلية**: `NEXT_PUBLIC_PAYMENT_PROVIDER=paymob|fawry|stripe` + `authorize()`/`confirmPayment()`.
3. **الأرقام والروابط**: `app/lib/data.ts` → `GYM` (واتساب، تليفون، إيميل، عنوان، ميعاد الشغل) و`COUPONS` و`ADDONS`.
4. **دومين الـ OG**: `NEXT_PUBLIC_SITE_URL` في البيئة عشان `metadataBase`.
5. **لوحة تحكم للادمن**: `GET /api/bookings` و`GET /api/subscribe` بيرجعوا صف/إيراد/توزيع الباقات —
   تنفع أساس لداشبورد بسيط.

> ملاحظة: مجلد `gym-fitness/` الفارغ اللي جوّه الروت هو gitlink قديم (ريبو جوّه ريبو) من الكوميت الأصلي — سيبناه زي ما هو.
