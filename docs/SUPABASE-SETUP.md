# ربط المشروع بداتابيز Supabase — خطوة بخطوة (مملة بقصد)

الدليل ده مكتوب بحيث تعمله وانت نعسان. كل خطوة فيها: تدوس فين بالظبط، وتكتب إيه، وإزاي تتأكد إنها نجحت.

**الوقت المتوقع:** ١٠ – ١٥ دقيقة. **المطلوب منك:** حساب Supabase (مجاني) + المشروع ده على جهازك.

> **قاعدة واحدة مهمة:** باسورد الداتابيز ده زي مفتاح شقتك. مايتكتبش في شات، ولا في ملف بيتعمله commit، ولا في سكرين شوت.
> لو اتسرّب: Supabase ← Settings ← Database ← **Reset database password**.

---

## قبل ما تبدأ (٣٠ ثانية)

```bash
cd gym-fitness
npm install          # لو لسه ما عملتهاش
npm run db:check     # المفروض يقولك: مفيش DATABASE_URL — والموقع شغال على الذاكرة
```

الموقع شغال دلوقتي على **مخزن ذاكرة**: يعني كل حجز أو اشتراك بيتصفّر لما السيرفر يقفل. هدفنا نخليه Postgres حقيقي.

---

## الخطوة ١ — اعمل مشروع على Supabase

