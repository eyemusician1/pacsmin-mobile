-- Add persistent claim tracking for checklist behavior in mobile tabs.
-- Run this in Supabase SQL Editor.

begin;

alter table public.food_choices
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by text;

alter table public.bundle_choices
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by text;

-- Backfill existing rows so old records still appear in checklist ordering.
update public.food_choices
set claimed_at = coalesce(claimed_at, created_at)
where claimed_at is null;

update public.bundle_choices
set claimed_at = coalesce(claimed_at, created_at)
where claimed_at is null;

create index if not exists idx_food_choices_claimed_at on public.food_choices(claimed_at desc);
create index if not exists idx_bundle_choices_claimed_at on public.bundle_choices(claimed_at desc);

commit;
