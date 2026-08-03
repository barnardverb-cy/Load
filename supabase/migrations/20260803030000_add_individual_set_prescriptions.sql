create table public.template_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  template_exercise_id uuid not null
    references public.template_exercises (id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  min_reps smallint not null check (min_reps between 1 and 100),
  max_reps smallint not null check (max_reps between min_reps and 100),
  starting_weight numeric(8, 2) not null check (starting_weight between 0 and 10000),
  weight_increment numeric(7, 2) not null check (weight_increment > 0 and weight_increment <= 1000),
  rest_seconds smallint not null default 90 check (rest_seconds between 0 and 3600),
  progression_type text not null default 'double_progression'
    check (progression_type in ('double_progression')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_exercise_id, position)
);

comment on table public.template_exercise_sets is
  'Ordered, independently configurable working sets within a template exercise.';

insert into public.template_exercise_sets (
  template_exercise_id,
  position,
  min_reps,
  max_reps,
  starting_weight,
  weight_increment,
  rest_seconds,
  progression_type
)
select
  template_exercises.id,
  generated_set.position,
  template_exercises.min_reps,
  template_exercises.max_reps,
  template_exercises.starting_weight,
  template_exercises.weight_increment,
  template_exercises.rest_seconds,
  template_exercises.progression_type
from public.template_exercises
cross join lateral generate_series(1, template_exercises.set_count) as generated_set(position);

alter table public.template_exercises
  drop column set_count,
  drop column min_reps,
  drop column max_reps,
  drop column starting_weight,
  drop column weight_increment,
  drop column rest_seconds,
  drop column progression_type;

create index template_exercise_sets_parent_position_idx
on public.template_exercise_sets (template_exercise_id, position);

create trigger template_exercise_sets_set_updated_at
before update on public.template_exercise_sets
for each row
execute function public.set_updated_at();

alter table public.template_exercise_sets enable row level security;

revoke all on table public.template_exercise_sets from anon;
grant select, insert, update, delete on table public.template_exercise_sets to authenticated;

create policy "Users can read sets in their own templates"
on public.template_exercise_sets for select to authenticated
using (
  exists (
    select 1
    from public.template_exercises
    join public.workout_templates
      on workout_templates.id = template_exercises.template_id
    where template_exercises.id = template_exercise_sets.template_exercise_id
      and workout_templates.user_id = (select auth.uid())
  )
);

create policy "Users can add sets to their own templates"
on public.template_exercise_sets for insert to authenticated
with check (
  exists (
    select 1
    from public.template_exercises
    join public.workout_templates
      on workout_templates.id = template_exercises.template_id
    where template_exercises.id = template_exercise_sets.template_exercise_id
      and workout_templates.user_id = (select auth.uid())
  )
);

create policy "Users can update sets in their own templates"
on public.template_exercise_sets for update to authenticated
using (
  exists (
    select 1
    from public.template_exercises
    join public.workout_templates
      on workout_templates.id = template_exercises.template_id
    where template_exercises.id = template_exercise_sets.template_exercise_id
      and workout_templates.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.template_exercises
    join public.workout_templates
      on workout_templates.id = template_exercises.template_id
    where template_exercises.id = template_exercise_sets.template_exercise_id
      and workout_templates.user_id = (select auth.uid())
  )
);

create policy "Users can remove sets from their own templates"
on public.template_exercise_sets for delete to authenticated
using (
  exists (
    select 1
    from public.template_exercises
    join public.workout_templates
      on workout_templates.id = template_exercises.template_id
    where template_exercises.id = template_exercise_sets.template_exercise_id
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
declare
  exercise_entry record;
  set_entry record;
  new_template_exercise_id uuid;
begin
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'items must be a JSON array';
  end if;

  delete from public.template_exercises
  where template_id = target_template_id;

  for exercise_entry in
    select value, ordinality
    from jsonb_array_elements(items) with ordinality
  loop
    if jsonb_typeof(exercise_entry.value -> 'sets') is distinct from 'array' then
      raise exception 'each exercise must contain a sets array';
    end if;

    if jsonb_array_length(exercise_entry.value -> 'sets') not between 1 and 20 then
      raise exception 'each exercise must contain between 1 and 20 sets';
    end if;

    insert into public.template_exercises (
      template_id,
      exercise_id,
      position
    )
    values (
      target_template_id,
      (exercise_entry.value ->> 'exercise_id')::uuid,
      exercise_entry.ordinality::smallint
    )
    returning id into new_template_exercise_id;

    for set_entry in
      select value, ordinality
      from jsonb_array_elements(exercise_entry.value -> 'sets') with ordinality
    loop
      insert into public.template_exercise_sets (
        template_exercise_id,
        position,
        min_reps,
        max_reps,
        starting_weight,
        weight_increment,
        rest_seconds,
        progression_type
      )
      values (
        new_template_exercise_id,
        set_entry.ordinality::smallint,
        (set_entry.value ->> 'min_reps')::smallint,
        (set_entry.value ->> 'max_reps')::smallint,
        (set_entry.value ->> 'starting_weight')::numeric,
        (set_entry.value ->> 'weight_increment')::numeric,
        (set_entry.value ->> 'rest_seconds')::smallint,
        'double_progression'
      );
    end loop;
  end loop;
end;
$$;

revoke all on function public.replace_template_exercises(uuid, jsonb) from public;
revoke all on function public.replace_template_exercises(uuid, jsonb) from anon;
grant execute on function public.replace_template_exercises(uuid, jsonb) to authenticated;
