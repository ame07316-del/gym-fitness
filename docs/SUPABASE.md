# ربط Supabase

المشروع يدعم Supabase اختياريًا لتخزين الحجوزات والاشتراكات بدل الـ in-memory store.
لو متغيرات Supabase غير موجودة، يظل الديمو شغالًا بالتخزين المؤقت المحلي.

## 1. إنشاء الجداول

1. أنشئ مشروعًا جديدًا في Supabase.
2. افتح **SQL Editor**.
3. انسخ ملف [`supabase/schema.sql`](../supabase/schema.sql) وشغّله مرة واحدة.
4. الجداول التي ينشئها:
   - `bookings`
   - `subscriptions`
   - `payments` (محجوز لربط بوابة الدفع الحقيقية)

الـ RLS مفعّل، ولا توجد صلاحيات للمتصفح مباشرة. السيرفر يستخدم Service Role فقط.

## 2. متغيرات البيئة

في `.env.local` محليًا أو Environment Variables في Vercel:

```env
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ضع_المفتاح_السري_هنا
ADMIN_API_TOKEN=توكن_إدارة_عشوائي_قوي
```

- `SUPABASE_SERVICE_ROLE_KEY` سر خطير: لا تضعه في `NEXT_PUBLIC_*` ولا في كود React ولا في Git.
- لا تحتاج الواجهة إلى Supabase client؛ كل الاتصال يتم من Route Handlers على السيرفر.
- أعد تشغيل Next.js بعد تغيير البيئة.

## 3. ماذا يتغير؟

مع وجود المتغيرات:

- `POST /api/bookings` يحفظ في Supabase.
- `GET /api/bookings` يقرأ من Supabase بعد توكن الإدارة.
- `POST /api/subscribe` يحفظ الاشتراك ويضمن عدم تكراره بنفس `orderId`.
- `GET /api/subscribe` يقرأ الإيرادات وتوزيع الباقات من Supabase.

بدون المتغيرات، كل هذه المسارات تستخدم fallback in-memory للعرض المحلي فقط.
لو Supabase متظبط لكنه لا يرد، الـ API يرجع `503` بدل ما يعلن نجاحًا كاذبًا أو يضيّع البيانات.

## 4. لوحة الإدارة

افتح `/admin` لمتابعة الحجوزات والاشتراكات والإيرادات. في الإنتاج أدخل نفس قيمة `ADMIN_API_TOKEN` الموجودة في بيئة السيرفر؛ الصفحة ترسلها في `Authorization: Bearer` فقط إلى مسارات الإدارة ولا تضعها في `NEXT_PUBLIC_*`.

للمعاينة المحلية فقط يمكن ضبط `ADMIN_DEMO_MODE=true` مع `NODE_ENV=development`، وستفتح اللوحة ببيانات الذاكرة التجريبية بدون إدخال توكن. هذا المسار مرفوض تلقائيًا في الإنتاج. إذا ظهر `401` في الوضع المحمي، تأكد من ضبط التوكن ثم أعد تشغيل Next.js. وجود صفحة `/admin` لا يلغي حماية `GET /api/bookings` و`GET /api/subscribe`.

## 5. اختبار سريع

```bash
curl -s -X POST http://localhost:3000/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{"name":"تجربة","phone":"01012345678","goal":"لياقة"}'

curl -s http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

قاعدة البيانات لا تجعل الدفع حقيقيًا وحدها؛ ما زال يجب ربط مزود دفع server-side وتخزين `gateway_reference` فقط، بدون PAN أو CVV أو OTP.
