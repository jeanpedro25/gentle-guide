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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bankroll: {
        Row: {
          amount: number
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bet_results: {
        Row: {
          actual_score: string | null
          id: string
          prediction_id: string
          profit_loss: number | null
          resolved_at: string
          won: boolean | null
        }
        Insert: {
          actual_score?: string | null
          id?: string
          prediction_id: string
          profit_loss?: number | null
          resolved_at?: string
          won?: boolean | null
        }
        Update: {
          actual_score?: string | null
          id?: string
          prediction_id?: string
          profit_loss?: number | null
          resolved_at?: string
          won?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bet_results_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          actual_result: string | null
          actual_score: string | null
          away_team: string
          created_at: string
          fixture_id: number | null
          home_team: string
          id: string
          league: string
          odd: number
          potential_profit: number
          prediction: string
          profit_loss: number | null
          resolved_at: string | null
          stake: number
          status: string
        }
        Insert: {
          actual_result?: string | null
          actual_score?: string | null
          away_team: string
          created_at?: string
          fixture_id?: number | null
          home_team: string
          id?: string
          league?: string
          odd?: number
          potential_profit?: number
          prediction: string
          profit_loss?: number | null
          resolved_at?: string | null
          stake?: number
          status?: string
        }
        Update: {
          actual_result?: string | null
          actual_score?: string | null
          away_team?: string
          created_at?: string
          fixture_id?: number | null
          home_team?: string
          id?: string
          league?: string
          odd?: number
          potential_profit?: number
          prediction?: string
          profit_loss?: number | null
          resolved_at?: string | null
          stake?: number
          status?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_team: string
          confidence: number | null
          created_at: string
          fixture_id: number
          home_team: string
          id: string
          justification: string | null
          league: string
          min_odd: number | null
          oracle_data: Json | null
          predicted_score: string | null
          predicted_winner: string | null
          recommended_market: string | null
          stake_pct: number | null
          status: string
        }
        Insert: {
          away_team: string
          confidence?: number | null
          created_at?: string
          fixture_id: number
          home_team: string
          id?: string
          justification?: string | null
          league: string
          min_odd?: number | null
          oracle_data?: Json | null
          predicted_score?: string | null
          predicted_winner?: string | null
          recommended_market?: string | null
          stake_pct?: number | null
          status?: string
        }
        Update: {
          away_team?: string
          confidence?: number | null
          created_at?: string
          fixture_id?: number
          home_team?: string
          id?: string
          justification?: string | null
          league?: string
          min_odd?: number | null
          oracle_data?: Json | null
          predicted_score?: string | null
          predicted_winner?: string | null
          recommended_market?: string | null
          stake_pct?: number | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
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
