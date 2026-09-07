# عقد الوصلة بين الفرونت والباك إند 🔌

كل نداءات الواجهة بتعدي من ملف واحد: **`app/lib/api.ts`**. يعني مفيش `fetch` مبعثر في الكمبونents، ومفيش URL هتدوّر عليه.

## 1) التفعيل (3 أسطر في ملف بيئة)

```bash
# .env.local
BACKEND_URL=http://127.0.0.1:8000          # بروكسي لكل /api/* ← الأنسب (من غير CORS)
# BACKEND_ONLY=bookings,subscribe,quote     # اختياري: البروكسي للمسارات دي بس
```

| الوضع | اللي بيحصل |
| --- | --- |
| `BACKEND_URL` فاضي | الفرونت بيستخدم الـ Route Handlers المحلية (`app/api/*`) = وضع التجربة |
| `BACKEND_URL` متظبوط | كل `/api/*` بيتحول للباك إند **قبل** ما Next يشوف الملفاته (`beforeFiles` في `next.config.ts`) — **ما عدا `/api/admin/*`** اللي بتفضل محلية لأن الجلسات والصلاحيات في داتابيز نكست |
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

### `POST /api/subscribe` — تسجيل طلب اشتراك

> ⚠️ **السيرفر هو اللي بيحسب الفلوس.** الطلب مابيبعتش `total` ولا `perMonth` ولا `months`
> ولا `endsAt` ولا `orderId` — ولو بعتهم بيتتجاهلوا تمامًا. ده كان أخطر بند في مراجعة الأمان.

```jsonc
// request — اختيارات بس + بيانات العضو
{ "planId": "pro", "cycle": "quarterly", "addonIds": ["coach","nutrition"], "coupon": "FIT10",
  "member": { "name": "منى خالد", "phone": "01099999999", "goal": "لياقة عامة وصحة" },
  "payment": "wallet" | "cash", "paymentRef": "01012345678" }

// 201 — الأرقام كلها محسوبة على السيرفر، والحالة pending لحد تأكيد الإدارة
{ "ok": true,
  "order": { "orderId": "FZ-MTR2K3QY-A9E560", "planId": "pro", "planName": "برو", "cycle": "quarterly",
             "months": 3, "addonIds": ["coach","nutrition"], "coupon": "FIT10",
             "total": 2870, "perMonth": 956, "payment": "wallet", "paymentRef": "01012345678",
             "status": "pending", "createdAt": 1788601971936, "endsAt": 1796377971936,
             "member": { "name": "منى خالد", "phone": "01099999999", "goal": "…" } },
  "invoice": "INV-FZ-MTR2K3QY-A9E560",
  "message": "تم تسجيل طلب عضوية منى خالد — برو. الاشتراك هيتفعّل بعد تأكيد التحويل." }

// 422 — باقة/مدة/إضافة/كوبون/طريقة دفع مش صحيحة
{ "error": "بيانات الاشتراك غير مكتملة", "fields": { "planId": "الباقة دي مش موجودة" } }
```

`GET /api/subscribe` → إحصائيات (`total`, `revenue`, `byPlan`) للداشبورد.
🔒 **محمي**: محتاج كوكي جلسة إدارية + صلاحية `subscriptions:read`، وبيرجع `401` من غيرها.
`revenue` بترجع `null` للأدوار اللي مالهاش `revenue:read` (الاستقبال/الكوتش)، والكوتش بيشوف أعضاءه بس.
نفس الكلام على `GET /api/bookings`. (قبل كده الاتنين كانوا مفتوحين للعالم وبيرجعوا أسماء وتليفونات — دي كانت ثغرة واتقفلت.)

### `POST /api/quote` — التسعيرة الرسمية

عام (بس عليه rate limit) — الواجهة بتعرض حسابها المحلي فورًا، والسيرفر هو المرجع.

```jsonc
// request
{ "planId": "pro", "cycle": "yearly", "addonIds": ["nutrition"], "coupon": "FIT10" }

// 200
{ "ok": true,
  "draft": { "planId": "pro", "cycle": "yearly", "addonIds": ["nutrition"], "coupon": "FIT10" },
  "quote": { "planName": "برو", "cycleLabel": "سنوي", "months": 12, "subtotal": 13200,
             "cycleDiscount": 2376, "couponDiscount": 1082.4, "net": 9741.6, "vat": 1363.82,
             "total": 11105.42, "perMonth": 925.45, "coupon": "FIT10", "couponError": null } }

// 422 — قيم مش موجودة في الكتالوج
{ "error": "بيانات الاشتراك غير صحيحة", "fields": { "cycle": "مدة الاشتراك دي مش موجودة" } }
```

