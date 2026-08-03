export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string
          user_id: string
          name: string
          muscle_group: string
          equipment: string
          notes: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          muscle_group: string
          equipment: string
          notes?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          muscle_group?: string
          equipment?: string
          notes?: string | null
          is_archived?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          user_id: string
          starting_weight_kg: number | null
          goal_weight_kg: number | null
          starting_body_fat_percentage: number | null
          goal_body_fat_percentage: number | null
          daily_calorie_goal: number | null
          daily_protein_goal_g: number | null
          daily_water_goal_l: number | null
          daily_steps_goal: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          starting_weight_kg?: number | null
          goal_weight_kg?: number | null
          starting_body_fat_percentage?: number | null
          goal_body_fat_percentage?: number | null
          daily_calorie_goal?: number | null
          daily_protein_goal_g?: number | null
          daily_water_goal_l?: number | null
          daily_steps_goal?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          starting_weight_kg?: number | null
          goal_weight_kg?: number | null
          starting_body_fat_percentage?: number | null
          goal_body_fat_percentage?: number | null
          daily_calorie_goal?: number | null
          daily_protein_goal_g?: number | null
          daily_water_goal_l?: number | null
          daily_steps_goal?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          calories: number | null
          protein_g: number | null
          water_l: number | null
          steps: number | null
          sleep_hours: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          calories?: number | null
          protein_g?: number | null
          water_l?: number | null
          steps?: number | null
          sleep_hours?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          log_date?: string
          calories?: number | null
          protein_g?: number | null
          water_l?: number | null
          steps?: number | null
          sleep_hours?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      weekly_check_ins: {
        Row: {
          id: string
          user_id: string
          check_in_date: string
          weight_kg: number | null
          body_fat_percentage: number | null
          waist_inches: number | null
          chest_inches: number | null
          hips_inches: number | null
          arms_inches: number | null
          quads_inches: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          check_in_date: string
          weight_kg?: number | null
          body_fat_percentage?: number | null
          waist_inches?: number | null
          chest_inches?: number | null
          hips_inches?: number | null
          arms_inches?: number | null
          quads_inches?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          check_in_date?: string
          weight_kg?: number | null
          body_fat_percentage?: number | null
          waist_inches?: number | null
          chest_inches?: number | null
          hips_inches?: number | null
          arms_inches?: number | null
          quads_inches?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          preferred_weight_unit: 'kg' | 'lb'
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          preferred_weight_unit?: 'kg' | 'lb'
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          preferred_weight_unit?: 'kg' | 'lb'
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          id: string
          template_id: string
          exercise_id: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          exercise_id: string
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          exercise_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'template_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'template_exercises_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'workout_templates'
            referencedColumns: ['id']
          },
        ]
      }
      template_exercise_sets: {
        Row: {
          id: string
          template_exercise_id: string
          position: number
          min_reps: number
          max_reps: number
          starting_weight: number
          weight_increment: number
          rest_seconds: number
          progression_type: 'double_progression'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_exercise_id: string
          position: number
          min_reps: number
          max_reps: number
          starting_weight: number
          weight_increment: number
          rest_seconds?: number
          progression_type?: 'double_progression'
          created_at?: string
          updated_at?: string
        }
        Update: {
          position?: number
          min_reps?: number
          max_reps?: number
          starting_weight?: number
          weight_increment?: number
          rest_seconds?: number
          progression_type?: 'double_progression'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'template_exercise_sets_template_exercise_id_fkey'
            columns: ['template_exercise_id']
            isOneToOne: false
            referencedRelation: 'template_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      workout_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          is_archived?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          program_name: string
          status: 'in_progress' | 'completed' | 'cancelled'
          started_at: string
          completed_at: string | null
          notes: string | null
          rest_between_exercises_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          program_name: string
          status?: 'in_progress' | 'completed' | 'cancelled'
          started_at?: string
          completed_at?: string | null
          notes?: string | null
          rest_between_exercises_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          template_id?: string | null
          program_name?: string
          status?: 'in_progress' | 'completed' | 'cancelled'
          started_at?: string
          completed_at?: string | null
          notes?: string | null
          rest_between_exercises_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_sessions_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'workout_templates'
            referencedColumns: ['id']
          },
        ]
      }
      workout_session_exercises: {
        Row: {
          id: string
          session_id: string
          exercise_id: string | null
          template_exercise_id: string | null
          exercise_name: string
          muscle_group: string
          equipment: string
          position: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id?: string | null
          template_exercise_id?: string | null
          exercise_name: string
          muscle_group: string
          equipment: string
          position: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          exercise_id?: string | null
          template_exercise_id?: string | null
          exercise_name?: string
          muscle_group?: string
          equipment?: string
          position?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_session_exercises_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'workout_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_session_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_session_exercises_template_exercise_id_fkey'
            columns: ['template_exercise_id']
            isOneToOne: false
            referencedRelation: 'template_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      workout_session_sets: {
        Row: {
          id: string
          session_exercise_id: string
          template_exercise_set_id: string | null
          position: number
          target_min_reps: number
          target_max_reps: number
          target_reps: number
          target_weight: number
          weight_increment: number
          rest_seconds: number
          actual_reps: number | null
          actual_weight: number | null
          status: 'pending' | 'completed' | 'skipped'
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_exercise_id: string
          template_exercise_set_id?: string | null
          position: number
          target_min_reps: number
          target_max_reps: number
          target_reps: number
          target_weight: number
          weight_increment: number
          rest_seconds: number
          actual_reps?: number | null
          actual_weight?: number | null
          status?: 'pending' | 'completed' | 'skipped'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          template_exercise_set_id?: string | null
          target_reps?: number
          actual_reps?: number | null
          actual_weight?: number | null
          status?: 'pending' | 'completed' | 'skipped'
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_session_sets_session_exercise_id_fkey'
            columns: ['session_exercise_id']
            isOneToOne: false
            referencedRelation: 'workout_session_exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_session_sets_template_exercise_set_id_fkey'
            columns: ['template_exercise_set_id']
            isOneToOne: false
            referencedRelation: 'template_exercise_sets'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      replace_template_exercises: {
        Args: {
          target_template_id: string
          items: Json
        }
        Returns: undefined
      }
      start_workout: {
        Args: {
          target_template_id: string
          target_rest_between_exercises_seconds: number
        }
        Returns: string
      }
      finish_workout: {
        Args: { target_session_id: string }
        Returns: undefined
      }
      cancel_workout: {
        Args: { target_session_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
