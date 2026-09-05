# FitZone Pro 🏋️ — Arabic RTL gym site with a real subscription + payment flow

**EN:** Arabic-first (RTL) Next.js 16 app for a gym: plan builder with pricing engine, 4-step checkout, a **behaviourally realistic sandbox payment layer** (Luhn, brand detection incl. mada, 3‑D Secure OTP, bank decline codes), digital membership card with freeze/renew, class booking, fitness calculators, before/after slider — plus a documented single-file backend seam (`app/lib/api.ts`) so a Laravel/Node API plugs in with one env var.

**عربي:** صفحة هبوط عربية (RTL) لجيم، فيها نظام اشتراكات كامل وشغّال من غير باك-إند خارجي، مع طبقة دفع وضع تجريبي — **مفيش فلوس حقيقية ومفيش بيانات كروت بتتخزن**.

<br/>

<p align="center">
  <a href="https://github.com/ame07316-del/gym-fitness/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ame07316-del/gym-fitness/actions/workflows/ci.yml/badge.svg"></a>
  <a href="#"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript"></a>
  <a href="tests/"><img alt="Tests" src="https://img.shields.io/badge/vitest-49%20passing-6E9F18"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-All%20rights%20reserved-orange"></a>
</p>

| | |
| --- | --- |
| 🌍 **Live demo** | <https://gym-fitness-ame07316-5868s-projects.vercel.app> · لو طلب login اعمل [خطوة 1.5](docs/DEPLOY-VERCEL.md) |
| 🎬 **Walkthrough (90 ثانية)** | `_لينك Loom/YouTube_` |
| 📄 **عقد الباك إند** | [`docs/BACKEND-CONTRACT.md`](docs/BACKEND-CONTRACT.md) |
| ⚖️ **الرخصة** | All rights reserved — details in [LICENSE](LICENSE) |

## 📸 لقطات

> ارفع 6 لقطات في [`docs/screenshots/`](docs/screenshots/README.md) (المطلوب بالمقاسات والأسماء مكتوب هناك) وفك الكومنت تحت.

<!--
| | |
| --- | --- |
| ![](docs/screenshots/01-hero.jpg) | ![](docs/screenshots/03-checkout-card.jpg) |
| ![](docs/screenshots/05-member-card.jpg) | ![](docs/screenshots/06-before-after.jpg) |
-->

## ما الذي يُظهره هذا المشروع (English — for recruiters)

