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
      announcements: {
        Row: {
          author_member_id: string | null
          body: string
          created_at: string
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_member_id?: string | null
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_member_id?: string | null
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_member_id_fkey"
            columns: ["author_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          event_id: string
          event_type: Database["public"]["Enums"]["event_type_kind"]
          id: string
          member_id: string
          note: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: Database["public"]["Enums"]["event_type_kind"]
          id?: string
          member_id: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: Database["public"]["Enums"]["event_type_kind"]
          id?: string
          member_id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          battle_item: string | null
          created_at: string
          created_by: string | null
          emblems: string | null
          id: string
          items: Json | null
          moveset: Json | null
          name: string
          notes: string | null
          pokemon: string
        }
        Insert: {
          battle_item?: string | null
          created_at?: string
          created_by?: string | null
          emblems?: string | null
          id?: string
          items?: Json | null
          moveset?: Json | null
          name: string
          notes?: string | null
          pokemon: string
        }
        Update: {
          battle_item?: string | null
          created_at?: string
          created_by?: string | null
          emblems?: string | null
          id?: string
          items?: Json | null
          moveset?: Json | null
          name?: string
          notes?: string | null
          pokemon?: string
        }
        Relationships: []
      }
      compositions: {
        Row: {
          bot_pokemon: string | null
          created_at: string
          id: string
          jungle_pokemon: string | null
          linked_opponent_id: string | null
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
          linked_opponent_id?: string | null
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
          linked_opponent_id?: string | null
          mid_pokemon?: string | null
          name?: string
          notes?: string | null
          strategy?: string | null
          support_pokemon?: string | null
          tier?: string | null
          top_pokemon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compositions_linked_opponent_id_fkey"
            columns: ["linked_opponent_id"]
            isOneToOne: false
            referencedRelation: "opponents"
            referencedColumns: ["id"]
          },
        ]
      }
      match_performances: {
        Row: {
          assists: number
          created_at: string
          damage_dealt: number
          damage_taken: number
          deaths: number
          game_number: number
          healing: number
          id: string
          is_mvp: boolean
          kills: number
          member_id: string
          notes: string | null
          pokemon: string | null
          result: Database["public"]["Enums"]["match_result"]
          score: number
          scrim_id: string
        }
        Insert: {
          assists?: number
          created_at?: string
          damage_dealt?: number
          damage_taken?: number
          deaths?: number
          game_number?: number
          healing?: number
          id?: string
          is_mvp?: boolean
          kills?: number
          member_id: string
          notes?: string | null
          pokemon?: string | null
          result?: Database["public"]["Enums"]["match_result"]
          score?: number
          scrim_id: string
        }
        Update: {
          assists?: number
          created_at?: string
          damage_dealt?: number
          damage_taken?: number
          deaths?: number
          game_number?: number
          healing?: number
          id?: string
          is_mvp?: boolean
          kills?: number
          member_id?: string
          notes?: string | null
          pokemon?: string | null
          result?: Database["public"]["Enums"]["match_result"]
          score?: number
          scrim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_performances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_performances_scrim_id_fkey"
            columns: ["scrim_id"]
            isOneToOne: false
            referencedRelation: "scrims"
            referencedColumns: ["id"]
          },
        ]
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
      opponent_performances: {
        Row: {
          assists: number
          created_at: string
          damage_dealt: number
          damage_taken: number
          game_number: number
          healing: number
          id: string
          kills: number
          notes: string | null
          opponent_id: string | null
          player_name: string
          pokemon: string | null
          rating: number | null
          score: number
          scrim_id: string
        }
        Insert: {
          assists?: number
          created_at?: string
          damage_dealt?: number
          damage_taken?: number
          game_number?: number
          healing?: number
          id?: string
          kills?: number
          notes?: string | null
          opponent_id?: string | null
          player_name: string
          pokemon?: string | null
          rating?: number | null
          score?: number
          scrim_id: string
        }
        Update: {
          assists?: number
          created_at?: string
          damage_dealt?: number
          damage_taken?: number
          game_number?: number
          healing?: number
          id?: string
          kills?: number
          notes?: string | null
          opponent_id?: string | null
          player_name?: string
          pokemon?: string | null
          rating?: number | null
          score?: number
          scrim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponent_performances_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "opponents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opponent_performances_scrim_id_fkey"
            columns: ["scrim_id"]
            isOneToOne: false
            referencedRelation: "scrims"
            referencedColumns: ["id"]
          },
        ]
      }
      opponents: {
        Row: {
          created_at: string
          id: string
          known_players: Json | null
          name: string
          notes: string | null
          recurring_picks: string[] | null
          region: string | null
          tag: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          known_players?: Json | null
          name: string
          notes?: string | null
          recurring_picks?: string[] | null
          region?: string | null
          tag?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          known_players?: Json | null
          name?: string
          notes?: string | null
          recurring_picks?: string[] | null
          region?: string | null
          tag?: string | null
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          category: Database["public"]["Enums"]["playbook_category"]
          created_at: string
          description: string | null
          id: string
          linked_comp_id: string | null
          map_data: Json | null
          name: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["playbook_category"]
          created_at?: string
          description?: string | null
          id?: string
          linked_comp_id?: string | null
          map_data?: Json | null
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["playbook_category"]
          created_at?: string
          description?: string | null
          id?: string
          linked_comp_id?: string | null
          map_data?: Json | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_linked_comp_id_fkey"
            columns: ["linked_comp_id"]
            isOneToOne: false
            referencedRelation: "compositions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          member_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          member_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          member_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      scrims: {
        Row: {
          best_of: number
          created_at: string
          id: string
          notes: string | null
          opponent: string
          opponent_id: string | null
          result: Database["public"]["Enums"]["match_result"]
          scheduled_at: string
          score_them: number
          score_us: number
          status: Database["public"]["Enums"]["event_status"]
          vod_notes: string | null
          vod_url: string | null
        }
        Insert: {
          best_of?: number
          created_at?: string
          id?: string
          notes?: string | null
          opponent: string
          opponent_id?: string | null
          result?: Database["public"]["Enums"]["match_result"]
          scheduled_at: string
          score_them?: number
          score_us?: number
          status?: Database["public"]["Enums"]["event_status"]
          vod_notes?: string | null
          vod_url?: string | null
        }
        Update: {
          best_of?: number
          created_at?: string
          id?: string
          notes?: string | null
          opponent?: string
          opponent_id?: string | null
          result?: Database["public"]["Enums"]["match_result"]
          scheduled_at?: string
          score_them?: number
          score_us?: number
          status?: Database["public"]["Enums"]["event_status"]
          vod_notes?: string | null
          vod_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrims_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "opponents"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_list: {
        Row: {
          created_at: string
          id: string
          lane: Database["public"]["Enums"]["lane_role"] | null
          notes: string | null
          patch: string | null
          pokemon: string
          position: number
          tier: Database["public"]["Enums"]["tier_rank"]
        }
        Insert: {
          created_at?: string
          id?: string
          lane?: Database["public"]["Enums"]["lane_role"] | null
          notes?: string | null
          patch?: string | null
          pokemon: string
          position?: number
          tier?: Database["public"]["Enums"]["tier_rank"]
        }
        Update: {
          created_at?: string
          id?: string
          lane?: Database["public"]["Enums"]["lane_role"] | null
          notes?: string | null
          patch?: string | null
          pokemon?: string
          position?: number
          tier?: Database["public"]["Enums"]["tier_rank"]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "coach" | "player" | "viewer"
      attendance_status: "confirmed" | "declined" | "tentative"
      event_status: "scheduled" | "completed" | "cancelled"
      event_type_kind: "training" | "scrim"
      lane_role: "top" | "jungle" | "mid" | "bot" | "support" | "flex"
      match_result: "pending" | "win" | "loss" | "draw"
      member_role: "player" | "substitute" | "coach" | "manager"
      playbook_category:
        | "rotation"
        | "objective"
        | "lategame"
        | "earlygame"
        | "other"
      tier_rank: "S" | "A" | "B" | "C" | "D"
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
      app_role: ["coach", "player", "viewer"],
      attendance_status: ["confirmed", "declined", "tentative"],
      event_status: ["scheduled", "completed", "cancelled"],
      event_type_kind: ["training", "scrim"],
      lane_role: ["top", "jungle", "mid", "bot", "support", "flex"],
      match_result: ["pending", "win", "loss", "draw"],
      member_role: ["player", "substitute", "coach", "manager"],
      playbook_category: [
        "rotation",
        "objective",
        "lategame",
        "earlygame",
        "other",
      ],
      tier_rank: ["S", "A", "B", "C", "D"],
    },
  },
} as const
