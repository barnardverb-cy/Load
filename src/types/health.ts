import type { Database } from '@/lib/database.types'

export type FitnessGoals = Database['public']['Tables']['fitness_goals']['Row']
export type DailyLog = Database['public']['Tables']['daily_logs']['Row']
export type WeeklyCheckIn = Database['public']['Tables']['weekly_check_ins']['Row']

export type FitnessGoalsInput = Omit<
  Database['public']['Tables']['fitness_goals']['Insert'],
  'user_id' | 'created_at' | 'updated_at'
>
export type DailyLogInput = Omit<
  Database['public']['Tables']['daily_logs']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>
export type WeeklyCheckInInput = Omit<
  Database['public']['Tables']['weekly_check_ins']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>
