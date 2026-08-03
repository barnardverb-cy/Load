import { supabase } from '@/lib/supabase'
import type {
  EditableTemplateExercise,
  TemplateExerciseWithExercise,
  TemplateSummary,
  WorkoutTemplate,
} from '@/types/training'
import type { WorkoutTemplateInput } from '@/validation/training'

export async function listTemplates(includeArchived = false): Promise<TemplateSummary[]> {
  let query = supabase.from('workout_templates').select('*').order('name')
  if (!includeArchived) query = query.eq('is_archived', false)

  const { data: templates, error } = await query
  if (error) throw error
  if (templates.length === 0) return []

  const { data: rows, error: countError } = await supabase
    .from('template_exercises')
    .select('template_id')
    .in(
      'template_id',
      templates.map((template) => template.id),
    )

  if (countError) throw countError

  const counts = rows.reduce<Record<string, number>>((result, row) => {
    result[row.template_id] = (result[row.template_id] ?? 0) + 1
    return result
  }, {})

  return templates.map((template) => ({
    ...template,
    exerciseCount: counts[template.id] ?? 0,
  }))
}

export async function createTemplate(
  userId: string,
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateTemplate(
  id: string,
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const { data, error } = await supabase
    .from('workout_templates')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function setTemplateArchived(id: string, isArchived: boolean): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .update({ is_archived: isArchived })
    .eq('id', id)
  if (error) throw error
}

export async function getTemplate(id: string): Promise<{
  template: WorkoutTemplate
  exercises: TemplateExerciseWithExercise[]
}> {
  const [templateResult, exerciseResult] = await Promise.all([
    supabase.from('workout_templates').select('*').eq('id', id).single(),
    supabase
      .from('template_exercises')
      .select('*, exercise:exercises(*), sets:template_exercise_sets(*)')
      .eq('template_id', id)
      .order('position'),
  ])

  if (templateResult.error) throw templateResult.error
  if (exerciseResult.error) throw exerciseResult.error

  return {
    template: templateResult.data,
    exercises: (exerciseResult.data as TemplateExerciseWithExercise[]).map((item) => ({
      ...item,
      sets: [...item.sets].sort((a, b) => a.position - b.position),
    })),
  }
}

export async function saveTemplateExercises(
  templateId: string,
  exercises: EditableTemplateExercise[],
): Promise<void> {
  const items = exercises.map((item) => ({
    exercise_id: item.exercise_id,
    sets: item.sets.map((set) => ({
      min_reps: set.min_reps,
      max_reps: set.max_reps,
      starting_weight: set.starting_weight,
      weight_increment: set.weight_increment,
      rest_seconds: set.rest_seconds,
      progression_type: set.progression_type,
    })),
  }))

  const { error } = await supabase.rpc('replace_template_exercises', {
    target_template_id: templateId,
    items,
  })
  if (error) throw error
}

export async function duplicateTemplate(
  source: TemplateSummary,
  userId: string,
): Promise<WorkoutTemplate> {
  const { template, exercises } = await getTemplate(source.id)
  const copy = await createTemplate(userId, {
    name: `${template.name} copy`,
    description: template.description ?? undefined,
  })

  await saveTemplateExercises(
    copy.id,
    exercises.map((item) => ({
      exercise_id: item.exercise_id,
      exercise: item.exercise,
      sets: item.sets.map((set) => ({
        min_reps: set.min_reps,
        max_reps: set.max_reps,
        starting_weight: Number(set.starting_weight),
        weight_increment: Number(set.weight_increment),
        rest_seconds: set.rest_seconds,
        progression_type: set.progression_type,
      })),
    })),
  )

  return copy
}
