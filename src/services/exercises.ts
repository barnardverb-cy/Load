import { supabase } from '@/lib/supabase'
import type { Exercise } from '@/types/training'
import type { ExerciseInput } from '@/validation/training'

export async function listExercises(includeArchived = false): Promise<Exercise[]> {
  let query = supabase.from('exercises').select('*').order('name')
  if (!includeArchived) query = query.eq('is_archived', false)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createExercise(userId: string, input: ExerciseInput): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      muscle_group: input.muscle_group,
      equipment: input.equipment,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .update({
      name: input.name.trim(),
      muscle_group: input.muscle_group,
      equipment: input.equipment,
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function setExerciseArchived(id: string, isArchived: boolean): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .update({ is_archived: isArchived })
    .eq('id', id)
  if (error) throw error
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw error
}
