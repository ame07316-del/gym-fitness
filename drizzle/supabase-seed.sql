-- =====================================================================
-- FitZone Pro — بيانات ديمو للوحة /admin  (الزقها في Supabase ← SQL Editor ← Run)
-- =====================================================================
-- ٦ حجوزات · ٥ اشتراكات · ٧ مدفوعات موزّعة على آخر ٧ أيام (تواريخ نسبية).
-- كل الصفوف مفاتيحها بادئة بـ DEMO- وآمنة للتكرار.
-- للمسح:  delete from payments where reference like 'DEMO-%';
--         delete from subscriptions where order_id like 'DEMO-%';
--         delete from bookings where client_ref like 'DEMO-%';
-- ⚠️ مفيش أرقام كروت هنا — آخر ٤ أرقام والشبكة بس، زي الإنتاج بالظبط.
-- =====================================================================

BEGIN;


insert into bookings (client_ref, name, phone, goal, slot, plan, status, created_at) values
  ('DEMO-BK-1', 'أحمد سمير', '01099998888', 'تنشيف وتقسيم', '٤ – ٨ بالليل', 'برو', 'confirmed'::booking_status, now() - interval '0 days')
  on conflict (client_ref) do update set status = excluded.status, created_at = excluded.created_at;

insert into bookings (client_ref, name, phone, goal, slot, plan, status, created_at) values
  ('DEMO-BK-2', 'منى خالد', '01012345678', 'تخسيس وحرق دهون', '٦ – ٩ الصبح', 'أساسي', 'confirmed'::booking_status, now() - interval '0 days')
  on conflict (client_ref) do update set status = excluded.status, created_at = excluded.created_at;

insert into bookings (client_ref, name, phone, goal, slot, plan, status, created_at) values
  ('DEMO-BK-3', 'كريم عادل', '01155554444', 'تجهيز لبطولة', '٤ – ٨ بالليل', 'VIP إليت', 'pending'::booking_status, now() - interval '1 days')
  on conflict (client_ref) do update set status = excluded.status, created_at = excluded.created_at;

insert into bookings (client_ref, name, phone, goal, slot, plan, status, created_at) values
  ('DEMO-BK-4', 'سارة محمود', '01277776666', 'لياقة عامة وصحة', '١٢ – ٤ الضهر', 'برو', 'confirmed'::booking_status, now() - interval '2 days')
  on conflict (client_ref) do update set status = excluded.status, created_at = excluded.created_at;

insert into bookings (client_ref, name, phone, goal, slot, plan, status, created_at) values
  ('DEMO-BK-5', 'محمد الشناوي', '01033332222', 'تخسيس وحرق دهون', '٦ – ٩ الصبح', 'أساسي', 'confirmed'::booking_status, now() - interval '4 days')
  on conflict (client_ref) do update set status = excluded.status, created_at = excluded.created_at;

insert into bookings (client_ref, name, phone, goal, slot, plan, status, created_at) values
  ('DEMO-BK-6', 'نورهان فتحي', '01566667777', 'بناء عضلات', '٤ – ٨ بالليل', 'برو', 'pending'::booking_status, now() - interval '6 days')
  on conflict (client_ref) do update set status = excluded.status, created_at = excluded.created_at;

insert into subscriptions (order_id, member_name, member_phone, member_goal, plan_id, plan_name, cycle, months,
  addon_ids, coupon, payment, total, per_month, starts_at, ends_at, status, auto_renew, created_at) values
  ('DEMO-FZ-1', 'منى خالد', '01012345678', 'تخسيس', 'pro', 'برو', 'quarterly', 3,
   '["coach","nutrition"]'::jsonb, 'FIT10', 'card', 2870, 956,
   now() - interval '0 days', now() - interval '0 days' + interval '90 days', 'active'::subscription_status, true, now() - interval '0 days')
  on conflict (order_id) do update set total = excluded.total, addon_ids = excluded.addon_ids,
   status = excluded.status, created_at = excluded.created_at;

insert into subscriptions (order_id, member_name, member_phone, member_goal, plan_id, plan_name, cycle, months,
  addon_ids, coupon, payment, total, per_month, starts_at, ends_at, status, auto_renew, created_at) values
  ('DEMO-FZ-2', 'كريم عادل', '01155554444', 'تجهيز لبطولة', 'vip', 'VIP إليت', 'yearly', 12,
   '["recovery"]'::jsonb, NULL, 'wallet', 15000, 1250,
   now() - interval '1 days', now() - interval '1 days' + interval '365 days', 'active'::subscription_status, true, now() - interval '1 days')
  on conflict (order_id) do update set total = excluded.total, addon_ids = excluded.addon_ids,
   status = excluded.status, created_at = excluded.created_at;

