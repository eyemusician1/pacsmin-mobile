-- Apply user-reported UID fixes and ensure food/bundle choices are aligned.
-- Run this in Supabase SQL Editor.

begin;

create temporary table desired_uid_fix (
  unique_id text primary key,
  full_name text not null,
  society text not null,
  food_choice text,
  bundle_choice text
) on commit drop;

insert into desired_uid_fix (unique_id, full_name, society, food_choice, bundle_choice) values
  ('SB9881', 'Syrille Glenn Baltazar Batingal', 'AdDACS', 'Beef Savory', 'LUMO BUNDLE'),
  ('MA5235', 'Ma. Sophia Rubillar Antigua', 'AdDACS', 'Beef Savory', 'LUMO BUNDLE'),
  ('JT3380', 'Jeremiah James Bayron Temosa', 'AdDACS', 'Beef Savory', 'LUMO BUNDLE'),
  ('SA1005', 'Steven Sam Dela Cruz Alombro', 'AdDACS', 'Chicken Ala King', 'LUMO BUNDLE'),
  ('JL9761', 'Joules Acre Figuracion Lao', 'AdDACS', 'Beef Savory', 'NON-PACSMIN MEMBERS'),
  ('GQ2498', 'Gia Erin Nazareno Quinones', 'AdDACS', 'Chicken Ala King', 'LUMO BUNDLE'),
  ('CR7157', 'Christian Nicholas Vicada Rubante', 'AdDACS', 'Beef Savory', 'LUMO BUNDLE'),
  ('JR9380', 'Joanna Angel Alipan Rivero', 'CMU Chemical Society', 'Beef Savory', 'HOMO BUNDLE'),
  ('RB5473', 'Richard Calderon Biescas', 'CMU Chemical Society', 'Beef Savory', 'HOMO BUNDLE'),
  ('LC2455', 'Loriezel Jane Leonor Calundre', 'CSU MAIN - Kapnayan', 'Chicken Ala King', 'LUMO BUNDLE'),
  ('CB1672', 'Crista T. Baloria', 'MSU- IIT Chemistry Society', 'Fish Fillet', 'LUMO BUNDLE'),
  ('SU7139', 'Sittieaisah Casan Umpara', 'MSU - MAIN Chemical Society', 'Chicken Ala King', 'HOMO BUNDLE');

-- Remove stale duplicate rows by name if they currently point to a different UID.
delete from public.participants p
using desired_uid_fix d
where lower(p.full_name) = lower(d.full_name)
  and p.unique_id <> d.unique_id;

-- Ensure each reported UID points to the intended participant.
insert into public.participants (unique_id, full_name, society)
select d.unique_id, d.full_name, d.society
from desired_uid_fix d
on conflict (unique_id) do update
set full_name = excluded.full_name,
    society = excluded.society;

-- Upsert today's food choices for these participants.
insert into public.food_choices (participant_id, choice_date, choice)
select p.id, current_date, d.food_choice
from desired_uid_fix d
join public.participants p on p.unique_id = d.unique_id
where d.food_choice is not null and d.food_choice <> ''
on conflict (participant_id, choice_date) do update
set choice = excluded.choice;

-- Upsert today's bundle choices for these participants.
insert into public.bundle_choices (participant_id, choice_date, choice)
select p.id, current_date, d.bundle_choice
from desired_uid_fix d
join public.participants p on p.unique_id = d.unique_id
where d.bundle_choice is not null and d.bundle_choice <> ''
on conflict (participant_id, choice_date) do update
set choice = excluded.choice;

commit;

-- Optional verification query:
-- select unique_id, full_name, society from public.participants where unique_id in
-- ('SB9881','MA5235','JT3380','SA1005','JL9761','GQ2498','CR7157','JR9380','RB5473','LC2455','CB1672','SU7139')
-- order by unique_id;
