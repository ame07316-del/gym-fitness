# FitZone Pro 🏋️ — Arabic RTL gym site with a real subscription flow + admin panel

**EN:** Arabic-first (RTL) Next.js 16 app for a gym: plan builder with a pricing engine, 3-step checkout where **every price is computed server-side** (the browser never sends a total), wallet-transfer / pay-at-the-gym only — **no card payments anywhere in the product** — digital membership card with freeze/renew, class booking, fitness calculators, before/after slider — **plus a real SQLite-backed admin panel with role-based access control** (owner / manager / coach / reception), DB-backed sessions, CSRF protection, rate limiting and an audit log — and a documented single-file backend seam (`app/lib/api.ts`) so a Laravel/Node API plugs in with one env var.

**عربي:** صفحة هبوط عربية (RTL) لجيم، فيها نظام اشتراكات كامل وشغّال من غير باك-إند خارجي، **ولوحة إدارة على `/admin` بقاعدة بيانات حقيقية وصلاحيات لكل دور** (مدير عام / مدير فرع / كوتش / استقبال). **مفيش دفع بالفيزا ولا أي كارت** — تحويل محفظة أو كاش في الفرع، والفلوس كلها بتتحسب على السيرفر والاشتراك بيتفعّل بعد تأكيد الإدارة.

<br/>

<p align="center">
  <a href="https://github.com/ame07316-del/gym-fitness/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ame07316-del/gym-fitness/actions/workflows/ci.yml/badge.svg"></a>
  <a href="#"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript"></a>
  <a href="tests/"><img alt="Tests" src="https://img.shields.io/badge/vitest-76%20passing-6E9F18"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-All%20rights%20reserved-orange"></a>
</p>

| | |
| --- | --- |
| 🌍 **Live demo** | <https://gym-fitness-ame07316-5868s-projects.vercel.app> · لو طلب login اعمل [خطوة 1.5](docs/DEPLOY-VERCEL.md) |
| 🎬 **Walkthrough (90 ثانية)** | `_لينك Loom/YouTube_` |
| 📄 **عقد الباك إند** | [`docs/BACKEND-CONTRACT.md`](docs/BACKEND-CONTRACT.md) |
| 🛡️ **لوحة الإدارة والصلاحيات** | [`docs/ADMIN.md`](docs/ADMIN.md) — `/admin` · حسابات العرض جوّه |
| 🔐 **مراجعة الأمان** | [`docs/SECURITY.md`](docs/SECURITY.md) — ١٢ نقطة اتصلّحت + التهديدات |
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

- **Role-based admin panel on a real database** — SQLite (better-sqlite3) with versioned migrations, 4 roles × 15 permissions enforced **server-side** (coach scoping happens in SQL, not in the UI), DB-backed sessions with idle + absolute expiry, scrypt password hashing, CSRF double-submit bound to the session, per-IP/per-account rate limiting, and an audit log for every destructive action.
- **Pricing engine with unit tests** — plan × cycle × add-ons × coupon rules (minimums, caps) × 14% Egyptian VAT, all money rounded to piasters in one place.
- **Money is server-authoritative** — the checkout posts *choices only* (plan, cycle, add-ons, coupon); `total`, `perMonth`, `months`, `endsAt` and the order id are recomputed/generated on the server and any client-sent amount is ignored. Unknown plan/cycle/add-on/coupon → `422` instead of a silent fallback price. Covered by regression tests.
- **No card data, by design** — card payments were removed from the product entirely: no card fields, no Luhn, no 3-D Secure, no `card_brand`/`card_last4` columns. Members transfer to a wallet or pay at the branch; subscriptions land as `pending` and staff flip them to `active` from `/admin`, which writes `paid_at`, `paid_by` and an audit row.
- **Zero `fetch` scattered in components** — one `apiFetch` module + a `rewrites.beforeFiles` proxy: point `BACKEND_URL` at any Laravel/Node API and nothing else changes.
- **Field-level server validation in the UI** — a `422 { fields: { "member.phone": "…" } }` lands under the exact input automatically.
- **Arabic RTL done properly** — measured from the right, `dir="rtl"` scroll/anchor logic, self-hosted Cairo font (no external CDN that rots).
- **Clean console** — `useSyncExternalStore` for `localStorage` (hydration-safe, cross-tab), framer-motion hydration noise silenced, zero warnings in SSR logs.
- **Security headers by default** — CSP (nonce + `strict-dynamic` on `/admin`), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, no `X-Powered-By` — all in `proxy.ts` (Next 16 renamed `middleware` → `proxy`).
- **CI** — `typecheck → lint → vitest → build` on every push/PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## التشغيل