### ❌ الدفع بالكروت — اتشال من المشروع خالص

`POST /api/pay` و `POST /api/pay/confirm` **اتمسحوا** (بيرجعوا 404 دلوقتي)، ومعاهم كل ما يخص
الكروت: خانات الكارت، فحص Luhn، اكتشاف الشعار، خطوة 3-D Secure، والأعمدة `card_brand`/`card_last4`.

الطريقة الحالية:

1. العضو بيختار `wallet` (تحويل فودافون كاش/إنستا باي) أو `cash` (دفع في الفرع).
2. الاشتراك بيتسجّل `pending` ومابيتحسبش في الإيراد.
3. موظف عنده `subscriptions:update` بيضغط **تأكيد الدفع** في `/admin`
   (`PATCH /api/admin/subscriptions/[orderId]` بـ `{"action":"confirm_payment"}`)
   → الحالة تبقى `active` مع `paid_at` + `paid_by` + سطر في سجل العمليات.

لو رجّعت بوابة أونلاين في المستقبل: خليها redirect/tokenization + webhook موقّع، وما ترجّعش
خانات الكارت للواجهة.

### `/api/admin/*` — لوحة الإدارة (بتفضل جوّه نكست)

| Endpoint | الميثود | الصلاحية المطلوبة |
| --- | --- | --- |
| `/api/admin/auth/login` | POST | — (بيرجع كوكي جلسة HttpOnly + `csrfToken`) |
| `/api/admin/auth/logout` | POST | جلسة |
| `/api/admin/auth/me` | GET | جلسة |
| `/api/admin/auth/password` | POST | جلسة (بيلغي كل الجلسات التانية) |
| `/api/admin/stats` | GET | `dashboard:view` |
| `/api/admin/subscriptions` | GET | `subscriptions:read` أو `:read:own` |
| `/api/admin/subscriptions/[orderId]` | PATCH | `subscriptions:update` (تأكيد دفع/تجميد/استئناف/إسناد كوتش) · `subscriptions:cancel` (إلغاء) |
| `/api/admin/subscriptions/[orderId]` | DELETE | `subscriptions:delete` (المدير العام بس) |
| `/api/admin/bookings` · `/[id]` | GET/PATCH/DELETE | `bookings:*` |
| `/api/admin/users` · `/[id]` | GET/POST/PATCH/DELETE | `users:read` / `users:manage` |
| `/api/admin/audit` | GET | `audit:read` |

كل طلب بيغيّر حالة لازم يبعت هيدر `x-csrf-token` بنفس قيمة الكوكي `fz_csrf`
(والسيرفر بيقارنها بالهاش المربوط بالجلسة). لو ناقصة → `403 { code: "csrf" }`.

**ثوابت لازم تتحافظ** (الواجهة بتقرا عليها): `ok`, `order.orderId`, `order.total`, `order.perMonth`, `order.months`, `order.endsAt`, `order.status` ∈ `pending|active|frozen|cancelled|expired`, `invoice`, `message`, و`fields` وقت الأخطاء. وأي حاجة تانية تزوّدها بتوصل في `res.data` من غير تعديل في الفرونت.

### قواعد الفيلدز المستخدمة في الواجهة
- الاسم: `trim().length >= 3`
- الموبايل: `/^(?:\+?2|002)?01[0-9]{9}$/` (المسافات والشرطات بتتشال الأول، و`+2`/`002` اختيارية)
- الباقة/المدة/الإضافات: لازم تكون موجودة في الكتالوج، وغير كده `422` (مفيش رجوع لقيمة افتراضية بصمت)
- طريقة الدفع: `wallet` أو `cash` بس
- المبالغ: **مابتتقبلش من العميل خالص** — بتتحسب على السيرفر

## 3) سكيل البوكسي في Laravel

```php
// routes/api.php
Route::post('/bookings',  [BookingController::class, 'store']);
Route::get('/bookings',   [BookingController::class, 'index']);
Route::post('/subscribe', [SubscriptionController::class, 'store']);
Route::get('/subscribe',  [SubscriptionController::class, 'stats']);
Route::post('/quote',     [SubscriptionController::class, 'quote']);   // تسعيرة رسمية
```

