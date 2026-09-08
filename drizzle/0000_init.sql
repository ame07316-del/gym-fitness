CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('requires_action', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'frozen', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "bookings" (
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
--> statement-breakpoint
CREATE TABLE "payments" (
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
--> statement-breakpoint
CREATE TABLE "subscriptions" (
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
--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");