```bash
nvm use                # Node 22 (راجع .nvmrc)
npm install
npm run dev            # http://localhost:3000 — بيسمع على 0.0.0.0 للمعاينات الخارجية
                       # لوحة الإدارة: http://localhost:3000/admin
npm test               # 76 اختبار: الأسعار + الكروت + عقد الـ API + الصلاحيات والأمان
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
```

أول تشغيل بيعمل `data/gym.db` لوحده (ميجريشن + بيانات عرض). ادخل اللوحة بـ:

| الحساب | الدور | كلمة السر |
| --- | --- | --- |
| `owner@fitzone.pro` | المدير العام (يمسح ويلغي أي اشتراك) | `Owner#Fit2026` |
| `manager@fitzone.pro` | مدير فرع (يلغي ويجمّد، مايمسحش) | `Manager#Fit2026` |
| `coach.ahmed@fitzone.pro` | كوتش (أعضاءه هو بس) | `Coach#Fit2026` |
| `reception@fitzone.pro` | استقبال (من غير أرقام مالية) | `Front#Fit2026` |

> دي حسابات **وضع العرض** بس (`DEMO_SEED=1`). في الإنتاج: `DEMO_SEED=0` + `SEED_OWNER_PASSWORD`.

## إيه الجديد

| الحاجة | التفاصيل |
| --- | --- |
| اشتراكات كاملة | باقة (أساسي/برو/VIP) + مدة (شهري/٣/٦/١٢ شهر) + إضافات + كود خصم + ض.ق.م ١٤٪ + توفير مقارنة بالشهري |
| تشيك أوت | 3 خطوات: مراجعة ← بياناتك ← طريقة الدفع (محفظة/كاش) ← نجاح برقم طلب وكارت عضوية |
| 💰 السعر على السيرفر | المتصفح بيبعت اختياراته بس — الإجمالي والمدة وتاريخ الانتهاء ورقم الطلب كلهم بيتحسبوا على السيرفر، وأي مبلغ جاي من العميل بيتتجاهل |
| 🚫 مفيش فيزا | مفيش خانات كارت ولا Luhn ولا 3-D Secure ولا أعمدة كارت في الداتابيز — تحويل محفظة أو كاش، والاشتراك `pending` لحد ما الإدارة تأكد |
| لوحة «عضويتي» | كارت رقمي بـ QR مبسّط، شريط تقدم الصلاحية، تجميد / استئناف / تجديد / إيقاف تجديد تلقائي، كود إحالة، كلاساتي، طلباتي |
| آراء حقيقية | قصص نجاح بصوت بشري مصري + حائط ٦ ريفيهات بتواريخ وخطط وتقييمات ٣ و٤ نجمة مش كلها ٥ |
| قبل/بعد | صور تحول (نفس الشخص/نفس الإضاءة) بسلايدر سحب من اليمين + نبضة على المقبض لحد ما المستخدم يلمسه |
| تفاعلات | Toasts، شريط تقدم السكرول، النافبار بيتابع القسم النشط، مفضّلين، حجز مكان في كلاس، جدول يوم/أسبوع، لايت بوكس بالكي بورد والسوايب، بحث في الأسئلة الشائعة |
| حاسبات حيّة | BMI بمقياس ملوّن + وزن صحي، TDEE + ماكروز برسم دائري، أقصى وزن 1RM، حاسبة المياه |
| SEO | `app/robots.ts` + `app/sitemap.ts` + metadata عربي كامل + `NEXT_PUBLIC_SITE_URL` للـ OG |
| 🛡️ لوحة إدارة | `/admin`: نظرة عامة + اشتراكات (تأكيد دفع/تجميد/استئناف/إلغاء/حذف/إسناد كوتش) + حجوزات + مستخدمين + سجل عمليات |
| 👥 صلاحيات | ٤ أدوار × ١٥ صلاحية — المدير العام بس هو اللي بيمسح نهائي، والكوتش بيشوف أعضاءه (فلترة في الـ SQL) |
| 🗄️ قاعدة بيانات | SQLite + ميجريشن + `users/sessions/subscriptions/bookings/audit_log/rate_limits` — الاستعلامات كلها معزولة في `app/lib/db/*` |
| 🔐 أمان | scrypt، جلسات في الداتابيز، CSRF، قفل بعد ٥ محاولات، rate limit، ترويسات CSP — التفاصيل في [`docs/SECURITY.md`](docs/SECURITY.md) |
| بلاك إند | `app/api/{bookings,subscribe,quote}` + `app/api/admin/*` + طبقة `app/lib/api.ts` + بروكسي `BACKEND_URL` |
| حفظ الحالة | `localStorage` عبر `useSyncExternalStore` → شغّال مع hydration، ومتزامن بين التبويبات، من غير فلاش |

