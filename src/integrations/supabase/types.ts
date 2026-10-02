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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bed_notes: {
        Row: {
          bed_id: string
          body: string
          created_at: string
          id: string
          kind: string
          noted_on: string
          user_id: string
        }
        Insert: {
          bed_id: string
          body: string
          created_at?: string
          id?: string
          kind?: string
          noted_on?: string
          user_id?: string
        }
        Update: {
          bed_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          noted_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_notes_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          compact_x: number
          compact_y: number
          created_at: string
          h: number
          id: string
          kind: string
          name: string
          soil_notes: string | null
          sun: string
          sun_hours: number | null
          user_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          compact_x?: number
          compact_y?: number
          created_at?: string
          h?: number
          id?: string
          kind?: string
          name: string
          soil_notes?: string | null
          sun?: string
          sun_hours?: number | null
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Update: {
          compact_x?: number
          compact_y?: number
          created_at?: string
          h?: number
          id?: string
          kind?: string
          name?: string
          soil_notes?: string | null
          sun?: string
          sun_hours?: number | null
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      crop_icons: {
        Row: {
          created_at: string
          crop_slug: string
          icon: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_slug: string
          icon: string
          user_id?: string
        }
        Update: {
          created_at?: string
          crop_slug?: string
          icon?: string
          user_id?: string
        }
        Relationships: []
      }
      garden_photos: {
        Row: {
          bed_id: string | null
          caption: string | null
          created_at: string
          id: string
          planting_id: string | null
          scope: string
          storage_path: string
          taken_on: string
          user_id: string
        }
        Insert: {
          bed_id?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          planting_id?: string | null
          scope?: string
          storage_path: string
          taken_on?: string
          user_id?: string
        }
        Update: {
          bed_id?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          planting_id?: string | null
          scope?: string
          storage_path?: string
          taken_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garden_photos_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_photos_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "plantings"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_logs: {
        Row: {
          bed_id: string | null
          created_at: string
          id: string
          last_treated_on: string | null
          notes: string | null
          observed_on: string
          pest: string
          photo_id: string | null
          planting_id: string | null
          repeat_days: number | null
          resolved: boolean
          treatment: string | null
          user_id: string
        }
        Insert: {
          bed_id?: string | null
          created_at?: string
          id?: string
          last_treated_on?: string | null
          notes?: string | null
          observed_on?: string
          pest: string
          photo_id?: string | null
          planting_id?: string | null
          repeat_days?: number | null
          resolved?: boolean
          treatment?: string | null
          user_id?: string
        }
        Update: {
          bed_id?: string | null
          created_at?: string
          id?: string
          last_treated_on?: string | null
          notes?: string | null
          observed_on?: string
          pest?: string
          photo_id?: string | null
          planting_id?: string | null
          repeat_days?: number | null
          resolved?: boolean
          treatment?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pest_logs_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_logs_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "garden_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_logs_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "plantings"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_pictures: {
        Row: {
          created_at: string
          data_url: string
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data_url: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          data_url?: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plant_varieties: {
        Row: {
          color: string
          created_at: string
          crop_slug: string
          days_to_maturity: number | null
          description: string | null
          id: string
          name: string
          source: string
          tips: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          crop_slug: string
          days_to_maturity?: number | null
          description?: string | null
          id?: string
          name: string
          source?: string
          tips?: string | null
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          crop_slug?: string
          days_to_maturity?: number | null
          description?: string | null
          id?: string
          name?: string
          source?: string
          tips?: string | null
          user_id?: string
        }
        Relationships: []
      }
      planting_plans: {
        Row: {
          bed_id: string | null
          checklist: Json
          created_at: string
          crop_slug: string | null
          id: string
          planned_on: string
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          bed_id?: string | null
          checklist?: Json
          created_at?: string
          crop_slug?: string | null
          id?: string
          planned_on: string
          status?: string
          title?: string | null
          user_id?: string
        }
        Update: {
          bed_id?: string | null
          checklist?: Json
          created_at?: string
          crop_slug?: string | null
          id?: string
          planned_on?: string
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planting_plans_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      plantings: {
        Row: {
          bed_id: string
          cell_h: number
          cell_w: number
          cell_x: number
          cell_y: number
          color: string | null
          created_at: string
          crop_slug: string
          days_to_maturity: number | null
          icon: string | null
          id: string
          method: string
          notes: string | null
          planted_on: string | null
          stage: string | null
          status: string
          user_id: string
          variety: string | null
        }
        Insert: {
          bed_id: string
          cell_h?: number
          cell_w?: number
          cell_x?: number
          cell_y?: number
          color?: string | null
          created_at?: string
          crop_slug: string
          days_to_maturity?: number | null
          icon?: string | null
          id?: string
          method?: string
          notes?: string | null
          planted_on?: string | null
          stage?: string | null
          status?: string
          user_id?: string
          variety?: string | null
        }
        Update: {
          bed_id?: string
          cell_h?: number
          cell_w?: number
          cell_x?: number
          cell_y?: number
          color?: string | null
          created_at?: string
          crop_slug?: string
          days_to_maturity?: number | null
          icon?: string | null
          id?: string
          method?: string
          notes?: string | null
          planted_on?: string | null
          stage?: string | null
          status?: string
          user_id?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantings_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          garden_name: string
          id: string
          yard_h: number | null
          yard_w: number | null
          zone: string
        }
        Insert: {
          created_at?: string
          garden_name?: string
          id: string
          yard_h?: number | null
          yard_w?: number | null
          zone?: string
        }
        Update: {
          created_at?: string
          garden_name?: string
          id?: string
          yard_h?: number | null
          yard_w?: number | null
          zone?: string
        }
        Relationships: []
      }
      yard_features: {
        Row: {
          created_at: string
          h: number
          icon: string | null
          id: string
          kind: string
          label: string | null
          user_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          h?: number
          icon?: string | null
          id?: string
          kind?: string
          label?: string | null
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          h?: number
          icon?: string | null
          id?: string
          kind?: string
          label?: string | null
          user_id?: string
          w?: number
          x?: number
          y?: number
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
