create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references public.workout_templates (id) on delete set null,
  program_name text not null check (char_length(trim(program_name)) between 1 and 100),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= started_at),
  check (
    (status = 'in_progress' and completed_at is null)
    or (status in ('completed', 'cancelled') and completed_at is not null)
  )
);

create unique index workout_sessions_one_active_per_user_idx
on public.workout_sessions (user_id)
where status = 'in_progress';

create index workout_sessions_user_started_idx
on public.workout_sessions (user_id, started_at desc);

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null check (char_length(trim(exercise_name)) between 1 and 100),
  muscle_group text not null,
  equipment text not null,
  position smallint not null check (position between 1 and 100),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, position)
);

create index workout_session_exercises_session_position_idx
on public.workout_session_exercises (session_id, position);

create trigger workout_session_exercises_set_updated_at
before update on public.workout_session_exercises
for each row execute function public.set_updated_at();

create table public.workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null
    references public.workout_session_exercises (id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  target_min_reps smallint not null check (target_min_reps between 1 and 100),
  target_max_reps smallint not null check (target_max_reps between target_min_reps and 100),
  target_weight numeric(8, 2) not null check (target_weight between 0 and 10000),
  weight_increment numeric(7, 2) not null check (weight_increment > 0 and weight_increment <= 1000),
  rest_seconds smallint not null check (rest_seconds between 0 and 3600),
  actual_reps smallint check (actual_reps between 0 and 1000),
  actual_weight numeric(8, 2) check (actual_weight between 0 and 10000),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_exercise_id, position),
  check (
    (status = 'pending' and completed_at is null)
    or (status = 'completed' and actual_reps is not null and actual_weight is not null and completed_at is not null)
    or (status = 'skipped' and completed_at is not null)
  )
);

create index workout_session_sets_exercise_position_idx
on public.workout_session_sets (session_exercise_id, position);

create trigger workout_session_sets_set_updated_at
before update on public.workout_session_sets
for each row execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_session_sets enable row level security;

revoke all on table public.workout_sessions from anon;
revoke all on table public.workout_session_exercises from anon;
revoke all on table public.workout_session_sets from anon;

grant select, insert, update on table public.workout_sessions to authenticated;
grant select, insert, update on table public.workout_session_exercises to authenticated;
grant select, insert, update on table public.workout_session_sets to authenticated;

create policy "Users can read their own workout sessions"
on public.workout_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own workout sessions"
on public.workout_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own workout sessions"
on public.workout_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read exercises in their own workout sessions"
on public.workout_session_exercises for select to authenticated
using (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = workout_session_exercises.session_id
      and workout_sessions.user_id = (select auth.uid())
  )
);

create policy "Users can create exercises in active workout sessions"
on public.workout_session_exercises for insert to authenticated
with check (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = workout_session_exercises.session_id
      and workout_sessions.user_id = (select auth.uid())
      and workout_sessions.status = 'in_progress'
  )
);

create policy "Users can update exercises in active workout sessions"
on public.workout_session_exercises for update to authenticated
using (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = workout_session_exercises.session_id
      and workout_sessions.user_id = (select auth.uid())
      and workout_sessions.status = 'in_progress'
  )
)
with check (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = workout_session_exercises.session_id
      and workout_sessions.user_id = (select auth.uid())
      and workout_sessions.status = 'in_progress'
  )
);

create policy "Users can read sets in their own workout sessions"
on public.workout_session_sets for select to authenticated
using (
  exists (
    select 1
    from public.workout_session_exercises
    join public.workout_sessions
      on workout_sessions.id = workout_session_exercises.session_id
    where workout_session_exercises.id = workout_session_sets.session_exercise_id
      and workout_sessions.user_id = (select auth.uid())
  )
);

create policy "Users can create sets in active workout sessions"
on public.workout_session_sets for insert to authenticated
with check (
  exists (
    select 1
    from public.workout_session_exercises
    join public.workout_sessions
      on workout_sessions.id = workout_session_exercises.session_id
    where workout_session_exercises.id = workout_session_sets.session_exercise_id
      and workout_sessions.user_id = (select auth.uid())
      and workout_sessions.status = 'in_progress'
  )
);