## 💰 الدفع والأسعار

**مفيش دفع بالفيزا ولا أي كارت في المشروع خالص** — لا خانة كارت، لا فحص Luhn، لا 3-D Secure،
ولا أي عمود لبيانات بنكية في الداتابيز. الموقع أصلاً مابيطلبش من العضو أي بيانات بنكية.

| الطريقة | اللي بيحصل |
| --- | --- |
| فودافون كاش / إنستا باي | العضو بيحوّل على محفظة الجيم ويكتب رقمه عشان نطابق التحويل |
| كاش في الفرع | مكانه محجوز 48 ساعة ويدفع للكاشير |

كل طلب بيتسجّل بحالة **`pending`** ومابيتحسبش في الإيراد، وموظف عنده صلاحية `subscriptions:update`
بيضغط **«تأكيد الدفع»** من `/admin` فيتحوّل لـ `active` مع `paid_at` و`paid_by` وسطر في سجل العمليات.

**الأسعار كلها بتتحسب على السيرفر:**

```
المتصفح  →  { planId, cycle, addonIds, coupon, member, payment }     ← اختيارات بس
السيرفر  →  parseDraft() ➜ quoteOf() ➜ { total, perMonth, months, endsAt, orderId }
```

أي `total` أو `months` أو `endsAt` أو `orderId` جاي من العميل **بيتتجاهل**، وأي باقة/مدة/إضافة/كوبون
مش موجود بيرجع `422` بدل ما يعدّي بسعر تاني. فيه كمان `POST /api/quote` للتسعيرة الرسمية.
التفاصيل في [`docs/SECURITY.md`](docs/SECURITY.md) و[`docs/BACKEND-CONTRACT.md`](docs/BACKEND-CONTRACT.md).

## 🧪 الاختبارات

```bash
npm test              # vitest run — 61 اختبار
npm run test:watch
```

| الملف | بيغطي إيه |
| --- | --- |
| `tests/pricing.test.ts` | كل باقة × كل مدة، الإضافات، خصم المدة، كوبونات (min/cap)، الضريبة، التوفير، تواريخ التجديد، نمط كارت العضوية |
| `tests/api-contract.test.ts` | بينادي الـ route handlers نفسها: 201/422 وشكل `fields`، **تجاهل أي مبلغ جاي من العميل**، رفض الكوبون الغلط، ورفض أي طريقة دفع غير محفظة/كاش — **نفس الاختبارات اللي لازم أي باك إند خارجي يعديها** |
| `tests/auth.test.ts` | مصفوفة الصلاحيات لكل دور + scrypt (ملح مختلف، `timingSafeEqual`) + سياسة كلمات السر |
| `tests/admin-api.test.ts` | الدخول والقفل بعد ٥ محاولات، حماية CSRF وOrigin، نطاق رؤية كل دور، تأكيد الدفع بصلاحية، إلغاء/حذف الاشتراكات، وإن تعطيل مستخدم بيقتل جلسته |

