create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  muscle_group text not null check (
    muscle_group in (
      'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Glutes', 'Hamstrings',
      'Quadriceps', 'Calves', 'Core', 'Full Body', 'Cardio', 'Other'
    )
  ),
  equipment text not null check (
    equipment in (
      'Barbell', 'Dumbbells', 'Machine', 'Cable', 'Bodyweight',
      'Resistance Band', 'Kettlebell', 'Other'
    )
  ),
  notes text check (notes is null or char_length(notes) <= 1000),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index exercises_user_name_unique
on public.exercises (user_id, lower(trim(name)));

create index exercises_user_active_idx
on public.exercises (user_id, is_archived, name);

create trigger exercises_set_updated_at
before update on public.exercises
for each row
execute function public.set_updated_at();

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workout_templates_user_name_unique
on public.workout_templates (user_id, lower(trim(name)));

create index workout_templates_user_active_idx
on public.workout_templates (user_id, is_archived, name);

create trigger workout_templates_set_updated_at
before update on public.workout_templates
for each row
execute function public.set_updated_at();

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null check (position >= 1),
  set_count smallint not null check (set_count between 1 and 20),
  min_reps smallint not null check (min_reps between 1 and 100),
  max_reps smallint not null check (max_reps between min_reps and 100),
  starting_weight numeric(8, 2) not null check (starting_weight between 0 and 10000),
  weight_increment numeric(7, 2) not null check (weight_increment > 0 and weight_increment <= 1000),
  rest_seconds smallint not null default 90 check (rest_seconds between 0 and 3600),
  progression_type text not null default 'double_progression'
    check (progression_type in ('double_progression')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, exercise_id),
  unique (template_id, position)
);

create index template_exercises_template_position_idx
on public.template_exercises (template_id, position);

create trigger template_exercises_set_updated_at
before update on public.template_exercises
for each row
execute function public.set_updated_at();

alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;

revoke all on table public.exercises from anon;
revoke all on table public.workout_templates from anon;
revoke all on table public.template_exercises from anon;

grant select, insert, update, delete on table public.exercises to authenticated;
grant select, insert, update, delete on table public.workout_templates to authenticated;
grant select, insert, update, delete on table public.template_exercises to authenticated;

create policy "Users can read their own exercises"
on public.exercises for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own exercises"
on public.exercises for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own exercises"
on public.exercises for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own exercises"
on public.exercises for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own templates"
on public.workout_templates for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own templates"
on public.workout_templates for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own templates"
on public.workout_templates for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own templates"
on public.workout_templates for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read exercises in their own templates"
on public.template_exercises for select to authenticated
using (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
);

create policy "Users can add exercises to their own templates"
on public.template_exercises for insert to authenticated
with check (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.exercises
    where exercises.id = template_exercises.exercise_id
      and exercises.user_id = (select auth.uid())
  )
);

create policy "Users can update exercises in their own templates"
on public.template_exercises for update to authenticated
using (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.exercises
    where exercises.id = template_exercises.exercise_id
      and exercises.user_id = (select auth.uid())
  )
);

create policy "Users can remove exercises from their own templates"
on public.template_exercises for delete to authenticated
using (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = (select auth.uid())
  )
);

create or replace function public.replace_template_exercises(
  target_template_id uuid,
  items jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'items must be a JSON array';
  end if;

  delete from public.template_exercises
  where template_id = target_template_id;

  insert into public.template_exercises (
    template_id,
    exercise_id,
    position,
    set_count,
    min_reps,
    max_reps,
    starting_weight,
    weight_increment,
    rest_seconds,
    progression_type
  )
  select
    target_template_id,
    (item.value ->> 'exercise_id')::uuid,
    item.ordinality::smallint,
    (item.value ->> 'set_count')::smallint,
    (item.value ->> 'min_reps')::smallint,
    (item.value ->> 'max_reps')::smallint,
    (item.value ->> 'starting_weight')::numeric,
    (item.value ->> 'weight_increment')::numeric,
    (item.value ->> 'rest_seconds')::smallint,
    'double_progression'
  from jsonb_array_elements(items) with ordinality as item(value, ordinality);
end;
$$;

revoke all on function public.replace_template_exercises(uuid, jsonb) from public;
revoke all on function public.replace_template_exercises(uuid, jsonb) from anon;
grant execute on function public.replace_template_exercises(uuid, jsonb) to authenticated;
