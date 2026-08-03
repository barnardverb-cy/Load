alter table public.workout_sessions
add column rest_between_exercises_seconds smallint not null default 90
check (rest_between_exercises_seconds between 0 and 3599);

drop function public.start_workout(uuid);

create function public.start_workout(
  target_template_id uuid,
  target_rest_between_exercises_seconds smallint
)
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

  if target_rest_between_exercises_seconds is null
    or target_rest_between_exercises_seconds not between 0 and 3599 then
    raise exception 'Rest between exercises must be between 0 and 59:59';
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

  insert into public.workout_sessions (
    user_id,
    template_id,
    program_name,
    rest_between_exercises_seconds
  ) values (
    current_user_id,
    source_template.id,
    source_template.name,
    target_rest_between_exercises_seconds
  )
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
      0
    from public.template_exercise_sets
    where template_exercise_id = source_exercise.template_exercise_id
    order by position;
  end loop;

  return new_session_id;
end;
$$;

revoke all on function public.start_workout(uuid, smallint) from public;
revoke all on function public.start_workout(uuid, smallint) from anon;
grant execute on function public.start_workout(uuid, smallint) to authenticated;