## 🔌 ربط الباك إند

كل نداءات السيرفر بتخرج من ملف واحد: **`app/lib/api.ts`** (`apiFetch` + `ENDPOINTS`).

| المتغير (في `.env.local`) | بيعمل إيه |
| --- | --- |
| `BACKEND_URL=http://127.0.0.1:8000` | كل الطلبات على `/api/*` بتتوجه لباك إندك **قبل** هاندلرات نكست |
| `BACKEND_ONLY=bookings,subscribe,quote` | يسيّب باقي المسارات لهاندلرات نكست |
| `NEXT_PUBLIC_API_BASE=https://api…` | النداء يطلع من المتصفح مباشرة (يحتاج CORS) |
| الاتنين فاضيين | الموقع شغال كامل على هاندلرات نكست — جاهز للعرض للعميل |

**الخطوات:**

1. الباك إند في مجلد **بجانب** المشروع (`../fitzone-api`) أو ريبو منفصل — متحطوش جوّه `gym-fitness`.
2. `echo 'BACKEND_URL=http://127.0.0.1:8000' > .env.local` وأعد تشغيل `npm run dev`.
3. نفّذ 3 اختبارات `curl` آخر `docs/BACKEND-CONTRACT.md` — أو شغّل `node scripts/mock-backend.mjs` (باك إند وهمي بنفس العقد) وشوف السكة شغالة.
4. أي `fields: { … }` على 422 بيظهر تحت الحقل نفسه في الفورم أوتوماتيك.

> أمان: الباك إند بتاعك **لازم** يعيد حساب سعر الاشتراك بنفسه ويتجاهل أي مبلغ جاي من المتصفح، ويرفض أي `planId`/`cycle`/إضافة/كوبون مش موجود بـ 422. ومفيش أي بيانات كروت في العقد أصلًا — الدفع بره الموقع (محفظة/كاش) والتفعيل من لوحة الإدارة.

## 🗂️ تقسيم الملفات

```
app/
  layout.tsx            metadata + fonts + ToastProvider + GymProvider
  page.tsx              تركيب السكاشن (server component)
  robots.ts / sitemap.ts
  globals.css           Tailwind v4 @theme + أنيميشنات + ستايل السلايدرز
  admin/                🛡️ لوحة الإدارة (Server Components + جدول لكل قسم)
    page.tsx login/page.tsx components/{Dashboard,SubscriptionsPanel,BookingsPanel,UsersPanel,AuditPanel,AccountPanel,LoginForm}
  api/
    bookings/route.ts   POST عام + GET محمي بصلاحية
    subscribe/route.ts  POST عام + GET محمي (الإيراد للأدوار المصرّح لها بس)
    quote/route.ts      POST التسعيرة الرسمية (المصدر الوحيد للأسعار)
    admin/              auth/{login,logout,me,password} · users[/id] · subscriptions[/orderId]
                        bookings[/id] · stats · audit
  components/
    Navbar Hero Amenities Trainers Schedule Pricing Tools Gallery
    Testimonials Faq Booking Footer(+FloatingActions) MemberPanel Checkout
    ui/{Bits,Overlay,Toast}
  lib/
    db/                 🗄️ SQLite: index(migrations) · seed · users · subscriptions · bookings · audit · rate-limit
    auth/               roles(الصلاحيات) · password(scrypt) · session(كوكيز+CSRF) · guard(authorize) · server
    http.ts             ردود JSON بترويسات آمنة + قراءة body بحد أقصى + تنظيف المدخلات
    admin-client.ts     نداءات اللوحة من المتصفح (بتضيف توكن CSRF)
    api.ts              🎛️ نقطة الخروج الوحيدة لكل نداءات السيرفر
    subscription.ts     محرك الأسعار (بتقريب للفلس) + parseDraft (تحقق صارم للسيرفر) + Membership
    data.ts             كل المحتوى: باقات، إضافات، كوبونات، جداول، قصص، صور
    store.tsx           GymProvider: سلة الاشتراك، العضوية، المفضلات، الحجوزات
    storage.ts          usePersistentState / useClock / useHydrated
    utils.ts            egp()، fmtDate()، isEGPhone()/EG_PHONE_RE، cx()…
proxy.ts                ترويسات الأمان (CSP/HSTS/…) + بوابة `/admin`
tests/                  61 اختبار (vitest)
docs/                   BACKEND-CONTRACT.md · ADMIN.md · SECURITY.md · DEPLOY-VERCEL.md · screenshots/
scripts/                mock-backend.mjs · make-transform-pairs.mjs · make-trainer-crops.mjs
.github/workflows/ci.yml  typecheck + lint + vitest + build
public/images/          hero + جيم + كوتشات + 6 صور قبل/بعد (1280×720)
```

