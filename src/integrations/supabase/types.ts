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
      admin_audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          metadata: Json | null
          record_id: string | null
          record_section: string | null
          record_slug: string | null
          record_title: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          record_section?: string | null
          record_slug?: string | null
          record_title?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          record_section?: string | null
          record_slug?: string | null
          record_title?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      books_uploads: {
        Row: {
          author: string | null
          category: string
          cover_path: string | null
          deleted_at: string | null
          filename: string
          filepath: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          title: string | null
          uploaded_at: string
          uploaded_by: string | null
          year: number | null
        }
        Insert: {
          author?: string | null
          category: string
          cover_path?: string | null
          deleted_at?: string | null
          filename: string
          filepath: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Update: {
          author?: string | null
          category?: string
          cover_path?: string | null
          deleted_at?: string | null
          filename?: string
          filepath?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          section_id: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          section_id: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          section_id?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      essay_revisions: {
        Row: {
          change_summary: string | null
          change_type: string
          changed_by: string | null
          content_json: Json | null
          created_at: string
          essay_id: string
          id: string
          layout_config: Json | null
          revision_no: number
          snippet: string | null
          status: Database["public"]["Enums"]["content_status_enum"] | null
          title: string | null
          voice_role: string | null
        }
        Insert: {
          change_summary?: string | null
          change_type: string
          changed_by?: string | null
          content_json?: Json | null
          created_at?: string
          essay_id: string
          id?: string
          layout_config?: Json | null
          revision_no: number
          snippet?: string | null
          status?: Database["public"]["Enums"]["content_status_enum"] | null
          title?: string | null
          voice_role?: string | null
        }
        Update: {
          change_summary?: string | null
          change_type?: string
          changed_by?: string | null
          content_json?: Json | null
          created_at?: string
          essay_id?: string
          id?: string
          layout_config?: Json | null
          revision_no?: number
          snippet?: string | null
          status?: Database["public"]["Enums"]["content_status_enum"] | null
          title?: string | null
          voice_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essay_revisions_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      essays: {
        Row: {
          author: string | null
          brief_json: Json | null
          category_id: string
          code: string | null
          content: string | null
          content_json: Json | null
          created_at: string
          date: string | null
          finance_order: number | null
          finance_section: string | null
          fsli_slug: string | null
          id: string
          is_selected: boolean
          layout_config: Json | null
          learning_outcomes: string[] | null
          lesson_type: Database["public"]["Enums"]["lesson_type_enum"] | null
          module_id: string | null
          phase: string | null
          prerequisites: string[] | null
          presentation: Json | null
          published: boolean | null
          read_time: string | null
          section: string
          slug: string
          snippet: string | null
          sort_order: number | null
          status: Database["public"]["Enums"]["content_status_enum"] | null
          thumbnail_url: string | null
          title: string
          topic: string | null
          updated_at: string
          voice_role: string | null
          voice_validated_at: string | null
        }
        Insert: {
          author?: string | null
          brief_json?: Json | null
          category_id?: string
          code?: string | null
          content?: string | null
          content_json?: Json | null
          created_at?: string
          date?: string | null
          finance_order?: number | null
          finance_section?: string | null
          fsli_slug?: string | null
          id?: string
          is_selected?: boolean
          layout_config?: Json | null
          learning_outcomes?: string[] | null
          lesson_type?: Database["public"]["Enums"]["lesson_type_enum"] | null
          module_id?: string | null
          phase?: string | null
          prerequisites?: string[] | null
          presentation?: Json | null
          published?: boolean | null
          read_time?: string | null
          section: string
          slug: string
          snippet?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status_enum"] | null
          thumbnail_url?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          voice_role?: string | null
          voice_validated_at?: string | null
        }
        Update: {
          author?: string | null
          brief_json?: Json | null
          category_id?: string
          code?: string | null
          content?: string | null
          content_json?: Json | null
          created_at?: string
          date?: string | null
          finance_order?: number | null
          finance_section?: string | null
          fsli_slug?: string | null
          id?: string
          is_selected?: boolean
          layout_config?: Json | null
          learning_outcomes?: string[] | null
          lesson_type?: Database["public"]["Enums"]["lesson_type_enum"] | null
          module_id?: string | null
          phase?: string | null
          prerequisites?: string[] | null
          presentation?: Json | null
          published?: boolean | null
          read_time?: string | null
          section?: string
          slug?: string
          snippet?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status_enum"] | null
          thumbnail_url?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          voice_role?: string | null
          voice_validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essays_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "finance_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_models: {
        Row: {
          created_at: string
          depth: Database["public"]["Enums"]["model_depth"]
          description: string | null
          documentation: Json
          excel_file_url: string | null
          id: string
          is_flagship: boolean
          is_published: boolean
          last_updated: string
          module_references: string[]
          name: string
          number: string
          slug: string
          sort_order: number
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          depth?: Database["public"]["Enums"]["model_depth"]
          description?: string | null
          documentation?: Json
          excel_file_url?: string | null
          id?: string
          is_flagship?: boolean
          is_published?: boolean
          last_updated?: string
          module_references?: string[]
          name: string
          number: string
          slug: string
          sort_order?: number
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          depth?: Database["public"]["Enums"]["model_depth"]
          description?: string | null
          documentation?: Json
          excel_file_url?: string | null
          id?: string
          is_flagship?: boolean
          is_published?: boolean
          last_updated?: string
          module_references?: string[]
          name?: string
          number?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      finance_modules: {
        Row: {
          created_at: string
          framing_content: string | null
          id: string
          module_meta: Json | null
          slug: string
          sort_order: number
          thesis: string | null
          title: string
          track_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          framing_content?: string | null
          id?: string
          module_meta?: Json | null
          slug: string
          sort_order?: number
          thesis?: string | null
          title: string
          track_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          framing_content?: string | null
          id?: string
          module_meta?: Json | null
          slug?: string
          sort_order?: number
          thesis?: string | null
          title?: string
          track_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_modules_track_slug_fkey"
            columns: ["track_slug"]
            isOneToOne: false
            referencedRelation: "finance_sections"
            referencedColumns: ["slug"]
          },
        ]
      }
      finance_sections: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      fsli_pages: {
        Row: {
          category: string | null
          created_at: string
          dec_2023: string | null
          dec_2024: string | null
          id: string
          notes_ref: string | null
          slug: string
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dec_2023?: string | null
          dec_2024?: string | null
          id?: string
          notes_ref?: string | null
          slug: string
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dec_2023?: string | null
          dec_2024?: string | null
          id?: string
          notes_ref?: string | null
          slug?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fsli_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          page_slug: string
          section_key: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          page_slug: string
          section_key: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          page_slug?: string
          section_key?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fsli_sections_page_slug_fkey"
            columns: ["page_slug"]
            isOneToOne: false
            referencedRelation: "fsli_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          manifesto: string | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
          voice_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          manifesto?: string | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
          voice_role: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          manifesto?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
          voice_role?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      essay_structure: {
        Row: {
          author: string | null
          finance_order: number | null
          id: string | null
          lesson_type: Database["public"]["Enums"]["lesson_type_enum"] | null
          module_id: string | null
          published: boolean | null
          read_time: string | null
          section: string | null
          slug: string | null
          snippet: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essays_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "finance_modules"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_role: "admin" | "user"
      content_status_enum: "draft" | "tone_pending" | "published" | "archived"
      lesson_type_enum:
        | "concept"
        | "framework"
        | "case-study"
        | "exercise"
        | "model-walkthrough"
      model_depth: "foundation" | "executive" | "institutional"
      voice_role_enum: "manager" | "economist" | "educator" | "coach" | "hybrid"
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
      app_role: ["admin", "user"],
      content_status_enum: ["draft", "tone_pending", "published", "archived"],
      lesson_type_enum: [
        "concept",
        "framework",
        "case-study",
        "exercise",
        "model-walkthrough",
      ],
      model_depth: ["foundation", "executive", "institutional"],
      voice_role_enum: ["manager", "economist", "educator", "coach", "hybrid"],
    },
  },
} as const
