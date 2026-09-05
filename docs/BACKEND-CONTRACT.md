# عقد الوصلة بين الفرونت والباك إند 🔌

كل نداءات الواجهة بتعدي من ملف واحد: **`app/lib/api.ts`**. يعني مفيش `fetch` مبعثر في الكمبونents، ومفيش URL هتدوّر عليه.

## 1) التفعيل (3 أسطر في ملف بيئة)

```bash
# .env.local
BACKEND_URL=http://127.0.0.1:8000          # بروكسي لكل /api/* ← الأنسب (من غير CORS)
# BACKEND_ONLY=bookings,subscribe           # اختياري: البروكسي للمسارات دي بس
# NEXT_PUBLIC_PAYMENT_PROVIDER=paymob       # لما تخلص شيت مفاتيح البوابة الحقيقية
```

| الوضع | اللي بيحصل |
| --- | --- |
| `BACKEND_URL` فاضي | الفرونت بيستخدم الـ Route Handlers المحلية (`app/api/*`) = وضع التجربة |
| `BACKEND_URL` متظبوط | كل `/api/*` بيتحول للباك إند **قبل** ما Next يشوف الملفاته (`beforeFiles` في `next.config.ts`) |
| `NEXT_PUBLIC_API_BASE` متظبوط | المتصفح بيكلم الباك إند مباشرة → محتاج CORS عندك |

## 2) الـ endpoints المطلوبة (نفس شكل الردود الحالية)

### `POST /api/bookings` — طلب جلسة تجريبية / استعلام
```jsonc
// request
{ "name": "محمود علي", "phone": "01012345678", "goal": "تخسيس وحرق دهون",
  "slot": "٤ – ٨ بالليل", "plan": "برو", "id": "BK-LZ3K9", "createdAt": 1788601971790 }

// 201
{ "ok": true, "booking": { "id": "BK-LZ3K9", "status": "confirmed" }, "message": "تم استلام طلب محمود…" }
// 422 (فيلدز)
{ "error": "بيانات ناقصة", "fields": { "phone": "رقم موبايل مصري غير صحيح" } }
```
> لو `fields` موجودة، الواجهة بتعرضها تحت كل حقل أوتوماتيك.

### `POST /api/subscribe` — تفعيل اشتراك
```jsonc
// request (كامل كائن العضوية من المتصفح)
{ "orderId": "FZ-2026-K3JD22", "planId": "pro", "planName": "برو", "cycle": "quarterly",
  "months": 3, "addonIds": ["coach","nutrition"], "coupon": "FIT10",
  "member": { "name": "منى خالد", "phone": "01099999999", "goal": "لياقة عامة وصحة" },
  "payment": "card", "total": 2870, "perMonth": 956,
  "startedAt": 1788601971936, "endsAt": 1870141971936, "status": "active",
  "autoRenew": true, "frozenAt": null, "frozenDaysUsed": 0 }

// 201
{ "ok": true, "order": { "orderId": "FZ-2026-K3JD22", "status": "active" }, "invoice": "INV-FZ-2026-K3JD22" }
```
`GET /api/subscribe` → إحصائيات (`total`, `revenue`, `byPlan`) للداشبورد.

### `POST /api/pay` — اعتماد عملية الدفع
```jsonc
// request
{ "method": "card" | "wallet" | "install" | "cash", "amount": 2870,
  "card": { "number": "4242 4242 4242 4242", "exp": "12/29", "cvv": "123", "holder": "MAHMOUD ALI" },
  "description": "FitZone Pro — باقة برو / ٣ شهور", "provider": "paymob" }

// 200 — محتاج تحقق إضافي (3-D Secure)
{ "ok": true, "status": "requires_action", "reference": "pi_s1_xxx", "amount": 2870,
  "brand": "visa", "last4": "4242", "message": "البنك طلب تحقق إضافي (3-D Secure)", "provider": "paymob" }

// 200 — خلص على طول (محفظة/تقسيط/كاش)
{ "ok": true, "status": "succeeded", "reference": "pi_s1_xxx", "message": "…" }

// 402 — رفض البنك
{ "ok": false, "status": "failed", "code": "card_declined", "message": "البنك رفض الكارت…" }
```

### `POST /api/pay/confirm` — تأكيد رمز الـ OTP
```jsonc
// request
{ "reference": "pi_s1_xxx", "code": "123456" }
// 200 → { "ok": true, "status": "succeeded", "reference": "…", "amount": 2870 }
// 401 → { "ok": false, "status": "requires_action", "message": "رمز التحقق غير صحيح…" }
// 404 → العملية مش موجودة / انتهت صلاحيتها
```

**ثوابت لازم تتحافظ** (الواجهة بتقرا عليها): `ok`, `status` ∈ `succeeded|requires_action|failed`, `reference`, `message`, `amount`. وأي حاجة تانية تزوّدها (invoice id, gateway id, payment_url) بتوصل في `res.data` من غير ما تحتاج تعديل في الفرونت.