## 🗣️ إزاي أحكي المشروع في انترفيو

1. «البزنس لوجيك معزول في `subscription.ts` و**مغطى باختبارات** — أي تغيير في سعر أو كوبون يكسر CI.»
2. «الفلوس server-authoritative: المتصفح بيبعت اختياراته بس، والسيرفر بيعيد حساب الإجمالي وبيولّد رقم الطلب — وفيه اختبارات بتحاول تتلاعب بالسعر وبتفشل. وشلت الدفع بالكروت من المنتج خالص عشان أقل سطح هجوم و صفر بيانات بنكية.»
3. «صممت الـ integration seam: صفر `fetch` في الكومبوننتات، ملف واحد `api.ts` + بروكسي بمتغير بيئة — Laravel اتلحق من غير تعديل واجهة واحدة.»
4. «العقد مكتوب في `docs/BACKEND-CONTRACT.md` بنفس الاختبارات اللي بيشغّلها الباك إند الوهمي، فالفريق التاني يقدر ينفذه مستقلة.»
5. «RTL عربي صح: القياس من اليمين، الاتجاهات معكوسة في السلايدرات، والخط self-hosted عشان ما يعتمدش على CDN.»

## عشان يبقى إنتاج حقيقي

1. **قاعدة بيانات**: الافتراضي SQLite في `data/gym.db`؛ للانتقال لـ MySQL/Postgres بدّل ملفات `app/lib/db/*` بس — الـ routes والواجهة ما بيتغيروش.
2. **بوابة دفع فعلية**: `NEXT_PUBLIC_PAYMENT_PROVIDER=paymob|fawry|stripe` + `authorize()`/`confirmPayment()`.
3. **الأرقام والروابط**: `app/lib/data.ts` → `GYM` (واتساب، تليفون، عنوان، ميعاد الشغل) و`COUPONS` و`ADDONS`.
4. **دومين الـ OG**: `NEXT_PUBLIC_SITE_URL` في البيئة عشان `metadataBase` والـ sitemap.
5. **لوحة أدمن**: جاهزة على `/admin` — شغّل `DEMO_SEED=0` وحط `SEED_OWNER_PASSWORD`، وراجع [`docs/SECURITY.md`](docs/SECURITY.md) قبل النشر.

## ⚖️ الرخصة والإخلاء

- الرخصة: **All rights reserved** — المشروع نموذج تجريبي/عرض مهارات. التفاصيل في [LICENSE](LICENSE).
- كل البيانات وهمية (أسعار، أرقام تليفونات، أسماء أعضاء، كوبونات) وأي تشابه مع جيم حقيقي صدفة.
- صور التحول (قبل/بعد) مولّدة بالـ AI — مفيهاش أشخاص حقيقيين.
- **مفيش أي عملية دفع حقيقية**: لا فلوس بتتحرك، ولا شركة دفع متوصّلة، ولا بيانات كروت بتتخزن.

> `AGENTS.md` + `CLAUDE.md` في الروت ملفات بتولّدها Next.js 16 نفسها (راجع `node_modules/next/dist/server/lib/generate-agent-files.js`) — مش إهمال، وممسحتش عشان بترجع لوحدها.