create policy "Users can update sets in active workout sessions"
on public.workout_session_sets for update to authenticated
using (
  exists (
    select 1
    from public.workout_session_exercises
    join public.workout_sessions
      on workout_sessions.id = workout_session_exercises.session_id
    where workout_session_exercises.id = workout_session_sets.session_exercise_id
      and workout_sessions.user_id = (select auth.uid())
      and workout_sessions.status = 'in_progress'
  )
)
with check (
  exists (
    select 1
    from public.workout_session_exercises
    join public.workout_sessions
      on workout_sessions.id = workout_session_exercises.session_id
    where workout_session_exercises.id = workout_session_sets.session_exercise_id
      and workout_sessions.user_id = (select auth.uid())
      and workout_sessions.status = 'in_progress'
  )
);

create or replace function public.start_workout(target_template_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  active_session_id uuid;
  source_template public.workout_templates%rowtype;
  source_exercise record;
  new_session_id uuid;
  new_session_exercise_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select id into active_session_id
  from public.workout_sessions
  where user_id = current_user_id and status = 'in_progress'
  limit 1;

  if active_session_id is not null then
    return active_session_id;
  end if;

  select * into source_template
  from public.workout_templates
  where id = target_template_id
    and user_id = current_user_id
    and is_archived = false;

  if not found then
    raise exception 'Program not found or archived';
  end if;

  if not exists (
    select 1
    from public.template_exercises
    join public.template_exercise_sets
      on template_exercise_sets.template_exercise_id = template_exercises.id
    where template_exercises.template_id = target_template_id
  ) then
    raise exception 'Add at least one exercise and set before starting';
  end if;

  insert into public.workout_sessions (user_id, template_id, program_name)
  values (current_user_id, source_template.id, source_template.name)
  returning id into new_session_id;

  for source_exercise in
    select
      template_exercises.id as template_exercise_id,
      template_exercises.position,
      exercises.id as exercise_id,
      exercises.name,
      exercises.muscle_group,
      exercises.equipment
    from public.template_exercises
    join public.exercises on exercises.id = template_exercises.exercise_id
    where template_exercises.template_id = target_template_id
    order by template_exercises.position
  loop
    insert into public.workout_session_exercises (
      session_id, exercise_id, exercise_name, muscle_group, equipment, position
    ) values (
      new_session_id,
      source_exercise.exercise_id,
      source_exercise.name,
      source_exercise.muscle_group,
      source_exercise.equipment,
      source_exercise.position
    ) returning id into new_session_exercise_id;

    insert into public.workout_session_sets (
      session_exercise_id,
      position,
      target_min_reps,
      target_max_reps,
      target_weight,
      weight_increment,
      rest_seconds
    )
    select
      new_session_exercise_id,
      position,
      min_reps,
      max_reps,
      starting_weight,
      weight_increment,
      rest_seconds
    from public.template_exercise_sets
    where template_exercise_id = source_exercise.template_exercise_id
    order by position;
  end loop;

  return new_session_id;
end;
$$;

create or replace function public.finish_workout(target_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workout_sessions
    where id = target_session_id
      and user_id = auth.uid()
      and status = 'in_progress'
  ) then
    if exists (
      select 1 from public.workout_sessions
      where id = target_session_id
        and user_id = auth.uid()
        and status = 'completed'
    ) then
      return;
    end if;
    raise exception 'Active workout not found';
  end if;

  if exists (
    select 1
    from public.workout_session_sets
    join public.workout_session_exercises
      on workout_session_exercises.id = workout_session_sets.session_exercise_id
    where workout_session_exercises.session_id = target_session_id
      and workout_session_sets.status = 'pending'
  ) then
    raise exception 'Complete or skip every set before finishing';
  end if;

  update public.workout_sessions
  set status = 'completed', completed_at = now()
  where id = target_session_id and user_id = auth.uid();
end;
$$;

create or replace function public.cancel_workout(target_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.workout_sessions
  set status = 'cancelled', completed_at = now()
  where id = target_session_id
    and user_id = auth.uid()
    and status = 'in_progress';

  if not found then
    raise exception 'Active workout not found';
  end if;
end;
$$;

revoke all on function public.start_workout(uuid) from public;
revoke all on function public.start_workout(uuid) from anon;
grant execute on function public.start_workout(uuid) to authenticated;

revoke all on function public.finish_workout(uuid) from public;
revoke all on function public.finish_workout(uuid) from anon;
grant execute on function public.finish_workout(uuid) to authenticated;

revoke all on function public.cancel_workout(uuid) from public;
revoke all on function public.cancel_workout(uuid) from anon;
grant execute on function public.cancel_workout(uuid) to authenticated;
