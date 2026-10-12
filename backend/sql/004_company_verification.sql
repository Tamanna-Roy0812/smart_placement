-- Companies added by a placement officer start unverified and stay hidden
-- from students until an admin approves them. Existing companies and
-- companies added by the admin count as verified. Safe to run more than once.
alter table public.companies add column if not exists is_verified boolean not null default true;
