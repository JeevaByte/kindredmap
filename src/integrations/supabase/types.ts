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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      connections: {
        Row: {
          confirmed_at: string | null
          created_at: string
          fun_fact: string | null
          id: string
          initiated_by: string
          meet_date: string | null
          note: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["connection_status"]
          type: Database["public"]["Enums"]["connection_type"]
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          fun_fact?: string | null
          id?: string
          initiated_by: string
          meet_date?: string | null
          note?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          type: Database["public"]["Enums"]["connection_type"]
          user_a_id: string
          user_b_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          fun_fact?: string | null
          id?: string
          initiated_by?: string
          meet_date?: string | null
          note?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          type?: Database["public"]["Enums"]["connection_type"]
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          bio: string | null
          building_for: string | null
          building_line: string | null
          building_so: string | null
          building_what: string | null
          created_at: string
          founder_stage: string | null
          id: string
          is_seed: boolean
          linkedin_url: string | null
          name: string
          onboarded: boolean
          phone: string | null
          registration_status: Database["public"]["Enums"]["registration_status"]
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          building_for?: string | null
          building_line?: string | null
          building_so?: string | null
          building_what?: string | null
          created_at?: string
          founder_stage?: string | null
          id: string
          is_seed?: boolean
          linkedin_url?: string | null
          name?: string
          onboarded?: boolean
          phone?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          building_for?: string | null
          building_line?: string | null
          building_so?: string | null
          building_what?: string | null
          created_at?: string
          founder_stage?: string | null
          id?: string
          is_seed?: boolean
          linkedin_url?: string | null
          name?: string
          onboarded?: boolean
          phone?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fun_facts_about: {
        Args: { _target: string }
        Returns: {
          created_at: string
          fun_fact: string
        }[]
      }
      is_registered: { Args: { _user_id: string }; Returns: boolean }
      profile_is_complete: {
        Args: { _p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: boolean
      }
    }
    Enums: {
      connection_status: "pending" | "confirmed"
      connection_type: "know" | "met_online" | "met_in_person"
      registration_status: "incomplete" | "complete"
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
    Enums: {
      connection_status: ["pending", "confirmed"],
      connection_type: ["know", "met_online", "met_in_person"],
      registration_status: ["incomplete", "complete"],
    },
  },
} as const
