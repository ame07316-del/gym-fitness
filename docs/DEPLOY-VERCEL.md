# 🚀 النشر على Vercel (5 دقايق — المجاني كفاية للعرض)

الرابط الحي أهم من أي حاجة تانية في معرض الأعمال: الريكروتر مبيفتحش كود من غير ما يشوف الموقع شغال.

## 1) اربط الريبو

1. روح [vercel.com/new](https://vercel.com/new) ← **Import** ← اختار `ame07316-del/gym-fitness`.
2. Framework Preset: **Next.js** (هيكتشفه لوحده). Root Directory: فاضي. Build command: `npm run build` — Output directory: فاضي.
3. Node Version: **22.x** (نفس `.nvmrc`).
4. Environment Variables — **مفيش أي متغير مطلوب** عشان الموقع شغال على الـ Route Handlers بتاعته:
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

الأنضج للمشروع الحي: ادمج البرانتش على `main` → الـ **Production** deployment بيطلع
بروكس الحماية مقفولة افتراضيًا، والرابط بيكون أقصر وأنضف.

## 2) لو عايز رابط ثابت (الأحلى في السيرة الذاتية)

- **دومين بـ 15$/سنة** (`.com` أو `.me`) من Porkbun/Namecheap ← Vercel ← Domains ← Add.
- أو استخدم يوزرنيمك على Vercel: `project-name-username.vercel.app` (كفاية للـ portfolio).

## 3) بعد ما يطلع

- [ ] افتح الرابط في **Incognito** من تليفون تاني — تتأكد إن الحماية مقفولة فعلًا.
- [ ] افتحه على **الموبايل** من التليفون نفسه (مش DevTools بس).
- [ ] جرّب الاشتراك للنهاية: باقة ← كوبون `FIT10` ← كارت `4242 4242 4242 4242` ← `000000` (يفشل بالنية) ← `483920` (ينجح).
- [ ] شغّل **Lighthouse** (DevTools ← Lighthouse ← Performance + Accessibility + Best practices + SEO) وسجّل الأرقام في الـ README.
- [ ] اتأكد إن `/sitemap.xml` و`/robots.txt` راجعين 200 (مضبوطين في `app/sitemap.ts` و`app/robots.ts`).

> ⚠️ ملاحظة مهمة: التخزين في `app/api/*` **in-memory** — يعني كل deployment/حالة serverless جديدة بتنسى الحجوزات القديمة.
> دي نقطة بتتحسبلك لو اتقالت بوضوح ("prototype persistence — next step: MySQL")، وبتتحسب عليك لو اتسكت عنها.

## 4) بدائل لو Vercel مرفوض

| الخدمة | ملاحظة |
| --- | --- |
| Netlify | نفس الفكرة، يقرأ `next.config.ts` عادي مع adapter |
| Cloudflare Pages | أسرع في مصر شوية، محتاج `@opennextjs/cloudflare` |
| VPS مصري (Hostegyypt/…)| لو عايز `pm2` + Laravel على نفس السيرفر — ده بيخلي `BACKEND_URL=http://127.0.0.1:8000` أقرب وأمتن |
