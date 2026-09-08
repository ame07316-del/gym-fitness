# FitZone Pro 🏋️ — Arabic RTL gym site with a real subscription + payment flow

**EN:** Arabic-first (RTL) Next.js 16 app for a gym: plan builder with pricing engine, 4-step checkout, a **behaviourally realistic sandbox payment layer** (Luhn, brand detection incl. mada, 3‑D Secure OTP, bank decline codes), digital membership card with freeze/renew, class booking, fitness calculators, before/after slider — plus a documented single-file backend seam (`app/lib/api.ts`) so a Laravel/Node API plugs in with one env var.

**عربي:** صفحة هبوط عربية (RTL) لجيم، فيها نظام اشتراكات كامل وشغّال من غير باك-إند خارجي، مع طبقة دفع وضع تجريبي — **مفيش فلوس حقيقية ومفيش بيانات كروت بتتخزن**.

<br/>

<p align="center">
  <a href="https://github.com/ame07316-del/gym-fitness/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ame07316-del/gym-fitness/actions/workflows/ci.yml/badge.svg"></a>
  <a href="#"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript"></a>
  <a href="#"><img alt="Postgres" src="https://img.shields.io/badge/Postgres-Supabase%20%7C%20Neon%20%2B%20Drizzle-336791?logo=postgresql&logoColor=white"></a>
  <a href="tests/"><img alt="Tests" src="https://img.shields.io/badge/vitest-88%20passing-6E9F18"></a>
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