insert into subscriptions (order_id, member_name, member_phone, member_goal, plan_id, plan_name, cycle, months,
  addon_ids, coupon, payment, total, per_month, starts_at, ends_at, status, auto_renew, created_at) values
  ('DEMO-FZ-3', 'أحمد سمير', '01099998888', 'تنشيف', 'pro', 'برو', 'monthly', 1,
   '[]'::jsonb, NULL, 'card', 900, 900,
   now() - interval '2 days', now() - interval '2 days' + interval '30 days', 'active'::subscription_status, true, now() - interval '2 days')
  on conflict (order_id) do update set total = excluded.total, addon_ids = excluded.addon_ids,
   status = excluded.status, created_at = excluded.created_at;

insert into subscriptions (order_id, member_name, member_phone, member_goal, plan_id, plan_name, cycle, months,
  addon_ids, coupon, payment, total, per_month, starts_at, ends_at, status, auto_renew, created_at) values
  ('DEMO-FZ-4', 'سارة محمود', '01277776666', 'لياقة عامة', 'basic', 'أساسي', 'quarterly', 3,
   '["inbody"]'::jsonb, 'NEW25', 'install', 1485, 495,
   now() - interval '4 days', now() - interval '4 days' + interval '90 days', 'active'::subscription_status, true, now() - interval '4 days')
  on conflict (order_id) do update set total = excluded.total, addon_ids = excluded.addon_ids,
   status = excluded.status, created_at = excluded.created_at;

insert into subscriptions (order_id, member_name, member_phone, member_goal, plan_id, plan_name, cycle, months,
  addon_ids, coupon, payment, total, per_month, starts_at, ends_at, status, auto_renew, created_at) values
  ('DEMO-FZ-5', 'محمد الشناوي', '01033332222', 'تخسيس', 'basic', 'أساسي', 'monthly', 1,
   '[]'::jsonb, NULL, 'cash', 500, 500,
   now() - interval '6 days', now() - interval '6 days' + interval '30 days', 'expired'::subscription_status, true, now() - interval '6 days')
  on conflict (order_id) do update set total = excluded.total, addon_ids = excluded.addon_ids,
   status = excluded.status, created_at = excluded.created_at;

insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at) values
  ('DEMO-pi-1', 'DEMO-FZ-1', 2870, 'card', 'succeeded'::payment_status, 'visa', '4242', 'succeeded', now() - interval '0 days', now() - interval '0 days')
  on conflict (reference) do update set status = excluded.status, created_at = excluded.created_at;

insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at) values
  ('DEMO-pi-2', 'DEMO-FZ-2', 15000, 'wallet', 'succeeded'::payment_status, 'wallet', NULL, 'succeeded', now() - interval '1 days', now() - interval '1 days')
  on conflict (reference) do update set status = excluded.status, created_at = excluded.created_at;

insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at) values
  ('DEMO-pi-3', 'DEMO-FZ-3', 900, 'card', 'succeeded'::payment_status, 'mastercard', '4444', 'succeeded', now() - interval '2 days', now() - interval '2 days')
  on conflict (reference) do update set status = excluded.status, created_at = excluded.created_at;

insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at) values
  ('DEMO-pi-4', NULL, 1200, 'card', 'failed'::payment_status, 'visa', '0002', 'card_declined', now() - interval '3 days', now() - interval '3 days')
  on conflict (reference) do update set status = excluded.status, created_at = excluded.created_at;

insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at) values
  ('DEMO-pi-5', 'DEMO-FZ-4', 1485, 'install', 'succeeded'::payment_status, 'install', NULL, 'succeeded', now() - interval '4 days', now() - interval '4 days')
  on conflict (reference) do update set status = excluded.status, created_at = excluded.created_at;

insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at) values
  ('DEMO-pi-6', NULL, 700, 'card', 'requires_action'::payment_status, 'mada', '1234', 'requires_action', now() - interval '5 days', now() - interval '5 days')
  on conflict (reference) do update set status = excluded.status, created_at = excluded.created_at;

insert into payments (reference, order_id, amount, method, status, brand, last4, error_code, created_at, updated_at) values
  ('DEMO-pi-7', 'DEMO-FZ-5', 500, 'cash', 'succeeded'::payment_status, 'cash', NULL, 'succeeded', now() - interval '6 days', now() - interval '6 days')
  on conflict (reference) do update set status = excluded.status, created_at = excluded.created_at;


COMMIT;

-- للتأكد:
--   select (select count(*) from bookings) as bookings,
--          (select count(*) from subscriptions) as subscriptions,
--          (select count(*) from payments) as payments;
