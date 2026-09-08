-- =====================================================================
-- FitZone Pro — مسح كامل وإعادة بناء (Supabase ← SQL Editor ← Run)
-- =====================================================================
-- ☠️ تحذير: الملف ده **بيمسح كل الجداول والـ views والأنواع** اللي في
--    سكيما public — يعني كل حاجة في الداتابيز دي هتروح، بما فيها
--    site_content وأي حاجة من أدوات قديمة. مفيش تراجع.
--
--    شغّله بس لما تكون متأكد إنك عايز تبدأ من الصفر.
--
-- بيعمل إيه بالترتيب:
--   0) يمسح كل view + كل table + كل enum في public
--   1) يبني السكيما الصح: bookings · subscriptions · payments + الفهارس
--   2) يسجّل المايجريشن عند drizzle عشان npm run db:migrate ما يكررهاش
--
-- مش بيلمس: سكيمات Supabase الداخلية (auth · storage · extensions).
-- =====================================================================

BEGIN;

-- (0) مسح كل حاجة في public --------------------------------------------
DO $$
DECLARE r record;
BEGIN
	-- الـ views الأول (عشان مايعطّلوش مسح الجداول)
	FOR r IN SELECT table_name FROM information_schema.views WHERE table_schema = 'public' LOOP
		EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.table_name);
	END LOOP;

	FOR r IN SELECT matviewname AS n FROM pg_matviews WHERE schemaname = 'public' LOOP
		EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS public.%I CASCADE', r.n);
	END LOOP;

	-- الجداول
	FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
		EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
	END LOOP;

	-- الأنواع (enums) اللي المستخدم عملها
	FOR r IN
		SELECT t.typname FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname = 'public' AND t.typtype = 'e'
	LOOP
		EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
	END LOOP;

	-- سجل المايجريشن القديم (لو موجود)
	BEGIN
		EXECUTE 'DELETE FROM drizzle.__drizzle_migrations';
	EXCEPTION WHEN undefined_table OR invalid_schema_name THEN NULL;
	END;
END $$;

-- (1) السكيما ----------------------------------------------------------
DO $$ BEGIN
	CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
	CREATE TYPE "public"."payment_status" AS ENUM('requires_action', 'succeeded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
	CREATE TYPE "public"."subscription_status" AS ENUM('active', 'frozen', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_ref" varchar(24) NOT NULL,
	"name" varchar(60) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"goal" varchar(60),
	"slot" varchar(40),
	"plan" varchar(40),
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_client_ref_unique" UNIQUE("client_ref")
);

CREATE TABLE IF NOT EXISTS "payments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"reference" varchar(48) NOT NULL,
	"order_id" varchar(24),
	"amount" numeric(10, 2) NOT NULL,
	"method" varchar(12) NOT NULL,
	"status" "payment_status" DEFAULT 'requires_action' NOT NULL,
	"brand" varchar(16),
	"last4" varchar(4),
	"gateway_ref" varchar(64),
	"error_code" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" varchar(24) NOT NULL,
	"member_name" varchar(60) NOT NULL,
	"member_phone" varchar(20) NOT NULL,
	"member_goal" varchar(60),
	"plan_id" varchar(12),
	"plan_name" varchar(40),
	"cycle" varchar(12),
	"months" smallint DEFAULT 1 NOT NULL,
	"addon_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"coupon" varchar(20),
	"payment" varchar(12),
	"total" numeric(10, 2) NOT NULL,
	"per_month" numeric(10, 2) NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"frozen_days_used" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_order_id_unique" UNIQUE("order_id")
);

CREATE INDEX IF NOT EXISTS "bookings_created_at_idx" ON "bookings" USING btree ("created_at" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" USING btree ("status");
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments" USING btree ("created_at" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" USING btree ("status");
CREATE INDEX IF NOT EXISTS "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");

-- (2) تسجيل المايجريشن عند drizzle ------------------------------------
CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
	id SERIAL PRIMARY KEY,
	hash text NOT NULL,
	created_at bigint
);

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
SELECT '50c95e60b32cb805239377156d61f82907373446203e4837e1feac8b94bab5bd', 1788873360859
WHERE NOT EXISTS (
	SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '50c95e60b32cb805239377156d61f82907373446203e4837e1feac8b94bab5bd'
);

COMMIT;

-- =====================================================================
-- خلصت. للتأكد شغّل الاستعلام ده (المفروض يرجّع ٣ صفوف):
--   select table_name from information_schema.tables
--    where table_schema = 'public' order by table_name;
-- =====================================================================
