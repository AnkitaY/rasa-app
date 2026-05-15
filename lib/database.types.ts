export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_events: {
        Row: {
          created_at: string | null
          data: Json | null
          event_type: string
          from_agent: string | null
          handoff_id: string | null
          human_resolved: boolean | null
          id: string
          project_id: string | null
          requires_human: boolean | null
          to_agent: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          event_type: string
          from_agent?: string | null
          handoff_id?: string | null
          human_resolved?: boolean | null
          id?: string
          project_id?: string | null
          requires_human?: boolean | null
          to_agent?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          event_type?: string
          from_agent?: string | null
          handoff_id?: string | null
          human_resolved?: boolean | null
          id?: string
          project_id?: string | null
          requires_human?: boolean | null
          to_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          agent_types: string[] | null
          created_at: string | null
          description: string | null
          effectiveness_rating: number | null
          id: string
          name: string
          project_originated: string | null
          skill_content: string | null
          updated_at: string | null
          usage_count: number | null
          version: string | null
        }
        Insert: {
          agent_types?: string[] | null
          created_at?: string | null
          description?: string | null
          effectiveness_rating?: number | null
          id?: string
          name: string
          project_originated?: string | null
          skill_content?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
        }
        Update: {
          agent_types?: string[] | null
          created_at?: string | null
          description?: string | null
          effectiveness_rating?: number | null
          id?: string
          name?: string
          project_originated?: string | null
          skill_content?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_skills_project_originated_fkey"
            columns: ["project_originated"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_state: {
        Row: {
          agent_type: string
          context_summary: Json | null
          current_handoff: string | null
          id: string
          last_action: string | null
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          context_summary?: Json | null
          current_handoff?: string | null
          id?: string
          last_action?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          context_summary?: Json | null
          current_handoff?: string | null
          id?: string
          last_action?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_state_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cooking_sessions: {
        Row: {
          batch_opportunities: Json
          brunch_done: boolean
          brunch_recipe_id: string | null
          brunch_recipe_name: string | null
          created_at: string
          dinner_recipe_id: string | null
          dinner_recipe_name: string | null
          id: string
          prep_tasks: Json
          session_date: string
          session_duration_minutes: number | null
          tomorrow_finish_steps: Json
          user_id: string | null
          week_plan_id: string | null
        }
        Insert: {
          batch_opportunities?: Json
          brunch_done?: boolean
          brunch_recipe_id?: string | null
          brunch_recipe_name?: string | null
          created_at?: string
          dinner_recipe_id?: string | null
          dinner_recipe_name?: string | null
          id?: string
          prep_tasks?: Json
          session_date?: string
          session_duration_minutes?: number | null
          tomorrow_finish_steps?: Json
          user_id?: string | null
          week_plan_id?: string | null
        }
        Update: {
          batch_opportunities?: Json
          brunch_done?: boolean
          brunch_recipe_id?: string | null
          brunch_recipe_name?: string | null
          created_at?: string
          dinner_recipe_id?: string | null
          dinner_recipe_name?: string | null
          id?: string
          prep_tasks?: Json
          session_date?: string
          session_duration_minutes?: number | null
          tomorrow_finish_steps?: Json
          user_id?: string | null
          week_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cooking_sessions_brunch_recipe_id_fkey"
            columns: ["brunch_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooking_sessions_dinner_recipe_id_fkey"
            columns: ["dinner_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooking_sessions_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          agent_type: string | null
          created_at: string | null
          description: string
          handoff_id: string | null
          human_decision: Json | null
          id: string
          issue_type: string | null
          options: Json | null
          project_id: string | null
          resolved_at: string | null
          status: string | null
          title: string
          urgency: string | null
        }
        Insert: {
          agent_type?: string | null
          created_at?: string | null
          description: string
          handoff_id?: string | null
          human_decision?: Json | null
          id?: string
          issue_type?: string | null
          options?: Json | null
          project_id?: string | null
          resolved_at?: string | null
          status?: string | null
          title: string
          urgency?: string | null
        }
        Update: {
          agent_type?: string | null
          created_at?: string | null
          description?: string
          handoff_id?: string | null
          human_decision?: Json | null
          id?: string
          issue_type?: string | null
          options?: Json | null
          project_id?: string | null
          resolved_at?: string | null
          status?: string | null
          title?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      handoffs: {
        Row: {
          acceptance_criteria: Json | null
          completed_at: string | null
          context: Json | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          from_agent: string
          id: string
          priority: string | null
          project_id: string | null
          started_at: string | null
          status: string | null
          title: string
          to_agent: string
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          from_agent: string
          id: string
          priority?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          title: string
          to_agent: string
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          from_agent?: string
          id?: string
          priority?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          title?: string
          to_agent?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          id: string
          location: string | null
          low_stock: boolean | null
          name: string
          quantity: number | null
          unit: string | null
          updated_at: string | null
          use_soon: boolean | null
          user_id: string | null
        }
        Insert: {
          id?: string
          location?: string | null
          low_stock?: boolean | null
          name: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          use_soon?: boolean | null
          user_id?: string | null
        }
        Update: {
          id?: string
          location?: string | null
          low_stock?: boolean | null
          name?: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          use_soon?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          cooked: boolean
          cooked_at: string | null
          created_at: string | null
          day: string
          deleted_at: string | null
          eating_out: boolean
          id: string
          meal_type: string
          notes: string | null
          reasoning: string | null
          recipe_name: string
          serve_with: string | null
          swapped_from: string | null
          use_soon_priority: boolean
          verdict: string | null
          verdict_shown: boolean
          week_plan_id: string | null
        }
        Insert: {
          cooked?: boolean
          cooked_at?: string | null
          created_at?: string | null
          day: string
          deleted_at?: string | null
          eating_out?: boolean
          id?: string
          meal_type?: string
          notes?: string | null
          reasoning?: string | null
          recipe_name: string
          serve_with?: string | null
          swapped_from?: string | null
          use_soon_priority?: boolean
          verdict?: string | null
          verdict_shown?: boolean
          week_plan_id?: string | null
        }
        Update: {
          cooked?: boolean
          cooked_at?: string | null
          created_at?: string | null
          day?: string
          deleted_at?: string | null
          eating_out?: boolean
          id?: string
          meal_type?: string
          notes?: string | null
          reasoning?: string | null
          recipe_name?: string
          serve_with?: string | null
          swapped_from?: string | null
          use_soon_priority?: boolean
          verdict?: string | null
          verdict_shown?: boolean
          week_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          carb_limit: number | null
          created_at: string | null
          cuisine_preferences: string[] | null
          household_size: number | null
          id: string
          meal_slots: string[] | null
          protein_target: number | null
        }
        Insert: {
          carb_limit?: number | null
          created_at?: string | null
          cuisine_preferences?: string[] | null
          household_size?: number | null
          id: string
          meal_slots?: string[] | null
          protein_target?: number | null
        }
        Update: {
          carb_limit?: number | null
          created_at?: string | null
          cuisine_preferences?: string[] | null
          household_size?: number | null
          id?: string
          meal_slots?: string[] | null
          protein_target?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          tech_stack: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          tech_stack?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          tech_stack?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          anon_id: string | null
          assembly_time_mins: number | null
          batch_cookable: boolean | null
          cook_time_minutes: number | null
          created_at: string | null
          cuisine_type: string | null
          deleted_at: string | null
          excluded_from_plans: boolean | null
          id: string
          image_url: string | null
          ingredients: Json | null
          is_complete_meal: boolean | null
          last_cooked_date: string | null
          macros_per_serving: Json | null
          meal_type: string | null
          name: string
          prep_ahead: Json | null
          prep_friendly: boolean | null
          raw_text: string | null
          recipe_type: string | null
          serve_with: string | null
          servings: number | null
          source: string | null
          source_raw_text: string | null
          source_type: string | null
          source_url: string | null
          steps: string[] | null
          steps_v2: Json | null
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          anon_id?: string | null
          assembly_time_mins?: number | null
          batch_cookable?: boolean | null
          cook_time_minutes?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          deleted_at?: string | null
          excluded_from_plans?: boolean | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_complete_meal?: boolean | null
          last_cooked_date?: string | null
          macros_per_serving?: Json | null
          meal_type?: string | null
          name: string
          prep_ahead?: Json | null
          prep_friendly?: boolean | null
          raw_text?: string | null
          recipe_type?: string | null
          serve_with?: string | null
          servings?: number | null
          source?: string | null
          source_raw_text?: string | null
          source_type?: string | null
          source_url?: string | null
          steps?: string[] | null
          steps_v2?: Json | null
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          anon_id?: string | null
          assembly_time_mins?: number | null
          batch_cookable?: boolean | null
          cook_time_minutes?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          deleted_at?: string | null
          excluded_from_plans?: boolean | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_complete_meal?: boolean | null
          last_cooked_date?: string | null
          macros_per_serving?: Json | null
          meal_type?: string | null
          name?: string
          prep_ahead?: Json | null
          prep_friendly?: boolean | null
          raw_text?: string | null
          recipe_type?: string | null
          serve_with?: string | null
          servings?: number | null
          source?: string | null
          source_raw_text?: string | null
          source_type?: string | null
          source_url?: string | null
          steps?: string[] | null
          steps_v2?: Json | null
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string | null
          id: string
          items: Json | null
          user_id: string | null
          week_plan_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json | null
          user_id?: string | null
          week_plan_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json | null
          user_id?: string | null
          week_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_lists_week_plan_id_fkey"
            columns: ["week_plan_id"]
            isOneToOne: false
            referencedRelation: "week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          anon_id: string
          banned_ingredients: string | null
          cook_days_per_week: number
          created_at: string | null
          dietary_flags: string[] | null
          dietary_other: string | null
          dietary_rules: string | null
          goals: string[]
          health_goals: string | null
          id: string
          last_pantry_input: string | null
          meal_days_default: Json | null
          meal_prefs: Json | null
          meal_types_default: string[] | null
          primary_cuisine: string | null
          secondary_cuisines: string[]
          skill_level: string | null
          weeknight_budget: string | null
          who_cooking_for: string
        }
        Insert: {
          anon_id: string
          banned_ingredients?: string | null
          cook_days_per_week?: number
          created_at?: string | null
          dietary_flags?: string[] | null
          dietary_other?: string | null
          dietary_rules?: string | null
          goals?: string[]
          health_goals?: string | null
          id?: string
          last_pantry_input?: string | null
          meal_days_default?: Json | null
          meal_prefs?: Json | null
          meal_types_default?: string[] | null
          primary_cuisine?: string | null
          secondary_cuisines?: string[]
          skill_level?: string | null
          weeknight_budget?: string | null
          who_cooking_for?: string
        }
        Update: {
          anon_id?: string
          banned_ingredients?: string | null
          cook_days_per_week?: number
          created_at?: string | null
          dietary_flags?: string[] | null
          dietary_other?: string | null
          dietary_rules?: string | null
          goals?: string[]
          health_goals?: string | null
          id?: string
          last_pantry_input?: string | null
          meal_days_default?: Json | null
          meal_prefs?: Json | null
          meal_types_default?: string[] | null
          primary_cuisine?: string | null
          secondary_cuisines?: string[]
          skill_level?: string | null
          weeknight_budget?: string | null
          who_cooking_for?: string
        }
        Relationships: []
      }
      week_plans: {
        Row: {
          anon_id: string | null
          created_at: string | null
          id: string
          pantry_snapshot: string | null
          slots: Json | null
          use_soon_text: string | null
          user_id: string | null
          week_context: string | null
          week_start_date: string | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string | null
          id?: string
          pantry_snapshot?: string | null
          slots?: Json | null
          use_soon_text?: string | null
          user_id?: string | null
          week_context?: string | null
          week_start_date?: string | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string | null
          id?: string
          pantry_snapshot?: string | null
          slots?: Json | null
          use_soon_text?: string | null
          user_id?: string | null
          week_context?: string | null
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "week_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
