# 🚀 النشر على Vercel (5 دقايق — المجاني كفاية للعرض)

الرابط الحي أهم من أي حاجة تانية في معرض الأعمال: الريكروتر مبيفتحش كود من غير ما يشوف الموقع شغال.

## 1) اربط الريبو

1. روح [vercel.com/new](https://vercel.com/new) ← **Import** ← اختار `ame07316-del/gym-fitness`.
2. Framework Preset: **Next.js** (هيكتشفه لوحده). Root Directory: فاضي. Build command: `npm run build` — Output directory: فاضي.
3. Node Version: **22.x** (نفس `.nvmrc`).
4. Environment Variables — **مفيش أي متغير مطلوب** عشان الموقع شغال على الـ Route Handlers بتاعته:
   - `DATABASE_URL` = رابط Postgres (Supabase أو Neon) — اختياري بس **مستحسن جدًا**، من غيره البيانات في الذاكرة وبتضيع مع كل deploy. التفاصيل في خطوة **1.6**.
   - `ADMIN_PASSWORD` = باسورد لوحة `/admin` (من غيره اللوحة بتتقفل في الإنتاج).
   - `NEXT_PUBLIC_SITE_URL` = `https://اسم-الموقع.vercel.app` (اختياري، بس بيظبط الـ `metadataBase` والـ OG والـ sitemap).
   - **متحطش** `BACKEND_URL` هنا — ده للربط المحلي بباك إند Laravel. لو بعدين عايز تطلع الـ API لباك إند شغال، حطه وقوّي `BACKEND_ONLY`.
5. Deploy. هيطلع معاك لينك زي `fitzone-pro-xxx.vercel.app`.

## 1.5) ⚠️ لو الرابط فتح صفحة «Log in to Vercel»

ده مش باج — ده **Vercel Deployment Protection** مقفول على الـ Preview deployments، وأي حد
بره حسابك مش هيشوف حاجة. الحل (مرة واحدة):

1. Vercel ← Project ← **Settings** ← **Deployment Protection**.
2. تحت **Vercel Authentication** اختار **Disabled for Preview and Production**
   (أو **Preview Only: System Bypass** لو عايز البريفيو محمي والـ production مفتوح).
3. احفظ، وافتح الرابط في **Incognito** تتأكد إن حد تاني بيشوفه فعلًا.

> ⚠️ **اتقاس فعليًا على المشروع ده**: الحماية شغّالة على **Preview و Production اتنين** —
> يعني بعد الدمج الرابط `https://gym-fitness-ame07316-5868s-projects.vercel.app` بيرجع
> «Protected Deployment – Log in to Vercel» لأي زائر. لازم الـ toggle تحت، مرة واحدة للمشروع كله.
> بعد ما تقفله، اختبر من تليفون تاني أو Incognito — متكتفيش إنك شفته من حسابك.

### الرابط ده هو الـ Production alias بتاع المشروع
`https://gym-fitness-ame07316-5868s-projects.vercel.app` — لو عايزه أقصر، من
Project ← Settings ← Domains اربط `fitzone-pro.vercel.app` أو `www.fitzone-pro.com`.

## 1.6) داتابيز حقيقية (Supabase أو Neon) — اختياري بس مستحسن

من غير داتابيز الموقع شغال ١٠٠٪ — بس التخزين in-memory، يعني كل instance جديدة في Vercel
بتبدأ من صفر وبيانات الأدمن بتضيع. أي Postgres بيحل المشكلة، والمشروع بيختار الدرايفر لوحده:
**Supabase** (postgres.js على الـ pooler) أو **Neon** (HTTP driver).

### الخيار أ) Supabase

1. [supabase.com](https://supabase.com) ← **New project** ← Region **Frankfurt (eu-central-1)** ← احفظ الـ Database password.
2. زرار **Connect** فوق ← تبويب **ORMs** ← **Drizzle**، وخد الوصلتين:
   - **Transaction pooler** — بورت `6543` → دي اللي تتحط في Vercel كـ `DATABASE_URL`.
   - **Session pooler** — بورت `5432` → للمايجريشن بس.
3. Vercel ← Settings ← **Environment Variables** ← `DATABASE_URL` = وصلة الـ **6543** لـ Production + Preview + Development.
4. نفّذ المايجريشن مرة واحدة من جهازك بوصلة الـ **5432**:

```bash
DATABASE_URL='postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres' \
  npm run db:migrate
```

5. **Redeploy** المشروع، وافتح **Supabase ← Table Editor** بعد أول حجز تشوف الصفوف.

> ⚠️ **متستخدمش الـ Direct connection** (`db.<ref>.supabase.co:5432`) على Vercel — IPv6 بس ومش هيتوصل.
> والـ transaction pooler مبيدعمش prepared statements، عشان كده الأدابتر بيبعت `prepare: false` و`max: 1` أوتوماتيك.

### الخيار ب) Neon

#### الطريقة الأسرع — من داخل Vercel

1. Vercel ← Project ← **Storage** ← **Create Database** ← اختار **Neon (Serverless Postgres)** ← Region: أقرب حاجة لمصر (`fra1` / Frankfurt).
2. Vercel بيحط المتغيرات لوحده في المشروع (`DATABASE_URL` و `POSTGRES_URL` …) لكل البيئات. المشروع بيقرا أي واحد فيهم.
3. من جهازك، اسحب المتغيرات ونفّذ المايجريشن **مرة واحدة**:

```bash
npx vercel env pull .env.local     # بيجيب DATABASE_URL في ملف محلي
npm run db:migrate                 # ينشئ bookings / subscriptions / payments
```

#### أو من موقع Neon مباشرة

1. [neon.tech](https://neon.tech) ← New Project ← Region **Europe (Frankfurt)** ← Copy **Connection string (Pooled)**.
2. Vercel ← Settings ← **Environment Variables** ← أضف `DATABASE_URL` بالقيمة دي لـ Production + Preview + Development.
3. محليًا: حطها في `.env.local` وشغّل `npm run db:migrate`.
4. **Redeploy** المشروع في Vercel (المتغيرات الجديدة مش بتتطبق على deployment قديم).

### اتأكد إنها شغالة (الاتنين)

```bash
curl -s -X POST https://موقعك.vercel.app/api/bookings -H 'Content-Type: application/json' \
  -d '{"name":"تجربة نيون","phone":"01012345678"}'      # → 201 ok:true
```
افتح `/admin` (بالباسورد بتاعك) وشوف الحجز — بعدين اعمل **Redeploy** وافتح تاني: لو الحجز لسه موجود يبقى الداتابيز شغالة فعلًا.

> **ملاحظات:**
> - استخدم دايمًا الوصلة الـ **Pooled** (اللي فيها `pooler`) في الاتنين — الـ serverless بيفتح كونكشنز كتير قصيرة.
> - عايز تجبر درايفر معيّن؟ `DATABASE_DRIVER=neon|postgres` (الافتراضي بيتحدد من الـ host).
> - المايجريشن **مش** بتتنفّذ أثناء الـ build (عن قصد: build مايعملش DDL على قاعدة إنتاج). نفّذها من جهازك أو من CI بأمر واضح.
> - عايز ترجع لوضع الذاكرة؟ امسح `DATABASE_URL` وخلاص — مفيش كود بيتغير.
> - زرار «مسح البيانات» في الأدمن متاح في وضع الـ sandbox بس (`NEXT_PUBLIC_PAYMENT_PROVIDER=sandbox`).

## 2) لو عايز رابط ثابت (الأحلى في السيرة الذاتية)

- **دومين بـ 15$/سنة** (`.com` أو `.me`) من Porkbun/Namecheap ← Vercel ← Domains ← Add.
- أو استخدم يوزرنيمك على Vercel: `project-name-username.vercel.app` (كفاية للـ portfolio).

## 3) بعد ما يطلع

- [ ] افتح الرابط في **Incognito** من تليفون تاني — تتأكد إن الحماية مقفولة فعلًا.
- [ ] افتحه على **الموبايل** من التليفون نفسه (مش DevTools بس).
- [ ] جرّب الاشتراك للنهاية: باقة ← كوبون `FIT10` ← كارت `4242 4242 4242 4242` ← `000000` (يفشل بالنية) ← `483920` (ينجح).
- [ ] شغّل **Lighthouse** (DevTools ← Lighthouse ← Performance + Accessibility + Best practices + SEO) وسجّل الأرقام في الـ README.
- [ ] اتأكد إن `/sitemap.xml` و`/robots.txt` راجعين 200 (مضبوطين في `app/sitemap.ts` و`app/robots.ts`).
- [ ] لو ربطت داتابيز (Supabase/Neon): اعمل حجز → **Redeploy** → افتح `/admin` وشوف الحجز لسه موجود.

> 💾 **عن التخزين:** لو حطيت `DATABASE_URL` (خطوة 1.6) البيانات بتتخزن في Postgres (Supabase/Neon) وبتفضل بعد كل deploy.
> من غيره التخزين in-memory — كل instance serverless جديدة بتنسى الحجوزات القديمة، وده مقبول للعرض
> بشرط تقوله بوضوح ("zero-config demo mode; set `DATABASE_URL` for real persistence").

## 4) بدائل لو Vercel مرفوض

| الخدمة | ملاحظة |
| --- | --- |
| Netlify | نفس الفكرة، يقرأ `next.config.ts` عادي مع adapter |
| Cloudflare Pages | أسرع في مصر شوية، محتاج `@opennextjs/cloudflare` |
| VPS مصري (Hostegyypt/…)| لو عايز `pm2` + Laravel على نفس السيرفر — ده بيخلي `BACKEND_URL=http://127.0.0.1:8000` أقرب وأمتن |