1. افتح [supabase.com](https://supabase.com) ← **Start your project** ← سجّل دخول بـ GitHub.
2. **New project**.
3. املا الفورم:
   - **Name:** `gym-fitness` (أي اسم).
   - **Database Password:** دوس **Generate a password** وبعدين **انسخه واحفظه** في مدير كلمات السر بتاعك. (Supabase مش هيوريهولك تاني.)
   - **Region:** `Central EU (Frankfurt)` — أقرب واحدة لمصر، بتوفر ٥٠–١٠٠ms في كل استعلام.
   - **Pricing Plan:** Free.
4. **Create new project** ← استنى دقيقة – دقيقتين لحد ما الشريط الأخضر يخلص.

✅ **تتأكد إزاي؟** لوحة المشروع فتحت ومكتوب فوق اسم المشروع وجنبه دايرة خضرا.

---

## الخطوة ٢ — هات وصلة الاتصال (Connection string)

1. من فوق خالص، جنب اسم المشروع: زرار **Connect**.
2. تبويب **ORMs** ← من القائمة اختار **Drizzle**.
3. هتلاقي بلوك فيه سطر `DATABASE_URL=...`. **انسخه**.

الوصلة شكلها كده:

```
postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**فك شفرة السطر ده** (مهم تفهمه عشان الخطوة اللي بعدها):

| الجزء | معناه |
| --- | --- |
| `postgres.abcdefghijklmnop` | اليوزر = `postgres` + **project ref** بتاعك |
| `[YOUR-PASSWORD]` | **لازم تبدله** بالباسورد اللي حفظته في الخطوة ١ |
| `aws-0-eu-central-1.pooler.supabase.com` | الـ **pooler** (Supavisor) — مش السيرفر المباشر |
| `:6543` | **transaction pooler** → للتشغيل (Vercel / serverless) |
| `:5432` | **session pooler** → للمايجريشن (نفس الوصلة بس بورت مختلف) |

> **الفرق ببساطة:** `6543` بيدي كل استعلام كونكشن مختلف (ممتاز للسيرفرلس، بس مبيعرفش ينفّذ DDL مرتاح)،
> و`5432` بيمسك كونكشن كامل ليك (اللي المايجريشن محتاجاه).
>
> ⛔ فيه نوع تالت اسمه **Direct connection** (`db.xxxx.supabase.co`) — **متستخدمهوش على Vercel**، ده IPv6 بس وVercel مش هيوصله.

---

## الخطوة ٣ — حطها في `.env.local` على جهازك

في جذر المشروع، اعمل ملف اسمه `.env.local` (لو مش موجود) وحط فيه الوصلة **بعد ما تبدّل الباسورد**:

```bash
# .env.local  (الملف ده متجاهَل في .gitignore — مش هيترفع على GitHub)
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:الباسورد_بتاعك@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

⚠️ **لو الباسورد فيه رموز** زي `@` أو `#` أو `/` أو `:` لازم تعمله URL-encode:

| الرمز | تكتبه إزاي |
| --- | --- |
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| مسافة | `%20` |

أسهل حل: ولّد باسورد جديد من Supabase من غير رموز غريبة.

---

## الخطوة ٤ — اعمل الجداول (المايجريشن)

المايجريشن بتتنفّذ على بورت **5432** مش 6543. سطر واحد:

```bash
DATABASE_URL='postgresql://postgres.abcdefghijklmnop:الباسورد@aws-0-eu-central-1.pooler.supabase.com:5432/postgres' npm run db:migrate
```

(لاحظ: نفس الوصلة بالظبط، بس `5432` بدل `6543`، وبين `'` عشان الرموز.)

✅ **المفروض تشوف:**

```
✓ المايجريشن اتنفّذت بنجاح.
✓ الجداول موجودة: bookings · payments · subscriptions
```

---

### 🅱️ بديل الخطوة ٤ — من غير ما تشغّل أي حاجة على جهازك

مش عايز/مش قادر تشغّل الأوامر محليًا (مفيش Node، أو الشبكة بتاعتك بتحجب بورت 5432)؟ اعمل الجداول من المتصفح:

1. Supabase ← من القايمة الشمال **SQL Editor** ← **New query**.
2. افتح ملف **[`drizzle/supabase-setup.sql`](../drizzle/supabase-setup.sql)** من الريبو ← انسخه **كله** ← الزقه.
3. دوس **Run** (أو `Ctrl+Enter`). المفروض يقول **Success**.
4. (اختياري) نفس الحكاية مع **[`drizzle/supabase-seed.sql`](../drizzle/supabase-seed.sql)** — بيانات ديمو لآخر ٧ أيام عشان `/admin` تبان مليانة.
5. اتأكد: **Table Editor** ← لازم تلاقي `bookings` و`subscriptions` و`payments`.

الملف ده مش بس بيعمل الجداول — كمان بيسجّل المايجريشن في `drizzle.__drizzle_migrations` بنفس الـ hash،
يعني لو شغّلت `npm run db:migrate` بعد كده مش هيحاول يعملها تاني ولا هيقع بـ «already exists».

## الخطوة ٥ — اتأكد إن كله تمام

```bash
npm run db:check
```

السكربت ده بيقرأ `DATABASE_URL` من `.env.local` ويقولك: المزوّد إيه، الدرايفر إيه، الاتصال شغال في كام ملي ثانية، الجداول موجودة، فيها كام صف، ولو فيه مشكلة بيقولك حلها بالعربي.

✅ آخر سطر المفروض يبقى:

```
✓ كله تمام — الموقع هيخزّن في الداتابيز دي.
```

عايز اللوحة ما تبقاش فاضية؟ (اختياري)

```bash
npm run db:seed              # ٦ حجوزات + ٥ اشتراكات + ٧ مدفوعات على مدار آخر ٧ أيام
npm run db:seed -- --clear   # لمسحها بعدين (بيمسح صفوف DEMO- بس)
```

---

## الخطوة ٦ — جرّب على جهازك

```bash
npm run dev
```

1. افتح `http://localhost:3000` ← اعمل **حجز جلسة** بأي بيانات.
2. افتح `http://localhost:3000/admin` ← الباسورد الافتراضي للتطوير: `admin123`.
3. فوق اللوحة المفروض تلاقي شريط **أخضر**: «متوصّل بداتابيز — Supabase · postgres.js».
4. **الاختبار الحقيقي:** اقفل السيرفر (`Ctrl+C`) وشغّله تاني (`npm run dev`) ← افتح `/admin` ← **الحجز لسه موجود**. ده معناه إن التخزين بقى دايم.
5. تأكيد أخير من ناحية Supabase: لوحة Supabase ← **Table Editor** ← جدول `bookings` ← هتلاقي الصف.

---

## الخطوة ٧ — نفس الحاجة على Vercel (النشر)

1. [vercel.com](https://vercel.com) ← مشروعك ← **Settings** ← **Environment Variables**.
2. **Add New**:
   - **Key:** `DATABASE_URL`
   - **Value:** وصلة الـ **6543** (transaction pooler) بالباسورد الحقيقي.
   - **Environments:** علّم التلاتة — **Production** و**Preview** و**Development**.
3. **Save**.
4. تبويب **Deployments** ← آخر deployment ← القائمة (⋯) ← **Redeploy** (متعلّمش على "Use existing build cache").
5. بعد ما يخلص: افتح الموقع ← اعمل حجز ← افتح `/admin` ← لازم تلاقي الشريط الأخضر والحجز.

> متغيّرات البيئة بتتقرأ **وقت الـ build/deploy** — لو ضفت المتغير ونسيت تعمل Redeploy، الموقع هيفضل على الذاكرة.

---

## لو حاجة وقعت — جدول الأعطال

| الرسالة اللي شفتها | السبب | الحل |
| --- | --- | --- |
| `الباسورد لسه [YOUR-PASSWORD]` | نسخت الوصلة زي ما هي | بدّل `[YOUR-PASSWORD]` (والأقواس نفسها) بالباسورد |
| `password authentication failed` / `SASL` | باسورد غلط أو رموز مش متكوّدة | اعمل URL-encode للرموز، أو Reset database password من Supabase |
| `Tenant or user not found` | اليوزر ناقص الـ project ref، أو نسخت وصلة مشروع تاني | اليوزر لازم يكون `postgres.<project-ref>` مش `postgres` لوحده |
| `ENETUNREACH` / `EHOSTUNREACH` على IPv6 | مستخدم الـ **Direct connection** | استخدم وصلة `...pooler.supabase.com` |
| `ENOTFOUND` | الـ host متكتب غلط أو مفيش نت | راجع الـ host حرف بحرف من زرار Connect |
| `prepared statement "s1" already exists` | كونكشن على 6543 من غير `prepare:false` | المشروع بيعملها لوحده — لو ظهرت، اتأكد إنك بتستخدم `npm run db:migrate` مش `drizzle-kit migrate` |
| `relation "bookings" does not exist` | المايجريشن ما اتنفذتش على الداتابيز دي | ارجع للخطوة ٤ (وبورت 5432) |
| المايجريشن معلّقة / timeout | بتنفّذ على 6543 | استخدم 5432 |
| اللوحة لسه بتقول «وضع التجربة» | `DATABASE_URL` مش واصل للسيرفر | محليًا: الملف اسمه `.env.local` وأعد تشغيل `npm run dev`. على Vercel: المتغير متسجّل + **Redeploy** |
| `Max client connections reached` | كذا preview شغال على نفس الداتابيز | استنى شوية، أو من Supabase ← Database ← Connection pooling ارفع الـ pool size |

بعد أي محاولة إصلاح، السطر ده بيقولك وصلت لفين:

```bash
npm run db:check
```

---

## أسئلة بتتكرر

**هل الفري بلان يكفي؟** آه: 500MB داتابيز + 5GB نقل شهريًا. المشروع ده بيخزّن نصوص وأرقام بس، يعني آلاف الحجوزات في ميجابايتات معدودة.

**Supabase بتوقف المشروع لو مش مستخدم؟** آه، بعد ٧ أيام سكون في الخطة المجانية بيتعمله pause — بتفتح اللوحة وتدوس **Restore** ويرجع بالداتا.

**أنا مستخدم Neon قبل كده — هيبوظ؟** لأ. الكود بيختار الدرايفر من الـ host: `*.neon.tech` → درايفر Neon على HTTP، وأي حاجة تانية (Supabase وغيرها) → postgres.js. تقدر تجبره بـ `DATABASE_DRIVER=neon|postgres`.

**عايز أرجع لوضع الذاكرة؟** امسح (أو علّق) سطر `DATABASE_URL` وأعد التشغيل. الداتا في Supabase هتفضل مكانها.

**فين رقم الكارت في الداتابيز؟** مفيش. جدول `payments` فيه `brand` و`last4` بس، وفيه اختبارات + فحص في `npm run db:check` بيمنع دخول أي عمود لرقم كارت أو CVV. (والدفع نفسه محاكاة — مفيش فلوس بتتحرك.)

**هل أعمل commit لـ `.env.local`؟** لأ أبدًا — هو أصلًا في `.gitignore`. الوصلة بتتحط في Vercel من لوحة التحكم.

---

## ملخص الأوامر

```bash
npm run db:migrate            # ينشئ/يحدّث الجداول            (بورت 5432)
npm run db:check              # دكتور: الاتصال + الجداول + الصفوف
npm run db:seed               # بيانات ديمو لآخر ٧ أيام
npm run db:seed -- --clear    # امسح بيانات الديمو
npm run db:studio             # متصفح جداول محلي
npm run db:generate           # بعد ما تعدّل schema.ts → ملف SQL جديد في drizzle/
```

الشرح التقني (الدرايفر، السكيما، الـ idempotency، الـ SQL aggregates) في [README](../README.md#-الداتابيز-postgres--supabase--neon)، وخطوات النشر الكاملة في [docs/DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md).