```php
// app/Http/Controllers/BookingController.php (هيكل مبدئي)
public function store(Request $r) {
    $data = $r->validate([
        'name'  => 'required|string|min:3|max:60',
        'phone' => ['required', 'regex:/^(?:\+?2|002)?01[0-9]{9}$/'],
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
  payment_ref varchar(64), paid_at timestamp null, paid_by varchar(36),
  status enum('pending','active','frozen','cancelled','expired') default 'pending',
  auto_renew tinyint(1) default 1, frozen_days_used smallint default 0,
  created_at timestamp default current_timestamp
);
-- ⚠️ مفيش جدول payments ولا أي عمود لبيانات الكروت — الدفع بره الموقع (محفظة/كاش)
```

## 4) ملاحظات مهمة
- **CORS**: لو مستخدم `BACKEND_URL` (بروكسي) مفيش CORS خالص. لو مستخدم `NEXT_PUBLIC_API_BASE` ضيف `config/cors.php` بـ `paths => ['api/*']` و `allowed_origins => [دومين الفرونت]`.
- **الأمان**: مفيش أي بيانات بطاقات في المنتج ده — لا في الواجهة ولا في الـ API ولا في الداتابيز. أقصى حاجة بتتخزن هي رقم المحفظة اللي العضو كتبه للمطابقة.
- **الأسعار**: `POST /api/subscribe` **لازم** يعيد حساب الإجمالي عندك (نفس منطق `app/lib/subscription.ts`) ويتجاهل أي مبلغ جاي من العميل، ويرفض أي `planId`/`cycle`/addon/coupon مش موجود بـ 422.
- **رقم الطلب**: بيتولّد على السيرفر. لو محتاج idempotency استخدم مفتاح `Idempotency-Key` في الهيدر بدل ما تسيب العميل يختار الـ id.
- **التفعيل**: الاشتراك بيبدأ `pending` وبيتحوّل `active` من لوحة الإدارة بس بعد تأكيد استلام الفلوس.

## 5) اتأكد إن الباك إند بتاعك متوافق في 10 ثواني
```bash
curl -s -X POST $BACKEND/api/bookings -H 'Content-Type: application/json' \
  -d '{"name":"تجربة","phone":"01012345678"}'          # → 201 ok:true
curl -s -X POST $BACKEND/api/bookings -H 'Content-Type: application/json' \
  -d '{"name":"x","phone":"12"}'                        # → 422 fields.phone
curl -s -X POST $BACKEND/api/quote -H 'Content-Type: application/json' \
  -d '{"planId":"pro","cycle":"yearly","addonIds":[],"coupon":"FIT10"}'  # → quote.total
curl -s -X POST $BACKEND/api/subscribe -H 'Content-Type: application/json' \
  -d '{"planId":"pro","cycle":"yearly","addonIds":[],"payment":"cash","total":1,
       "member":{"name":"تجربة التلاعب","phone":"01012345678"}}'          # → total الحقيقي مش 1
```

## 6) المرجع الرسمي للسلوك: اختبارات الفرونت نفسها

في `tests/api-contract.test.ts` فيه assertions بينادوا الـ route handlers المحلية ويأكدوا
كل حالة في العقد (201 تسجيل الطلب، 422 بـ `fields`، تجاهل المبالغ الجاية من العميل، رفض
الكوبون الغلط، ورفض أي طريقة دفع مش `wallet`/`cash`). يعني:

- لو حبيت تعرف «الصح إيه بالظبط» — اقرأ الملف ده، ده المواصفة مش الكلام.
- لما باك إندك يخلص، اسرق الـ `it(...)` دي وحولها لـ Pest/PHPUnit (نفس الـ payloads) —
  كده فريق الباك إند عنده تعريف جاهز للـ done.
- `npm test` في الريبو ده شغال في CI (`typecheck → lint → vitest → build`)، فمفيش احتمال
  العقد يتكسر من غير ما حد ياخد باله.

> للتشغيل اليدوي قدام باك إندك: `BACKEND_URL=http://127.0.0.1:8000 node scripts/mock-backend.mjs`
> بيديك ردود مطابقة للعقد من غير داتابيز — حط `BACKEND_URL` بتاعك على نفس البورت وقارن.

