alter table public.workout_session_exercises
add column template_exercise_id uuid
references public.template_exercises (id) on delete set null;

alter table public.workout_session_sets
add column template_exercise_set_id uuid
references public.template_exercise_sets (id) on delete set null;

alter table public.workout_session_sets
add column target_reps smallint;

update public.workout_session_sets
set target_reps = target_min_reps
where target_reps is null;

alter table public.workout_session_sets
alter column target_reps set not null;

alter table public.workout_session_sets
add constraint workout_session_sets_target_reps_range
check (target_reps between target_min_reps and target_max_reps);

create index workout_session_exercises_template_exercise_idx
on public.workout_session_exercises (template_exercise_id);

create index workout_session_sets_template_set_idx
on public.workout_session_sets (template_exercise_set_id);

drop function public.start_workout(uuid, smallint);

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
  source_set record;
  previous_set record;
  new_session_id uuid;
  new_session_exercise_id uuid;
  next_target_reps smallint;
  next_target_weight numeric(8, 2);
  target_achieved boolean;
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
      session_id,
      exercise_id,
      template_exercise_id,
      exercise_name,
      muscle_group,
      equipment,
      position
    ) values (
      new_session_id,
      source_exercise.exercise_id,
      source_exercise.template_exercise_id,
      source_exercise.name,
      source_exercise.muscle_group,
      source_exercise.equipment,
      source_exercise.position
    ) returning id into new_session_exercise_id;

    for source_set in
      select *
      from public.template_exercise_sets
      where template_exercise_id = source_exercise.template_exercise_id
      order by position
    loop
      next_target_reps := source_set.min_reps;
      next_target_weight := source_set.starting_weight;

      select
        workout_session_sets.status,
        workout_session_sets.target_reps,
        workout_session_sets.target_weight,
        workout_session_sets.actual_reps,
        workout_session_sets.actual_weight
      into previous_set
      from public.workout_session_sets
      join public.workout_session_exercises
        on workout_session_exercises.id = workout_session_sets.session_exercise_id
      join public.workout_sessions
        on workout_sessions.id = workout_session_exercises.session_id
      where workout_sessions.user_id = current_user_id
        and workout_sessions.template_id = target_template_id
        and workout_sessions.status in ('completed', 'cancelled')
        and workout_session_exercises.exercise_id = source_exercise.exercise_id
        and workout_session_sets.position = source_set.position
      order by workout_sessions.completed_at desc
      limit 1;

      if found
        and previous_set.target_reps between source_set.min_reps and source_set.max_reps then
        next_target_reps := previous_set.target_reps;
        next_target_weight := previous_set.target_weight;
        target_achieved := previous_set.status = 'completed'
          and previous_set.actual_reps >= previous_set.target_reps
          and previous_set.actual_weight >= previous_set.target_weight;

        if target_achieved and previous_set.target_reps >= source_set.max_reps then
          next_target_reps := source_set.min_reps;
          next_target_weight := previous_set.actual_weight + source_set.weight_increment;
        elsif target_achieved then
          next_target_reps := least(previous_set.target_reps + 1, source_set.max_reps);
          next_target_weight := previous_set.actual_weight;
        end if;
      end if;

      insert into public.workout_session_sets (
        session_exercise_id,
        template_exercise_set_id,
        position,
        target_min_reps,
        target_max_reps,
        target_reps,
        target_weight,
        weight_increment,
        rest_seconds
      ) values (
        new_session_exercise_id,
        source_set.id,
        source_set.position,
        source_set.min_reps,
        source_set.max_reps,
        next_target_reps,
        next_target_weight,
        source_set.weight_increment,
        0
      );
    end loop;
  end loop;

  return new_session_id;
end;
$$;

revoke all on function public.start_workout(uuid, smallint) from public;
revoke all on function public.start_workout(uuid, smallint) from anon;
grant execute on function public.start_workout(uuid, smallint) to authenticated;