### قواعد الفيلدز المستخدمة في الواجهة
- الاسم: `trim().length >= 3`
- الموبايل: `/^(\+?2)?01[0-9]{9}$/`
- القيمة: `total > 0` · `months` بين 1 و24 · `addonIds` مصفوفة ≤ 12 عنصر
- `code` للـ OTP: 6 أرقام

## 3) سكيل البوكسي في Laravel

```php
// routes/api.php
Route::post('/bookings',  [BookingController::class, 'store']);
Route::get('/bookings',   [BookingController::class, 'index']);
Route::post('/subscribe', [SubscriptionController::class, 'store']);
Route::get('/subscribe',  [SubscriptionController::class, 'stats']);
Route::post('/pay',        [PaymentController::class, 'authorize']);
Route::post('/pay/confirm',[PaymentController::class, 'confirm']);
```

```php
// app/Http/Controllers/BookingController.php (هيكل مبدئي)
public function store(Request $r) {
    $data = $r->validate([
        'name'  => 'required|string|min:3|max:60',
        'phone' => ['required', 'regex:/^(\+?2)?01[0-9]{9}$/'],
        'goal'  => 'nullable|string|max:60',
        'slot'  => 'nullable|string|max:40',
        'plan'  => 'nullable|string|max:40',
    ]);
    $b = Booking::create([...$data, 'status' => 'pending', 'client_ref' => $r->input('id')]);

    return response()->json([
        'ok' => true, 'booking' => ['id' => $b->client_ref, 'status' => 'confirmed'],
        'message' => "تم استلام طلب {$b->name} وهنتواصل معاك على {$b->phone}",
    ], 201);
}
```
فشل الفاليديشن في Laravel بيرجع `422 { message, errors: {...} }` — عشان الواجهة تقرأ `fields`، اربط `Handler` يعيد:
```php
response()->json(['error' => 'بيانات ناقصة', 'fields' => $e->errors()], 422);
```

### سكيل الجدول (MySQL)
```sql
create table bookings (
  id bigint auto_increment primary key, client_ref varchar(24) unique,
  name varchar(60) not null, phone varchar(20) not null,
  goal varchar(60), slot varchar(40), plan varchar(40),
  status enum('pending','confirmed','cancelled') default 'pending',
  created_at timestamp default current_timestamp
);
create table subscriptions (
  id bigint auto_increment primary key, order_id varchar(24) unique,
  member_name varchar(60), member_phone varchar(20), member_goal varchar(60),
  plan_id varchar(12), plan_name varchar(40), cycle varchar(12), months smallint,
  addon_ids json, coupon varchar(20), payment varchar(12),
  total decimal(10,2), per_month decimal(10,2),
  starts_at date, ends_at date,
  status enum('active','frozen','cancelled','expired') default 'active',
  auto_renew tinyint(1) default 1, frozen_days_used smallint default 0,
  created_at timestamp default current_timestamp
);
create table payments (
  id bigint auto_increment primary key, reference varchar(48) unique,
  order_id varchar(24), amount decimal(10,2), method varchar(12),
  status enum('requires_action','succeeded','failed') default 'requires_action',
  gateway_ref varchar(64), error_code varchar(32), created_at timestamp default current_timestamp
);
```

## 4) ملاحظات مهمة
- **CORS**: لو مستخدم `BACKEND_URL` (بروكسي) مفيش CORS خالص. لو مستخدم `NEXT_PUBLIC_API_BASE` ضيف `config/cors.php` بـ `paths => ['api/*']` و `allowed_origins => [رANGE الموقع]`.
- **الأمان**: متسجلش أرقام بطاقات أبدًا. ابعت الكارت للبوابة (Paymob/Fawry/Stripe tokenization) وخزّن `gateway_ref` بس. الواجهة أصلاً بتبعت `card` للـ endpoint بتاعكم ومنه للبوابة — ماتخليش اللوجز يسجل البودي.
- **idempotency**: الواجهة بتبعت `orderId`/`id` ثابت — استخدمه كمفتاح فريد عشان لو الطلب اتعمل مرتين (ضعف شبكة) ميتعملش مزدوج.
- **idempotent OTP**: لو `reference` اتأكدت قبل كده، ارجع `succeeded` تاني بدل 404.
- **الأسعار**: الحساب كله في الفرونت (`app/lib/subscription.ts`). في الإنتاج لازم **إعادة حساب الـ total سيرفرًا** وتطابقه، ومتقبلش رقم العميل.

## 5) اتأكد إن الباك إند بتاعك متوافق في 10 ثواني
```bash
curl -s -X POST $BACKEND/api/bookings -H 'Content-Type: application/json' \
  -d '{"name":"تجربة","phone":"01012345678"}'          # → 201 ok:true
curl -s -X POST $BACKEND/api/bookings -H 'Content-Type: application/json' \
  -d '{"name":"x","phone":"12"}'                        # → 422 fields.phone
curl -s -X POST $BACKEND/api/pay -H 'Content-Type: application/json' \
  -d '{"method":"card","amount":100,"card":{"number":"4242 4242 4242 4242"}}'   # → requires_action
```
ولو عايز تقارن بالردود الحالية، شغّل الفرونت من غير `BACKEND_URL` واطر نفس الطلبات على `http://localhost:3000/api/...`.
