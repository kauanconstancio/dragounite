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
      compositions: {
        Row: {
          bot_pokemon: string | null
          created_at: string
          id: string
          jungle_pokemon: string | null
          mid_pokemon: string | null
          name: string
          notes: string | null
          strategy: string | null
          support_pokemon: string | null
          tier: string | null
          top_pokemon: string | null
        }
        Insert: {
          bot_pokemon?: string | null
          created_at?: string
          id?: string
          jungle_pokemon?: string | null
          mid_pokemon?: string | null
          name: string
          notes?: string | null
          strategy?: string | null
          support_pokemon?: string | null
          tier?: string | null
          top_pokemon?: string | null
        }
        Update: {
          bot_pokemon?: string | null
          created_at?: string
          id?: string
          jungle_pokemon?: string | null
          mid_pokemon?: string | null
          name?: string
          notes?: string | null
          strategy?: string | null
          support_pokemon?: string | null
          tier?: string | null
          top_pokemon?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          avatar_url: string | null
          created_at: string
          discord: string | null
          id: string
          ign: string | null
          lane: Database["public"]["Enums"]["lane_role"] | null
          main_pokemon: string | null
          name: string
          notes: string | null
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discord?: string | null
          id?: string
          ign?: string | null
          lane?: Database["public"]["Enums"]["lane_role"] | null
          main_pokemon?: string | null
          name: string
          notes?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discord?: string | null
          id?: string
          ign?: string | null
          lane?: Database["public"]["Enums"]["lane_role"] | null
          main_pokemon?: string | null
          name?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
        }
        Relationships: []
      }
      scrims: {
        Row: {
          best_of: number
          created_at: string
          id: string
          notes: string | null
          opponent: string
          result: Database["public"]["Enums"]["match_result"]
          scheduled_at: string
          score_them: number
          score_us: number
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          best_of?: number
          created_at?: string
          id?: string
          notes?: string | null
          opponent: string
          result?: Database["public"]["Enums"]["match_result"]
          scheduled_at: string
          score_them?: number
          score_us?: number
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          best_of?: number
          created_at?: string
          id?: string
          notes?: string | null
          opponent?: string
          result?: Database["public"]["Enums"]["match_result"]
          scheduled_at?: string
          score_them?: number
          score_us?: number
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: []
      }
      trainings: {
        Row: {
          created_at: string
          duration_min: number
          focus: string | null
          id: string
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          focus?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          focus?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_status: "scheduled" | "completed" | "cancelled"
      lane_role: "top" | "jungle" | "mid" | "bot" | "support" | "flex"
      match_result: "pending" | "win" | "loss" | "draw"
      member_role: "player" | "substitute" | "coach" | "manager"
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
      event_status: ["scheduled", "completed", "cancelled"],
      lane_role: ["top", "jungle", "mid", "bot", "support", "flex"],
      match_result: ["pending", "win", "loss", "draw"],
      member_role: ["player", "substitute", "coach", "manager"],
    },
  },
} as const
