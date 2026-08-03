create table public.fitness_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  starting_weight_kg numeric(6, 2) check (starting_weight_kg between 0 and 1000),
  goal_weight_kg numeric(6, 2) check (goal_weight_kg between 0 and 1000),
  starting_body_fat_percentage numeric(5, 2)
    check (starting_body_fat_percentage between 0 and 100),
  goal_body_fat_percentage numeric(5, 2)
    check (goal_body_fat_percentage between 0 and 100),
  daily_calorie_goal integer check (daily_calorie_goal between 0 and 20000),
  daily_protein_goal_g numeric(6, 1) check (daily_protein_goal_g between 0 and 2000),
  daily_water_goal_l numeric(5, 2) check (daily_water_goal_l between 0 and 100),
  daily_steps_goal integer check (daily_steps_goal between 0 and 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger fitness_goals_set_updated_at
before update on public.fitness_goals
for each row execute function public.set_updated_at();

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  calories integer check (calories between 0 and 50000),
  protein_g numeric(7, 1) check (protein_g between 0 and 5000),
  water_l numeric(6, 2) check (water_l between 0 and 100),
  steps integer check (steps between 0 and 500000),
  sleep_hours numeric(4, 2) check (sleep_hours between 0 and 24),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index daily_logs_user_date_idx
on public.daily_logs (user_id, log_date desc);

create trigger daily_logs_set_updated_at
before update on public.daily_logs
for each row execute function public.set_updated_at();

create table public.weekly_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  check_in_date date not null,
  weight_kg numeric(6, 2) check (weight_kg between 0 and 1000),
  body_fat_percentage numeric(5, 2) check (body_fat_percentage between 0 and 100),
  waist_inches numeric(6, 2) check (waist_inches between 0 and 200),
  chest_inches numeric(6, 2) check (chest_inches between 0 and 200),
  hips_inches numeric(6, 2) check (hips_inches between 0 and 200),
  arms_inches numeric(6, 2) check (arms_inches between 0 and 100),
  quads_inches numeric(6, 2) check (quads_inches between 0 and 100),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, check_in_date)
);

create index weekly_check_ins_user_date_idx
on public.weekly_check_ins (user_id, check_in_date desc);

create trigger weekly_check_ins_set_updated_at
before update on public.weekly_check_ins
for each row execute function public.set_updated_at();

alter table public.fitness_goals enable row level security;
alter table public.daily_logs enable row level security;
alter table public.weekly_check_ins enable row level security;

revoke all on table public.fitness_goals from anon;
revoke all on table public.daily_logs from anon;
revoke all on table public.weekly_check_ins from anon;

grant select, insert, update, delete on table public.fitness_goals to authenticated;
grant select, insert, update, delete on table public.daily_logs to authenticated;
grant select, insert, update, delete on table public.weekly_check_ins to authenticated;

create policy "Users manage their own fitness goals"
on public.fitness_goals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own daily logs"
on public.daily_logs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own weekly check-ins"
on public.weekly_check_ins for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