- **Real Postgres behind a one-file seam** — Drizzle ORM + `drizzle-kit` migrations, running on **Supabase or Neon** (the driver is picked from the connection string: postgres.js over the Supabase pooler, or Neon's HTTP driver); `app/lib/server/db.ts` picks the Postgres adapter when `DATABASE_URL` is set and falls back to the in-memory one otherwise, so `npm run dev` and CI still need **zero configuration**. The admin dashboard runs as SQL aggregates (`count(*) filter`, `group by`, `jsonb_array_elements_text`), and the adapter is tested against a real Postgres (PGlite/WASM) using the committed migration.
- **Pricing engine + admin layer with 88 unit tests** — plan × cycle × add-ons × coupon rules (minimums, caps) × 14% Egyptian VAT, all money rounded to piasters in one place.
- **Payment UX without a gateway** — client-side Luhn + brand detection (Visa/Mastercard/Amex/**mada**), server-side decline simulation, 3-D Secure challenge step, per-field error mapping. Same contract as Stripe/Paymob, so the real switch is two function bodies.
- **Zero `fetch` scattered in components** — one `apiFetch` module + a `rewrites.beforeFiles` proxy: point `BACKEND_URL` at any Laravel/Node API and nothing else changes.
- **Field-level server validation in the UI** — a `422 { fields: { "member.phone": "…" } }` lands under the exact input automatically.
- **Arabic RTL done properly** — measured from the right, `dir="rtl"` scroll/anchor logic, self-hosted Cairo font (no external CDN that rots).
- **Clean console** — `useSyncExternalStore` for `localStorage` (hydration-safe, cross-tab), framer-motion hydration noise silenced, zero warnings in SSR logs.
- **Admin panel behind a real auth boundary** — `/admin` with revenue/orders/bookings/payments stats, searchable tables and CSV export; guarded by a Next 16 `proxy.ts` + per-handler check, HMAC-signed httpOnly session cookie, constant-time password compare, and IP lockout after 5 failures.
- **CI** — `typecheck → lint → vitest → build` on every push/PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## التشغيل

```bash
nvm use                # Node 22 (راجع .nvmrc)
npm install
npm run dev            # http://localhost:3000 — بيسمع على 0.0.0.0 للمعاينات الخارجية
npm test               # 88 اختبار: الأسعار + الكروت + عقد الـ API + لوحة الإدارة + أدابتر الداتابيز
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
```

من غير أي متغير بيئة المشروع بيشتغل كامل على **مخزن الذاكرة**. عايز تخزين حقيقي؟
سطر واحد في `.env.local` وأمر واحد:

```bash
echo 'DATABASE_URL=postgresql://…neon.tech/neondb?sslmode=require' >> .env.local
npm run db:migrate     # ينشئ bookings / subscriptions / payments
npm run db:check       # دكتور: الاتصال + الجداول + عدد الصفوف + فحص خصوصية الدفع
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
| 🛡️ لوحة الإدارة | `/admin` — إيراد، اشتراكات، حجوزات، مدفوعات، آخر ٧ أيام، توزيع الباقات/الكوبونات/الإضافات، بحث وفلترة وتصدير CSV، دخول بباسورد + كوكي موقّعة + قفل بعد ٥ محاولات |
| بلاك إند | `app/api/{bookings,subscribe,pay,pay/confirm}` + `app/api/admin/*` + طبقة `app/lib/api.ts` + بروكسي `BACKEND_URL` |
| 🗄️ داتابيز حقيقية | Postgres على **Supabase** أو **Neon** بـ Drizzle ORM + مايجريشن `drizzle-kit` — الدرايفر بيتحدد من الـ URL، و fallback أوتوماتيك لمخزن الذاكرة لو `DATABASE_URL` مش موجود |
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

## 🛡️ لوحة الإدارة `/admin`

لوحة داخلية لصاحب الجيم بتقرأ **نفس المخزن** اللي بتكتب فيه نقاط `/api/*` (يعني أي اشتراك أو حجز يتعمل من الموقع يظهر فورًا).

| الصفحة | فيها إيه |
| --- | --- |
| `/admin` نظرة عامة | إجمالي الإيراد / النهارده / آخر ٧ أيام، متوسط الطلب، ض.ق.م المحصّلة، عدد الاشتراكات النشطة، طلبات الحجز، حالات الدفع (ناجحة/مرفوضة/معلّقة)، رسم أعمدة لآخر ٧ أيام، توزيع الباقات والمدد وطرق الدفع والإضافات والكوبونات، أهداف المتدربين، شبكات الكروت، أسباب الرفض — بيتحدث كل ٣٠ ثانية |
| `/admin/orders` | جدول الاشتراكات: بحث (اسم/موبايل/رقم طلب/باقة/كوبون)، فلترة بالحالة، ترقيم، رابط واتساب للعضو، تصدير CSV |
| `/admin/bookings` | طلبات الحجز مع زر واتساب جاهز برسالة، بحث وفلترة و CSV |
| `/admin/payments` | سجل البوابة: المرجع، الشبكة، آخر ٤ أرقام **بس**، الحالة، كود الرفض — CSV |

**الدخول:** باسورد واحد من البيئة (`ADMIN_PASSWORD`). في التطوير لو مش متظبط الباسورد الافتراضي **`admin123`**؛ في الإنتاج لو مش متظبط اللوحة **بتتقفل** (503) بدل ما تفتح بباسورد معروف.

**إزاي محمية:**

- `proxy.ts` (بديل middleware في Next 16) بيصدّ `/admin/*` (redirect للدخول) و`/api/admin/*` (401 JSON) قبل ما أي كود يشتغل.
- كل route handler إداري بيعيد التحقق بنفسه (`requireAdmin`) — defense in depth.
- الكوكي `httpOnly` + `SameSite=Lax` + `Secure` في الإنتاج، وقيمتها `انتهاء.توقيع HMAC-SHA256` — مفيهاش الباسورد ومش بتتفبرك من غير السر، وصلاحيتها ١٢ ساعة.
- ٥ محاولات غلط من نفس الـ IP = قفل ١٠ دقايق (`429` + `Retry-After`).
- مقارنة الباسورد بوقت ثابت، و`X-Robots-Tag: noindex` + `Cache-Control: no-store` على كل صفحات اللوحة.

**الملفات:** `app/admin/*` (الواجهة) · `app/api/admin/*` (session/overview/orders/bookings/payments/reset) · `app/lib/server/{db,admin-auth,admin-guard,admin-stats,admin-list,validate}.ts` · `proxy.ts`.

> أرقام اللوحة بتيجي من `buildOverview()` — على Postgres بتتحسب **جوّه الداتابيز** (aggregates)، وعلى مخزن الذاكرة بتتحسب في JS، وبنفس شكل `AdminOverview` بالظبط (فيه اختبار بيقارن الاتنين حرفيًا). شوف قسم **🗄️ الداتابيز** تحت.

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
| `tests/db-adapter.test.ts` | اختيار الدرايفر من الـ URL (Supabase/Neon) وإعدادات الـ pooler، وأدابتر Postgres على **بوستجرس حقيقي** (PGlite/WASM) والمايجريشن المكتوبة في `drizzle/`: أعمدة الجداول التلاتة، idempotency على `client_ref`/`order_id`/`reference`، `jsonb`/`numeric`، قص المدخلات الطويلة، إن جدول الدفع مفيهوش عمود لرقم كارت، تطابق الـ SQL aggregates مع حساب الذاكرة حقل بحقل، ونفس الـ route handlers شغالة فوق الداتابيز |
| `tests/admin.test.ts` | توقيع/انتهاء/تزوير كوكي الجلسة، الدخول (200/401/422/400/429)، الحارس على كل مسارات الأدمن، صحة أرقام `overview` مقابل بيانات مزروعة، بحث/فلترة/ترقيم، CSV بـ BOM ومنع حقن الصيغ، وإن سجل الدفع مفيهوش رقم كارت كامل |

## 🗄️ الداتابيز (Postgres — Supabase / Neon)

التخزين كله ورا واجهة واحدة في **`app/lib/server/db.ts`** (الـ seam). الملف ده بيختار الأدابتر أول ما التطبيق يشتغل:

| البيئة | الأدابتر | يعني إيه |
| --- | --- | --- |
| `DATABASE_URL` موجود | **Postgres** — Drizzle ORM (الدرايفر بيتحدد من الـ URL) | البيانات بتفضل بعد كل deploy، والأدمن بيقرأ من الجداول |
| فاضي (الافتراضي) | **Memory** — نفس المخزن القديم على `globalThis` | `npm run dev` و`npm test` و CI شغالين **من غير أي إعداد** |

كل دوال الـ `Repo` async في الحالتين (`addBooking` · `listOrders` · `getPayment` · `updatePayment` · `snapshot` · `reset` …)، فالـ route handlers مبتعرفش أصلًا مين الشغال تحتها.

### أي بوستجرس ينفع — الدرايفر بيتظبط لوحده

| الـ host في `DATABASE_URL` | الدرايفر | ليه |
| --- | --- | --- |
| `*.neon.tech` | `@neondatabase/serverless` (SQL over HTTP) | كل استعلام HTTPS request — مفيش TCP pool يتسرّب في الـ serverless |
| أي حاجة تانية (**Supabase**، RDS، VPS، دوكر محلي) | `postgres` (postgres.js) على TCP + TLS | الوصلة القياسية لبوستجرس |

عايز تجبره؟ `DATABASE_DRIVER=neon|postgres`. الباقي كله (الاستعلامات، الـ upserts، الـ SQL aggregates) **مشترك 100%** بين الاتنين.

### 🟢 التشغيل على Supabase (الأشهر عندنا)

1. [supabase.com](https://supabase.com) ← **New project** ← Region: أقرب حاجة (Frankfurt `eu-central-1`) ← احفظ الـ **Database password**.
2. من فوق: **Connect** ← تبويب **ORMs** (أو **App Frameworks**) ← اختار **Drizzle** — هتلاقي وصلتين:

   | النوع | البورت | استخدمها في |
   | --- | --- | --- |
   | **Transaction pooler** (`...pooler.supabase.com:6543`) | 6543 | **التشغيل** (Vercel/serverless) — دي اللي تحطها في `DATABASE_URL` |
   | **Session pooler / Direct** | 5432 | **المايجريشن** (`npm run db:migrate`) |

3. حط الوصلة في `.env.local` (بدّل `[YOUR-PASSWORD]` بباسورد الداتابيز):

```bash
# .env.local
DATABASE_URL=postgresql://postgres.abcdefghijkl:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

4. نفّذ المايجريشن مرة واحدة (بالـ session pooler — بورت 5432):

```bash
DATABASE_URL='postgresql://postgres.abcdefghijkl:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres' npm run db:migrate
npm run dev      # اعمل حجز/اشتراك، وافتح /admin تلاقيه في الجداول
```

5. اتأكد إن كله تمام:

```bash
npm run db:check     # ✓ الاتصال شغال · ✓ الجداول التلاتة · عدد الصفوف
npm run db:seed      # (اختياري) بيانات ديمو عشان /admin تبان
```

في `/admin` هتلاقي شريط أخضر مكتوب فيه **«متوصّل بداتابيز — Supabase · postgres.js»** بدل شريط وضع التجربة. وللتأكد من ناحية Supabase: **Table Editor** ← `bookings` / `subscriptions` / `payments`.

> 📘 عايز الخطوات بالتفصيل الممل (فين تدوس بالظبط + جدول أعطال كامل)؟ **[docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md)**
>
> 🅱️ **من غير أدوات محلية:** الزق **[`drizzle/supabase-setup.sql`](drizzle/supabase-setup.sql)** في **Supabase ← SQL Editor ← Run** — بيعمل الجداول *وبيسجّل المايجريشن* عند drizzle، و**[`drizzle/supabase-seed.sql`](drizzle/supabase-seed.sql)** بيانات ديمو اختيارية.

> **ليه فيه وصلتين؟** الـ transaction pooler بيوزّع كل استعلام على كونكشن مختلف — أحسن حاجة للـ serverless،
> بس مبيدعمش prepared statements ولا بعض أوامر الـ DDL. عشان كده الأدابتر بيبعت `prepare: false` و`max: 1`
> أوتوماتيك (فيه اختبار على ده)، والمايجريشن بتتنفّذ على بورت 5432.
> ومتستخدمش الـ **Direct connection** على Vercel — IPv6 بس.

### أو على Neon

```bash
# neon.tech ← New Project ← Connection string (Pooled)
echo 'DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require' >> .env.local
npm run db:migrate && npm run dev
```

| الأمر | بيعمل إيه |
| --- | --- |
| `npm run db:migrate` | بينفّذ الملفات اللي لسه ماتنفّذتش على `DATABASE_URL` (على Supabase استخدم بورت 5432) |
| `npm run db:check` | **دكتور الداتابيز**: بيقولك المزوّد والدرايفر، زمن الاتصال، الجداول موجودة ولا لأ، عدد الصفوف، والمايجريشن المتنفّذة — ولو فيه خطأ بيشرحه بالعربي ويقولك الحل |
| `npm run db:seed` | بيانات ديمو على مدار آخر ٧ أيام (٦ حجوزات · ٥ اشتراكات · ٧ مدفوعات) عشان `/admin` ما تبقاش فاضية — آمن للتكرار، و`npm run db:seed -- --clear` بيمسحها |
| `npm run db:generate` | تعدّل `db/schema.ts` → بيكتب ملف SQL جديد في `drizzle/` (اعمله commit) |
| `npm run db:push` | يزامن السكيما على طول من غير ملف مايجريشن (للتجارب السريعة بس) |
| `npm run db:studio` | متصفح جداول في البراوزر |

> `db:migrate` سكربت بتاعنا (`scripts/db-migrate.mjs`) مش `drizzle-kit migrate` مباشرة — عشان يشتغل حتى لو الوصلة على الـ transaction pooler (`prepare: false`)، ويرمي رسايل مفهومة. النسخة الخام لسه موجودة في `npm run db:migrate:kit`.

### الجداول التلاتة (`app/lib/server/db/schema.ts` — الأعمدة من `docs/BACKEND-CONTRACT.md`)

| الجدول | المفتاح الفريد | أهم الأعمدة |
| --- | --- | --- |
| `bookings` | `client_ref` (كود الحجز من الواجهة) | `name` · `phone` · `goal` · `slot` · `plan` · `status` enum(pending/confirmed/cancelled) · `created_at` |
| `subscriptions` | `order_id` | بيانات العضو (`member_*`) · `plan_id/plan_name` · `cycle` · `months` · `addon_ids` **jsonb** · `coupon` · `total`/`per_month` **numeric(10,2)** · `starts_at`/`ends_at` · `status` enum · `auto_renew` · `frozen_days_used` |
| `payments` | `reference` (مرجع البوابة) | `amount` · `method` · `status` enum(requires_action/succeeded/failed) · **`brand`** · **`last4`** · `gateway_ref` · `error_code` · `created_at`/`updated_at` |

> 🔒 **مفيش رقم كارت في أي عمود.** جدول الدفع فيه `last4 varchar(4)` و`brand` بس — الرقم الكامل عمره ما بيخرج من الطلب،
> وفيه اختبار بيفحص كل صفوف الجدول ويتأكد إن رقم الكارت مش موجود، واختبار تاني بيتأكد إن مفيش عمود اسمه `pan`/`cvv`/`exp` أصلًا.
> نفس الأعمدة دي هي اللي `/api/admin/payments` بيرجّعها — مفيش تسريب من الداتابيز للواجهة.

### الـ idempotency

الواجهة بتبعت `id`/`orderId`/`reference` ثابت لكل عملية، والأدابتر بيعمل `insert … on conflict … do update` —
يعني لو الطلب اتبعت مرتين (ضعف شبكة، ضغطتين على الزرار) بيبقى صف واحد مش صفّين. نفس السلوك متطبّق في أدابتر الذاكرة عشان الاتنين يتصرفوا زي بعض.

### أرقام لوحة الإدارة = SQL

`buildOverview()` في `app/lib/server/admin-stats.ts` بترجّع نفس `AdminOverview` من مسارين:

- **Postgres**: 7 استعلامات aggregate بالتوازي — `count(*) filter (where …)`، `sum(total) filter`، `round(sum(total) * 14 / 114)` للضريبة،
  `group by` للباقات/المدد/طرق الدفع/الكوبونات، `jsonb_array_elements_text(addon_ids)` للإضافات، و bucket لكل يوم في آخر ٧ أيام.
  **مفيش صف واحد بيتسحب للتطبيق** — الداتابيز هي اللي بتحسب.
- **Memory**: نفس الحسابات كدالة صافية في JS.

وفيه اختبار بيزرع نفس البيانات في الاتنين ويقارن الناتج **حقل بحقل** (`expect(fromSql).toEqual(fromMemory)`).

### الاختبارات من غير داتابيز

`tests/db-adapter.test.ts` بيشغّل **بوستجرس حقيقي جوّه العملية** عن طريق [PGlite](https://pglite.dev) (بوستجرس متجمّع WASM)،
وبينفّذ عليه نفس المايجريشن اللي في `drizzle/` — يعني السكيما والمايجريشن والأدابتر والـ aggregates كلهم متغطيين في CI
من غير أي سيرفر ولا سيكرِت. وفيه اختبارات كمان لاختيار الدرايفر وإعدادات الـ pooler (`prepare: false` لـ Supavisor).
باقي الاختبارات بتشتغل على أدابتر الذاكرة (الـ `vitest.config.ts` بيفضّي `DATABASE_URL` عمدًا).

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
proxy.ts                حارس /admin و /api/admin (Next 16 proxy — بديل middleware)
app/
  layout.tsx            metadata + fonts + ToastProvider + GymProvider
  page.tsx              تركيب السكاشن (server component)
  robots.ts / sitemap.ts
  globals.css           Tailwind v4 @theme + أنيميشنات + ستايل السلايدرز
  admin/
    login/              صفحة الدخول (LoginForm)
    page.tsx            نظرة عامة (Overview) — إحصائيات + رسم ٧ أيام + توزيعات
    orders/ bookings/ payments/   جداول ببحث وفلترة وترقيم و CSV (ListPage مشترك)
    AdminShell.tsx ui.tsx use-admin.ts   الهيكل + كروت/جداول/أشرطة + hook الجلب
  api/
    bookings/route.ts   GET/POST حجز جلسة
    subscribe/route.ts  GET/POST تفعيل اشتراك + إيراد/توزيع الباقات
    pay/route.ts        POST حجز عملية دفع (Luhn/رفض بنك/3DS) + GET health
    pay/confirm/route.ts POST تأكيد الـ OTP
    admin/
      session/          GET حالة · POST دخول (rate-limit) · DELETE خروج
      overview/         أرقام اللوحة (buildOverview)
      orders/ bookings/ payments/   ?q=&status=&page=&per=&format=csv
      reset/            POST مسح بيانات وضع التجربة (sandbox بس)
  components/
    Navbar Hero Amenities Trainers Schedule Pricing Tools Gallery
    Testimonials Faq Booking Footer(+FloatingActions) MemberPanel Checkout
    ui/{Bits,Overlay,Toast}
  lib/
    server/
      db.ts             🗄️ الـ seam: واجهة Repo واحدة async — بتختار الأدابتر حسب DATABASE_URL
      db/schema.ts      جداول Drizzle: bookings / subscriptions / payments
      db/postgres.ts    أدابتر Postgres — اختيار الدرايفر (Supabase/Neon) + upserts + استعلامات
      db/memory.ts      أدابتر الذاكرة (globalThis) — الافتراضي من غير إعداد
      validate.ts       validateBooking() المشترك بين bookings و subscribe
      admin-auth.ts     كوكي HMAC + باسورد + safeEqual (Web Crypto — بيشتغل في proxy و handlers)
      admin-guard.ts    requireAdmin() + قراءة الكوكي + IP
      admin-stats.ts    buildOverview() — SQL aggregates على Postgres / نفس الحساب في الذاكرة
      admin-list.ts     بحث/ترقيم/CSV
    api.ts              🎛️ نقطة الخروج الوحيدة لكل نداءات السيرفر
    payment.ts          Luhn + أنواع الكروت + validateCard + TEST_CARDS + authorize/confirm
    subscription.ts     محرك الأسعار (بتقريب للفلس) + Membership + كود الكارت
    data.ts             كل المحتوى: باقات، إضافات، كوبونات، جداول، قصص، صور
    store.tsx           GymProvider: سلة الاشتراك، العضوية، المفضلات، الحجوزات
    storage.ts          usePersistentState / useClock / useHydrated
    utils.ts            egp()، fmtDate()، isEGPhone()/EG_PHONE_RE، cx()…
tests/                  88 اختبار (vitest) — بيزودي كل يوم
drizzle/                مايجريشن SQL مولّدة بـ drizzle-kit (0000_init.sql + meta)
drizzle.config.ts       إعدادات drizzle-kit (بتقرأ .env.local لوحدها)
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
6. «التخزين ورا واجهة واحدة (`Repo`): Postgres بـ Drizzle لما `DATABASE_URL` موجود (Supabase أو Neon — الدرايفر بيتحدد من الـ URL)، ومخزن ذاكرة لما مش موجود — نفس الدوال ونفس الاختبارات، والـ CI بيعدّي من غير داتابيز أصلًا.»
7. «لوحة الأدمن مش صفحة مخفية: `proxy.ts` + تحقق في كل handler، كوكي موقّعة HMAC مش بتشيل الباسورد، rate-limit على الدخول، ومفيش رقم كارت كامل بيتخزن حتى في سجل المدفوعات.»

## عشان يبقى إنتاج حقيقي

1. **قاعدة بيانات**: ✅ اتعملت — Postgres (Supabase أو Neon) + Drizzle + مايجريشن. حط `DATABASE_URL` وشغّل `npm run db:migrate`؛ من غيره المشروع بيرجع لمخزن الذاكرة لوحده.
2. **بوابة دفع فعلية**: `NEXT_PUBLIC_PAYMENT_PROVIDER=paymob|fawry|stripe` + `authorize()`/`confirmPayment()`.
3. **الأرقام والروابط**: `app/lib/data.ts` → `GYM` (واتساب، تليفون، عنوان، ميعاد الشغل) و`COUPONS` و`ADDONS`.
4. **دومين الـ OG**: `NEXT_PUBLIC_SITE_URL` في البيئة عشان `metadataBase` والـ sitemap.
5. **لوحة الأدمن**: موجودة على `/admin` — حط `ADMIN_PASSWORD` (و`ADMIN_SECRET` عشوائي) في البيئة.

## ⚖️ الرخصة والإخلاء

- الرخصة: **All rights reserved** — المشروع نموذج تجريبي/عرض مهارات. التفاصيل في [LICENSE](LICENSE).
- كل البيانات وهمية (أسعار، أرقام تليفونات، أسماء أعضاء، كوبونات) وأي تشابه مع جيم حقيقي صدفة.
- صور التحول (قبل/بعد) مولّدة بالـ AI — مفيهاش أشخاص حقيقيين.
- **مفيش أي عملية دفع حقيقية**: لا فلوس بتتحرك، ولا شركة دفع متوصّلة، ولا بيانات كروت بتتخزن.

> `AGENTS.md` + `CLAUDE.md` في الروت ملفات بتولّدها Next.js 16 نفسها (راجع `node_modules/next/dist/server/lib/generate-agent-files.js`) — مش إهمال، وممسحتش عشان بترجع لوحدها.