- **Pricing engine with 49 unit tests** — plan × cycle × add-ons × coupon rules (minimums, caps) × 14% Egyptian VAT, all money rounded to piasters in one place.
- **Payment UX without a gateway** — client-side Luhn + brand detection (Visa/Mastercard/Amex/**mada**), server-side decline simulation, 3-D Secure challenge step, per-field error mapping. Same contract as Stripe/Paymob, so the real switch is two function bodies.
- **Zero `fetch` scattered in components** — one `apiFetch` module + a `rewrites.beforeFiles` proxy: point `BACKEND_URL` at any Laravel/Node API and nothing else changes.
- **Field-level server validation in the UI** — a `422 { fields: { "member.phone": "…" } }` lands under the exact input automatically.
- **Arabic RTL done properly** — measured from the right, `dir="rtl"` scroll/anchor logic, self-hosted Cairo font (no external CDN that rots).
- **Clean console** — `useSyncExternalStore` for `localStorage` (hydration-safe, cross-tab), framer-motion hydration noise silenced, zero warnings in SSR logs.
- **CI** — `typecheck → lint → vitest → build` on every push/PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## التشغيل

```bash
nvm use                # Node 22 (راجع .nvmrc)
npm install
npm run dev            # http://localhost:3000 — بيسمع على 0.0.0.0 للمعاينات الخارجية
npm test               # 49 اختبار: محرك الأسعار + قواعد الكروت + عقد الـ API
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
```

## إيه الجديد

| الحاجة | التفاصيل |
| --- | --- |
| اشتراكات كاملة | باقة (أساسي/برو/VIP) + مدة (شهري/٣/٦/١٢ شهر) + إضافات + كود خصم + ض.ق.م ١٤٪ + توفير مقارنة بالشهري |
| تشيك أوت | 4 خطوات: مراجعة ← بياناتك ← طريقة الدفع (فيزا/محفظة/تقسيط/كاش) ← نجاح برقم طلب وكارت عضوية |
| 💳 دفع واقعي (تجريبي) | فحص Luhn، اكتشاف نوع الكارت (Visa/Mastercard/Amex/**mada**)، ٣‑D Secure بخطوة OTP، حالات رفض البنك، وإيماءة «جاري الاتصال بالبنك» |
| لوحة «عضويتي» | كارت رقمي بـ QR مبسّط، شريط تقدم الصلاحية، تجميد / استئناف / تجديد / إيقاف تجديد تلقائي، كود إحالة، كلاساتي، طلباتي |
| آراء حقيقية | قصص نجاح بصوت بشري مصري + حائط ٦ ريفيهات بتواريخ وخطط وتقييمات ٣ و٤ نجمة مش كلها ٥ |
| قبل/بعد | صور تحول (نفس الشخص/نفس الإضاءة) بسلايدر سحب من اليمين + نبضة على المقبض لحد ما المستخدم يلمسه |
| تفاعلات | Toasts، شريط تقدم السكرول، النافبار بيتابع القسم النشط، مفضّلين، حجز مكان في كلاس، جدول يوم/أسبوع، لايت بوكس بالكي بورد والسوايب، بحث في الأسئلة الشائعة |
| حاسبات حيّة | BMI بمقياس ملوّن + وزن صحي، TDEE + ماكروز برسم دائري، أقصى وزن 1RM، حاسبة المياه |
| SEO | `app/robots.ts` + `app/sitemap.ts` + metadata عربي كامل + `NEXT_PUBLIC_SITE_URL` للـ OG |
| بلاك إند | `app/api/{bookings,subscribe,pay,pay/confirm}` + طبقة `app/lib/api.ts` + بروكسي `BACKEND_URL` |
| حفظ الحالة | `localStorage` عبر `useSyncExternalStore` → شغّال مع hydration، ومتزامن بين التبويبات، من غير فلاش |

## 💳 تجربة الدفع (بدون فلوس حقيقية)

الدفع **وضع تجريبي (Sandbox)** — مفيش شركة دفع حقيقية، ومفيش رقم كارت بيتخزن أو بيتبعت لأي مكان. كل التحقق شغال زي الحقيقي:

| الكارت | النتيجة |
| --- | --- |
| `4242 4242 4242 4242` | يفتح خطوة **3‑D Secure** — أي 6 أرقام تنفع (`000000` = رمز غلط) |
| `5555 5555 5555 4444` | Mastercard نجاح مباشر |
| `4000 0000 0000 0002` | البنك رفض `card_declined` (HTTP 402) |
| `4000 0000 0000 9995` | رفض `insufficient_funds` |
| أي رقم يفشل فحص Luhn | مرفوض فورًا تحت الرقم نفسه، والـ submit بيتقفل |
| `5080 …` / `9201 …` | بيتعرف كـ **mada** في الشعار والـ preview |

في التشيك أوت فيه صندوق **كروت للاختبار** — تضغط على أي كارت يتحقن في الخانات. المنطق في:

- `app/lib/payment.ts` — Luhn، أنواع الكروت، تاريخ الانتهاء، `validateCard()` (أخطاء لكل حقل)، `authorize`/`confirmPayment`.
- `app/api/pay/route.ts` + `app/api/pay/confirm/route.ts` — قرار البنك، مرجع العملية، و OTP.

> للربط الحقيقي: `NEXT_PUBLIC_PAYMENT_PROVIDER=paymob|fawry|stripe` + `NEXT_PUBLIC_PAYMENT_SECRET=...`
> وبدّل جسم الدالتين فوق — شكل `PayResult` ثابت فالواجهة كلها من غير تعديل.

## 🧪 الاختبارات

```bash
npm test              # vitest run
npm run test:watch
```

| الملف | بيغطي إيه |
| --- | --- |
| `tests/pricing.test.ts` | كل باقة × كل مدة، الإضافات، خصم المدة، كوبونات (min/cap)، الضريبة، التوفير، تواريخ التجديد، نمط كارت العضوية |
| `tests/card.test.ts` | `luhnValid`، `detectBrand` (Visa/MC/Amex/mada)، `expValid`، `validateCard` وأخطاء الحقول |
| `tests/api-contract.test.ts` | بينادي الـ route handlers نفسها: 201/200/402/401/404/422 وشكل `fields` — **نفس الاختبارات اللي لازم أي باك إند خارجي يعديها** |

## 🔌 ربط الباك إند

كل نداءات السيرفر بتخرج من ملف واحد: **`app/lib/api.ts`** (`apiFetch` + `ENDPOINTS`).

| المتغير (في `.env.local`) | بيعمل إيه |
| --- | --- |
| `BACKEND_URL=http://127.0.0.1:8000` | كل الطلبات على `/api/*` بتتوجه لباك إندك **قبل** هاندلرات نكست |
| `BACKEND_ONLY=bookings,subscribe,pay` | يسيّب باقي المسارات لهاندلرات نكست |
| `NEXT_PUBLIC_API_BASE=https://api…` | النداء يطلع من المتصفح مباشرة (يحتاج CORS) |
| الاتنين فاضيين | الموقع شغال كامل على هاندلرات نكست — جاهز للعرض للعميل |

**الخطوات:**

1. الباك إند في مجلد **بجانب** المشروع (`../fitzone-api`) أو ريبو منفصل — متحطوش جوّه `gym-fitness`.
2. `echo 'BACKEND_URL=http://127.0.0.1:8000' > .env.local` وأعد تشغيل `npm run dev`.
3. نفّذ 3 اختبارات `curl` آخر `docs/BACKEND-CONTRACT.md` — أو شغّل `node scripts/mock-backend.mjs` (باك إند وهمي بنفس العقد) وشوف السكة شغالة.
4. أي `fields: { … }` على 422 بيظهر تحت الحقل نفسه في الفورم أوتوماتيك.

> أمان: في وضع التجربة الكروت بتعدي على `/api/pay` جوّه نفس السيرفر ومش بتتخزن خالص. في الباك إند الحقيقي: الرقم يروح للبوابة من السيرفر بس، ارفض أي رقم مش Luhn-valid، متسجلش الجسم في اللوج، واعمل idempotency بمفتاح `orderId`.

## 🗂️ تقسيم الملفات

```
app/
  layout.tsx            metadata + fonts + ToastProvider + GymProvider
  page.tsx              تركيب السكاشن (server component)
  robots.ts / sitemap.ts
  globals.css           Tailwind v4 @theme + أنيميشنات + ستايل السلايدرز
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
    payment.ts          Luhn + أنواع الكروت + validateCard + TEST_CARDS + authorize/confirm
    subscription.ts     محرك الأسعار (بتقريب للفلس) + Membership + كود الكارت
    data.ts             كل المحتوى: باقات، إضافات، كوبونات، جداول، قصص، صور
    store.tsx           GymProvider: سلة الاشتراك، العضوية، المفضلات، الحجوزات
    storage.ts          usePersistentState / useClock / useHydrated
    utils.ts            egp()، fmtDate()، isEGPhone()/EG_PHONE_RE، cx()…
tests/                  49 اختبار (vitest) — بيزودي كل يوم
docs/                   BACKEND-CONTRACT.md · DEPLOY-VERCEL.md · screenshots/
scripts/                mock-backend.mjs · make-transform-pairs.mjs · make-trainer-crops.mjs
.github/workflows/ci.yml  typecheck + lint + vitest + build
public/images/          hero + جيم + كوتشات + 6 صور قبل/بعد (1280×720)
```

## 🗣️ إزاي أحكي المشروع في انترفيو

1. «البزنس لوجيك معزول في `subscription.ts` و**مغطى بـ 49 اختبار** — أي تغيير في سعر أو كوبون يكسر CI.»
2. «عملت طبقة دفع بسلوك بوابات حقيقية قبل ما أربط أي بوابة: Luhn، رفض بنك، 3‑D Secure بخطوة OTP، وحالات خطأ HTTP صح (402/401/404/422).»
3. «صممت الـ integration seam: صفر `fetch` في الكومبوننتات، ملف واحد `api.ts` + بروكسي بمتغير بيئة — Laravel اتلحق من غير تعديل واجهة واحدة.»
4. «العقد مكتوب في `docs/BACKEND-CONTRACT.md` بنفس الاختبارات اللي بيشغّلها الباك إند الوهمي، فالفريق التاني يقدر ينفذه مستقلة.»
5. «RTL عربي صح: القياس من اليمين، الاتجاهات معكوسة في السلايدرات، والخط self-hosted عشان ما يعتمدش على CDN.»

## عشان يبقى إنتاج حقيقي

1. **قاعدة بيانات**: `app/api/*/route.ts` بيخزن in-memory؛ بدّلها بالاستعلام بتاعك (MySQL/Postgres) — الواجهة ما بتتغيرش.
2. **بوابة دفع فعلية**: `NEXT_PUBLIC_PAYMENT_PROVIDER=paymob|fawry|stripe` + `authorize()`/`confirmPayment()`.
3. **الأرقام والروابط**: `app/lib/data.ts` → `GYM` (واتساب، تليفون، عنوان، ميعاد الشغل) و`COUPONS` و`ADDONS`.
4. **دومين الـ OG**: `NEXT_PUBLIC_SITE_URL` في البيئة عشان `metadataBase` والـ sitemap.
5. **لوحة أدمن**: `GET /api/bookings` و`GET /api/subscribe` بيرجعوا صفوف/إيراد/توزيع الباقات — أساس كافي لدشبورد بسيط.

## ⚖️ الرخصة والإخلاء

- الرخصة: **All rights reserved** — المشروع نموذج تجريبي/عرض مهارات. التفاصيل في [LICENSE](LICENSE).
- كل البيانات وهمية (أسعار، أرقام تليفونات، أسماء أعضاء، كوبونات) وأي تشابه مع جيم حقيقي صدفة.
- صور التحول (قبل/بعد) مولّدة بالـ AI — مفيهاش أشخاص حقيقيين.
- **مفيش أي عملية دفع حقيقية**: لا فلوس بتتحرك، ولا شركة دفع متوصّلة، ولا بيانات كروت بتتخزن.

> `AGENTS.md` + `CLAUDE.md` في الروت ملفات بتولّدها Next.js 16 نفسها (راجع `node_modules/next/dist/server/lib/generate-agent-files.js`) — مش إهمال، وممسحتش عشان بترجع لوحدها.
