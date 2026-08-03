import { supabase } from '@/lib/supabase'
import type {
  DailyLog,
  DailyLogInput,
  FitnessGoals,
  FitnessGoalsInput,
  WeeklyCheckIn,
  WeeklyCheckInInput,
} from '@/types/health'

export async function getFitnessGoals(): Promise<FitnessGoals | null> {
  const { data, error } = await supabase.from('fitness_goals').select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function saveFitnessGoals(
  userId: string,
  input: FitnessGoalsInput,
): Promise<FitnessGoals> {
  const { data, error } = await supabase
    .from('fitness_goals')
    .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('log_date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listDailyLogs(from: string, to: string): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .gte('log_date', from)
    .lte('log_date', to)
    .order('log_date', { ascending: true })
  if (error) throw error
  return data
}

export async function saveDailyLog(userId: string, input: DailyLogInput): Promise<DailyLog> {
  const { data, error } = await supabase
    .from('daily_logs')
    .upsert({ user_id: userId, ...input }, { onConflict: 'user_id,log_date' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function listWeeklyCheckIns(limit = 20): Promise<WeeklyCheckIn[]> {
  const { data, error } = await supabase
    .from('weekly_check_ins')
    .select('*')
    .order('check_in_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getWeeklyCheckIn(date: string): Promise<WeeklyCheckIn | null> {
  const { data, error } = await supabase
    .from('weekly_check_ins')
    .select('*')
    .eq('check_in_date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveWeeklyCheckIn(
  userId: string,
  input: WeeklyCheckInInput,
): Promise<WeeklyCheckIn> {
  const { data, error } = await supabase
    .from('weekly_check_ins')
    .upsert({ user_id: userId, ...input }, { onConflict: 'user_id,check_in_date' })
    .select('*')
    .single()
  if (error) throw error
  return data
}
