-- FitZone Pro persistence schema for Supabase.
-- Run this once in Supabase Dashboard -> SQL Editor.
-- The application uses SUPABASE_SERVICE_ROLE_KEY only on the server.

create table if not exists public.bookings (
  id text primary key,
  name text not null check (char_length(name) between 3 and 60),
  phone text not null check (char_length(phone) between 10 and 20),
  goal text not null default 'غير محدد' check (char_length(goal) <= 60),
  slot text not null default 'أي وقت' check (char_length(slot) <= 40),
  plan text not null default 'استعلام' check (char_length(plan) <= 40),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at bigint not null
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

create table if not exists public.subscriptions (
  order_id text primary key,
  plan_id text not null check (plan_id in ('basic', 'pro', 'vip')),
  plan_name text not null check (char_length(plan_name) <= 40),
  cycle text not null check (cycle in ('monthly', 'quarterly', 'semiannual', 'yearly')),
  months integer not null check (months between 1 and 24),
  addon_ids text[] not null default '{}',
  coupon text,
  total numeric(12, 2) not null check (total > 0),
  per_month numeric(12, 2) not null check (per_month > 0),
  member_name text not null check (char_length(member_name) between 3 and 60),
  member_phone text not null check (char_length(member_phone) between 10 and 20),
  member_goal text not null default '' check (char_length(member_goal) <= 60),
  payment text not null check (payment in ('card', 'wallet', 'install', 'cash')),
  status text not null default 'active' check (status in ('active', 'frozen', 'cancelled', 'expired')),
  created_at bigint not null,
  ends_at bigint not null
);

create index if not exists subscriptions_created_at_idx on public.subscriptions (created_at desc);
create index if not exists subscriptions_plan_name_idx on public.subscriptions (plan_name);

-- Reserved for real gateway integration. Never add PAN, CVV, or OTP columns.
create table if not exists public.payments (
  reference text primary key,
  order_id text,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null check (method in ('card', 'wallet', 'install', 'cash')),
  status text not null check (status in ('requires_action', 'succeeded', 'failed')),
  provider text not null default 'sandbox',
  gateway_reference text,
  error_code text,
  created_at bigint not null
);

create index if not exists payments_created_at_idx on public.payments (created_at desc);

-- Deny direct browser access. The server service-role client bypasses RLS.
alter table public.bookings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
