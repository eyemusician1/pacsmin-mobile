-- PACSMIN Mobile baseline schema for Supabase
-- Run in Supabase SQL Editor.

begin;

create table if not exists public.participants (
  id bigserial primary key,
  unique_id text not null unique,
  full_name text not null,
  society text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id bigserial primary key,
  participant_id bigint not null references public.participants(id) on delete cascade,
  attendance_date date not null,
  time_in time not null,
  created_at timestamptz not null default now(),
  constraint attendance_records_unique_per_day unique (participant_id, attendance_date)
);

create table if not exists public.food_choices (
  id bigserial primary key,
  participant_id bigint not null references public.participants(id) on delete cascade,
  choice text not null,
  choice_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint food_choices_unique_per_day unique (participant_id, choice_date)
);

create table if not exists public.bundle_choices (
  id bigserial primary key,
  participant_id bigint not null references public.participants(id) on delete cascade,
  choice text not null,
  choice_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint bundle_choices_unique_per_day unique (participant_id, choice_date)
);

create index if not exists idx_attendance_records_date on public.attendance_records(attendance_date);
create index if not exists idx_food_choices_date on public.food_choices(choice_date);
create index if not exists idx_bundle_choices_date on public.bundle_choices(choice_date);

-- Optional compatibility view because the mobile app checks for either
-- attendance_records or attendance.
create or replace view public.attendance as
select
  id,
  participant_id,
  attendance_date,
  time_in,
  created_at
from public.attendance_records;

alter table public.participants enable row level security;
alter table public.attendance_records enable row level security;
alter table public.food_choices enable row level security;
alter table public.bundle_choices enable row level security;

drop policy if exists participants_rw_auth on public.participants;
create policy participants_rw_auth
on public.participants
for all
to authenticated
using (true)
with check (true);

drop policy if exists attendance_records_rw_auth on public.attendance_records;
create policy attendance_records_rw_auth
on public.attendance_records
for all
to authenticated
using (true)
with check (true);

drop policy if exists food_choices_rw_auth on public.food_choices;
create policy food_choices_rw_auth
on public.food_choices
for all
to authenticated
using (true)
with check (true);

drop policy if exists bundle_choices_rw_auth on public.bundle_choices;
create policy bundle_choices_rw_auth
on public.bundle_choices
for all
to authenticated
using (true)
with check (true);

commit;

-- Optional seed row for quick scan testing.
-- Update unique_id if your QR decodes to a specific value.
insert into public.participants (unique_id, full_name, society)
values ('PACS-TEST-001', 'Abby Kezia Ybanez Bongcayao', 'MSU - MAIN Chemical Society')
on conflict (unique_id) do nothing;