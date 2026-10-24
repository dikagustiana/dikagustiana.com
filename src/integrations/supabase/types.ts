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
      _wp3_stage: {
        Row: {
          content: string
          content_json: Json
          essay_id: string
          expected_updated_at: string
          id: number
          md5: string
          presentation: Json | null
          token: string
        }
        Insert: {
          content: string
          content_json: Json
          essay_id: string
          expected_updated_at: string
          id?: number
          md5: string
          presentation?: Json | null
          token: string
        }
        Update: {
          content?: string
          content_json?: Json
          essay_id?: string
          expected_updated_at?: string
          id?: number
          md5?: string
          presentation?: Json | null
          token?: string
        }
        Relationships: []
      }
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
      book_shelves: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      books_uploads: {
        Row: {
          access: string
          author: string | null
          category: string
          cover_path: string | null
          deleted_at: string | null
          file_store: string
          filename: string | null
          filepath: string | null
          id: string
          license_note: string | null
          mime_type: string | null
          published: boolean
          purchase_url: string | null
          shelf_id: string | null
          size_bytes: number | null
          slug: string
          sort_order: number
          synopsis_excerpt: string | null
          synopsis_html: string | null
          synopsis_json: Json | null
          title: string | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          year: number | null
        }
        Insert: {
          access?: string
          author?: string | null
          category?: string
          cover_path?: string | null
          deleted_at?: string | null
          file_store?: string
          filename?: string | null
          filepath?: string | null
          id?: string
          license_note?: string | null
          mime_type?: string | null
          published?: boolean
          purchase_url?: string | null
          shelf_id?: string | null
          size_bytes?: number | null
          slug: string
          sort_order?: number
          synopsis_excerpt?: string | null
          synopsis_html?: string | null
          synopsis_json?: Json | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Update: {
          access?: string
          author?: string | null
          category?: string
          cover_path?: string | null
          deleted_at?: string | null
          file_store?: string
          filename?: string | null
          filepath?: string | null
          id?: string
          license_note?: string | null
          mime_type?: string | null
          published?: boolean
          purchase_url?: string | null
          shelf_id?: string | null
          size_bytes?: number | null
          slug?: string
          sort_order?: number
          synopsis_excerpt?: string | null
          synopsis_html?: string | null
          synopsis_json?: Json | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_uploads_shelf_id_fkey"
            columns: ["shelf_id"]
            isOneToOne: false
            referencedRelation: "book_shelves"
            referencedColumns: ["id"]
          },
        ]
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
      ds_chain: {
        Row: {
          chain_link: Database["public"]["Enums"]["ds_chain_link"]
          question: string
          sort_order: number
          status_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chain_link: Database["public"]["Enums"]["ds_chain_link"]
          question: string
          sort_order: number
          status_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chain_link?: Database["public"]["Enums"]["ds_chain_link"]
          question?: string
          sort_order?: number
          status_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ds_chart: {
        Row: {
          annotation_sectors: Database["public"]["Enums"]["tracker_sector"][]
          chain_link: Database["public"]["Enums"]["ds_chain_link"]
          chart_type: Database["public"]["Enums"]["ds_chart_type"]
          created_at: string
          published: boolean
          slug: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          annotation_sectors?: Database["public"]["Enums"]["tracker_sector"][]
          chain_link: Database["public"]["Enums"]["ds_chain_link"]
          chart_type: Database["public"]["Enums"]["ds_chart_type"]
          created_at?: string
          published?: boolean
          slug: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          annotation_sectors?: Database["public"]["Enums"]["tracker_sector"][]
          chain_link?: Database["public"]["Enums"]["ds_chain_link"]
          chart_type?: Database["public"]["Enums"]["ds_chart_type"]
          created_at?: string
          published?: boolean
          slug?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ds_chart_series: {
        Row: {
          chart_slug: string
          label: string
          members: string[] | null
          role: string
          series_id: string
          sort_order: number
        }
        Insert: {
          chart_slug: string
          label: string
          members?: string[] | null
          role?: string
          series_id: string
          sort_order?: number
        }
        Update: {
          chart_slug?: string
          label?: string
          members?: string[] | null
          role?: string
          series_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ds_chart_series_chart_slug_fkey"
            columns: ["chart_slug"]
            isOneToOne: false
            referencedRelation: "ds_chart"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ds_chart_series_chart_slug_fkey"
            columns: ["chart_slug"]
            isOneToOne: false
            referencedRelation: "v_chart_catalog"
            referencedColumns: ["chart_slug"]
          },
          {
            foreignKeyName: "ds_chart_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_chart_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      ds_check: {
        Row: {
          actual: string | null
          detail: string
          expected: string | null
          id: number
          passed: boolean
          rule_id: string
          run_at: string
          series_id: string
          severity: string
          stage_token: string
        }
        Insert: {
          actual?: string | null
          detail: string
          expected?: string | null
          id?: never
          passed: boolean
          rule_id: string
          run_at: string
          series_id: string
          severity: string
          stage_token: string
        }
        Update: {
          actual?: string | null
          detail?: string
          expected?: string | null
          id?: never
          passed?: boolean
          rule_id?: string
          run_at?: string
          series_id?: string
          severity?: string
          stage_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "ds_check_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_check_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      ds_fetch_run: {
        Row: {
          error: string | null
          finished_at: string | null
          git_sha: string | null
          id: string
          rows_staged: number
          run_url: string | null
          source_id: string
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          git_sha?: string | null
          id?: string
          rows_staged?: number
          run_url?: string | null
          source_id: string
          started_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          git_sha?: string | null
          id?: string
          rows_staged?: number
          run_url?: string | null
          source_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ds_fetch_run_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ds_source"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_fetch_run_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["source_id"]
          },
        ]
      }
      ds_observation: {
        Row: {
          entered_by: string | null
          fetch_run_id: string | null
          ingest: string
          is_projection: boolean
          member: string
          period_label: string | null
          period_start: string
          published_at: string
          retrieved_at: string
          series_id: string
          source_code: string | null
          source_locator: string | null
          source_url: string
          unit: string
          value: number
          vintage: string
          vintage_date: string | null
        }
        Insert: {
          entered_by?: string | null
          fetch_run_id?: string | null
          ingest: string
          is_projection?: boolean
          member?: string
          period_label?: string | null
          period_start: string
          published_at?: string
          retrieved_at: string
          series_id: string
          source_code?: string | null
          source_locator?: string | null
          source_url: string
          unit: string
          value: number
          vintage: string
          vintage_date?: string | null
        }
        Update: {
          entered_by?: string | null
          fetch_run_id?: string | null
          ingest?: string
          is_projection?: boolean
          member?: string
          period_label?: string | null
          period_start?: string
          published_at?: string
          retrieved_at?: string
          series_id?: string
          source_code?: string | null
          source_locator?: string | null
          source_url?: string
          unit?: string
          value?: number
          vintage?: string
          vintage_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ds_observation_fetch_run_id_fkey"
            columns: ["fetch_run_id"]
            isOneToOne: false
            referencedRelation: "ds_fetch_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_observation_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_observation_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      ds_observation_stage: {
        Row: {
          entered_by: string | null
          fetch_run_id: string | null
          id: number
          ingest: string
          is_projection: boolean
          member: string
          period_label: string | null
          period_start: string
          retrieved_at: string
          series_id: string
          source_code: string | null
          source_locator: string | null
          source_url: string | null
          stage_token: string
          staged_at: string
          unit: string | null
          value: number
          vintage: string
        }
        Insert: {
          entered_by?: string | null
          fetch_run_id?: string | null
          id?: never
          ingest: string
          is_projection?: boolean
          member?: string
          period_label?: string | null
          period_start: string
          retrieved_at?: string
          series_id: string
          source_code?: string | null
          source_locator?: string | null
          source_url?: string | null
          stage_token: string
          staged_at?: string
          unit?: string | null
          value: number
          vintage: string
        }
        Update: {
          entered_by?: string | null
          fetch_run_id?: string | null
          id?: never
          ingest?: string
          is_projection?: boolean
          member?: string
          period_label?: string | null
          period_start?: string
          retrieved_at?: string
          series_id?: string
          source_code?: string | null
          source_locator?: string | null
          source_url?: string | null
          stage_token?: string
          staged_at?: string
          unit?: string | null
          value?: number
          vintage?: string
        }
        Relationships: [
          {
            foreignKeyName: "ds_observation_stage_fetch_run_id_fkey"
            columns: ["fetch_run_id"]
            isOneToOne: false
            referencedRelation: "ds_fetch_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_observation_stage_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_observation_stage_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      ds_series: {
        Row: {
          chain_link: Database["public"]["Enums"]["ds_chain_link"]
          created_at: string
          definition_note: string
          frequency: Database["public"]["Enums"]["ds_frequency"]
          id: string
          ingest: string
          is_projection: boolean
          r7_threshold: number
          review_due: string | null
          source_code: string
          source_id: string
          source_url: string
          status: string
          title_en: string
          title_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          chain_link: Database["public"]["Enums"]["ds_chain_link"]
          created_at?: string
          definition_note: string
          frequency: Database["public"]["Enums"]["ds_frequency"]
          id: string
          ingest: string
          is_projection?: boolean
          r7_threshold?: number
          review_due?: string | null
          source_code: string
          source_id: string
          source_url: string
          status?: string
          title_en: string
          title_id: string
          unit: string
          updated_at?: string
        }
        Update: {
          chain_link?: Database["public"]["Enums"]["ds_chain_link"]
          created_at?: string
          definition_note?: string
          frequency?: Database["public"]["Enums"]["ds_frequency"]
          id?: string
          ingest?: string
          is_projection?: boolean
          r7_threshold?: number
          review_due?: string | null
          source_code?: string
          source_id?: string
          source_url?: string
          status?: string
          title_en?: string
          title_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ds_series_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ds_source"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_series_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["source_id"]
          },
        ]
      }
      ds_source: {
        Row: {
          access: string
          created_at: string
          homepage_url: string
          id: string
          license: string
          name: string
        }
        Insert: {
          access: string
          created_at?: string
          homepage_url: string
          id: string
          license: string
          name: string
        }
        Update: {
          access?: string
          created_at?: string
          homepage_url?: string
          id?: string
          license?: string
          name?: string
        }
        Relationships: []
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
            referencedRelation: "essay_structure"
            referencedColumns: ["id"]
          },
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
          selected_rank: number | null
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
          selected_rank?: number | null
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
          selected_rank?: number | null
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
      fs_check: {
        Row: {
          actual: number | null
          description: string
          diff: number | null
          expected: number | null
          id: string
          passed: boolean
          period_id: string
          rule_id: string
          run_at: string
          statement: string | null
        }
        Insert: {
          actual?: number | null
          description: string
          diff?: number | null
          expected?: number | null
          id?: string
          passed: boolean
          period_id: string
          rule_id: string
          run_at?: string
          statement?: string | null
        }
        Update: {
          actual?: number | null
          description?: string
          diff?: number | null
          expected?: number | null
          id?: string
          passed?: boolean
          period_id?: string
          rule_id?: string
          run_at?: string
          statement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fs_check_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fs_period"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_company: {
        Row: {
          created_at: string
          id: string
          legal_name: string
          short_name: string
        }
        Insert: {
          created_at?: string
          id: string
          legal_name: string
          short_name: string
        }
        Update: {
          created_at?: string
          id?: string
          legal_name?: string
          short_name?: string
        }
        Relationships: []
      }
      fs_line: {
        Row: {
          computed_cy: number | null
          computed_py: number | null
          fsli_slug: string | null
          id: string
          indent: number
          label_en: string
          label_id: string
          line_key: string | null
          line_type: string
          notes_ref: string | null
          parent_id: string | null
          period_id: string
          printed_diff_cy: number | null
          printed_diff_note: string | null
          printed_diff_py: number | null
          sort_order: number
          source_page: number
          statement: string
          value_cy: number | null
          value_py: number | null
        }
        Insert: {
          computed_cy?: number | null
          computed_py?: number | null
          fsli_slug?: string | null
          id?: string
          indent?: number
          label_en: string
          label_id: string
          line_key?: string | null
          line_type: string
          notes_ref?: string | null
          parent_id?: string | null
          period_id: string
          printed_diff_cy?: number | null
          printed_diff_note?: string | null
          printed_diff_py?: number | null
          sort_order: number
          source_page: number
          statement: string
          value_cy?: number | null
          value_py?: number | null
        }
        Update: {
          computed_cy?: number | null
          computed_py?: number | null
          fsli_slug?: string | null
          id?: string
          indent?: number
          label_en?: string
          label_id?: string
          line_key?: string | null
          line_type?: string
          notes_ref?: string | null
          parent_id?: string | null
          period_id?: string
          printed_diff_cy?: number | null
          printed_diff_note?: string | null
          printed_diff_py?: number | null
          sort_order?: number
          source_page?: number
          statement?: string
          value_cy?: number | null
          value_py?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fs_line_fsli_slug_fkey"
            columns: ["fsli_slug"]
            isOneToOne: false
            referencedRelation: "fsli_pages"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fs_line_parent_in_scope"
            columns: ["parent_id", "period_id", "statement"]
            isOneToOne: false
            referencedRelation: "fs_line"
            referencedColumns: ["id", "period_id", "statement"]
          },
          {
            foreignKeyName: "fs_line_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fs_period"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_period: {
        Row: {
          auditor: string | null
          auditor_opinion: string | null
          auditor_report_no: string | null
          company_id: string
          comparative_end: string
          currency: string
          id: string
          period_end: string
          period_key: string
          source_file: string
          status: string
          unit: string
        }
        Insert: {
          auditor?: string | null
          auditor_opinion?: string | null
          auditor_report_no?: string | null
          company_id: string
          comparative_end: string
          currency: string
          id?: string
          period_end: string
          period_key: string
          source_file: string
          status?: string
          unit: string
        }
        Update: {
          auditor?: string | null
          auditor_opinion?: string | null
          auditor_report_no?: string | null
          company_id?: string
          comparative_end?: string
          currency?: string
          id?: string
          period_end?: string
          period_key?: string
          source_file?: string
          status?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "fs_period_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fs_company"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_soce_cell: {
        Row: {
          col_key: string
          col_label_en: string
          col_label_id: string
          col_order: number
          id: string
          notes_ref: string | null
          period_id: string
          row_key: string
          row_label_en: string
          row_label_id: string
          row_order: number
          source_page: number
          value: number | null
        }
        Insert: {
          col_key: string
          col_label_en: string
          col_label_id: string
          col_order: number
          id?: string
          notes_ref?: string | null
          period_id: string
          row_key: string
          row_label_en: string
          row_label_id: string
          row_order: number
          source_page: number
          value?: number | null
        }
        Update: {
          col_key?: string
          col_label_en?: string
          col_label_id?: string
          col_order?: number
          id?: string
          notes_ref?: string | null
          period_id?: string
          row_key?: string
          row_label_en?: string
          row_label_id?: string
          row_order?: number
          source_page?: number
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fs_soce_cell_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "fs_period"
            referencedColumns: ["id"]
          },
        ]
      }
      fsli_pages: {
        Row: {
          category: string | null
          covered_by_slug: string | null
          created_at: string
          id: string
          is_component: boolean | null
          legacy_dec_2023: string | null
          legacy_dec_2024: string | null
          legacy_notes_ref: string | null
          slug: string
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          covered_by_slug?: string | null
          created_at?: string
          id?: string
          is_component?: boolean | null
          legacy_dec_2023?: string | null
          legacy_dec_2024?: string | null
          legacy_notes_ref?: string | null
          slug: string
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          covered_by_slug?: string | null
          created_at?: string
          id?: string
          is_component?: boolean | null
          legacy_dec_2023?: string | null
          legacy_dec_2024?: string | null
          legacy_notes_ref?: string | null
          slug?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fsli_pages_covered_by_slug_fkey"
            columns: ["covered_by_slug"]
            isOneToOne: false
            referencedRelation: "fsli_pages"
            referencedColumns: ["slug"]
          },
        ]
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
      toolkit_versions: {
        Row: {
          changelog: string | null
          file_key: string
          id: string
          published_at: string
          sha256: string
          size_bytes: number
          toolkit_id: string
          version: string
        }
        Insert: {
          changelog?: string | null
          file_key: string
          id?: string
          published_at?: string
          sha256: string
          size_bytes: number
          toolkit_id: string
          version: string
        }
        Update: {
          changelog?: string | null
          file_key?: string
          id?: string
          published_at?: string
          sha256?: string
          size_bytes?: number
          toolkit_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolkit_versions_toolkit_id_fkey"
            columns: ["toolkit_id"]
            isOneToOne: false
            referencedRelation: "toolkits"
            referencedColumns: ["id"]
          },
        ]
      }
      toolkits: {
        Row: {
          checks: Json
          created_at: string
          created_by: string | null
          format: string
          id: string
          module_id: string
          purpose: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          checks?: Json
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          module_id: string
          purpose: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          checks?: Json
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          module_id?: string
          purpose?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolkits_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "finance_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_entry: {
        Row: {
          created_at: string
          detail: string
          finding: string
          id: string
          published: boolean
          quarter: string
          sector: Database["public"]["Enums"]["tracker_sector"]
          sources: Json
          status: Database["public"]["Enums"]["tracker_status"]
          updated_at: string
          verification: string
        }
        Insert: {
          created_at?: string
          detail: string
          finding: string
          id: string
          published?: boolean
          quarter: string
          sector: Database["public"]["Enums"]["tracker_sector"]
          sources: Json
          status: Database["public"]["Enums"]["tracker_status"]
          updated_at?: string
          verification: string
        }
        Update: {
          created_at?: string
          detail?: string
          finding?: string
          id?: string
          published?: boolean
          quarter?: string
          sector?: Database["public"]["Enums"]["tracker_sector"]
          sources?: Json
          status?: Database["public"]["Enums"]["tracker_status"]
          updated_at?: string
          verification?: string
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
          phase: string | null
          published: boolean | null
          read_time: string | null
          section: string | null
          slug: string | null
          snippet: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          author?: string | null
          finance_order?: number | null
          id?: string | null
          lesson_type?: never
          module_id?: string | null
          phase?: string | null
          published?: boolean | null
          read_time?: never
          section?: string | null
          slug?: string | null
          snippet?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          author?: string | null
          finance_order?: number | null
          id?: string | null
          lesson_type?: never
          module_id?: string | null
          phase?: string | null
          published?: boolean | null
          read_time?: never
          section?: string | null
          slug?: string | null
          snippet?: string | null
          sort_order?: number | null
          title?: string | null
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
      v_chain: {
        Row: {
          chain_link: Database["public"]["Enums"]["ds_chain_link"] | null
          question: string | null
          sort_order: number | null
          status_text: string | null
          title: string | null
        }
        Insert: {
          chain_link?: Database["public"]["Enums"]["ds_chain_link"] | null
          question?: string | null
          sort_order?: number | null
          status_text?: string | null
          title?: string | null
        }
        Update: {
          chain_link?: Database["public"]["Enums"]["ds_chain_link"] | null
          question?: string | null
          sort_order?: number | null
          status_text?: string | null
          title?: string | null
        }
        Relationships: []
      }
      v_chart_catalog: {
        Row: {
          annotation_sectors:
            | Database["public"]["Enums"]["tracker_sector"][]
            | null
          chain_link: Database["public"]["Enums"]["ds_chain_link"] | null
          chart_slug: string | null
          chart_sort: number | null
          chart_type: Database["public"]["Enums"]["ds_chart_type"] | null
          chart_updated_at: string | null
          frequency: Database["public"]["Enums"]["ds_frequency"] | null
          is_projection: boolean | null
          label: string | null
          members: string[] | null
          role: string | null
          series_id: string | null
          series_sort: number | null
          series_title: string | null
          source_code: string | null
          source_name: string | null
          subtitle: string | null
          title: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ds_chart_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_chart_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      v_chart_data: {
        Row: {
          chart_slug: string | null
          is_projection: boolean | null
          label: string | null
          member: string | null
          period_label: string | null
          period_start: string | null
          retrieved_at: string | null
          role: string | null
          series_id: string | null
          series_sort: number | null
          source_code: string | null
          source_locator: string | null
          source_url: string | null
          unit: string | null
          value: number | null
          vintage: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ds_chart_series_chart_slug_fkey"
            columns: ["chart_slug"]
            isOneToOne: false
            referencedRelation: "ds_chart"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ds_chart_series_chart_slug_fkey"
            columns: ["chart_slug"]
            isOneToOne: false
            referencedRelation: "v_chart_catalog"
            referencedColumns: ["chart_slug"]
          },
          {
            foreignKeyName: "ds_chart_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_chart_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      v_chart_usage: {
        Row: {
          chart_slug: string | null
          essay_slug: string | null
          essay_title: string | null
        }
        Relationships: []
      }
      v_macro_editions: {
        Row: {
          edition: string | null
          last_actual_year: number | null
          last_year: number | null
          published_at: string | null
        }
        Relationships: []
      }
      v_series_history: {
        Row: {
          ingest: string | null
          is_projection: boolean | null
          member: string | null
          period_label: string | null
          period_start: string | null
          published_at: string | null
          retrieved_at: string | null
          series_id: string | null
          source_code: string | null
          source_locator: string | null
          source_url: string | null
          unit: string | null
          value: number | null
          vintage: string | null
          vintage_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ds_observation_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_observation_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      v_series_latest: {
        Row: {
          ingest: string | null
          is_projection: boolean | null
          member: string | null
          period_label: string | null
          period_start: string | null
          retrieved_at: string | null
          series_id: string | null
          source_code: string | null
          source_locator: string | null
          source_url: string | null
          unit: string | null
          value: number | null
          vintage: string | null
          vintage_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ds_observation_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "ds_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ds_observation_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "v_series_status"
            referencedColumns: ["series_id"]
          },
        ]
      }
      v_series_status: {
        Row: {
          chain_link: Database["public"]["Enums"]["ds_chain_link"] | null
          definition_note: string | null
          first_period: string | null
          frequency: Database["public"]["Enums"]["ds_frequency"] | null
          ingest: string | null
          is_projection: boolean | null
          last_check_at: string | null
          last_check_failed: number | null
          last_check_rules: number | null
          last_check_warned: number | null
          last_period: string | null
          last_retrieved_at: string | null
          latest_vintage: string | null
          n_values: number | null
          review_due: string | null
          series_id: string | null
          series_url: string | null
          source_code: string | null
          source_homepage: string | null
          source_id: string | null
          source_license: string | null
          source_name: string | null
          title_en: string | null
          title_id: string | null
          unit: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _export_accounting_20261012: {
        Args: { p_token: string; p_what: string }
        Returns: Json
      }
      _import_accounting_essays_20261012: {
        Args: { p_rows: Json; p_token: string }
        Returns: {
          action: string
          essay_id: string
          revision_no: number
          slug: string
        }[]
      }
      _wp3_export: { Args: { t: string }; Returns: Json[] }
      _wp3_export_ids: { Args: { t: string }; Returns: Json[] }
      ds__gate: {
        Args: {
          p_confirm_warnings: boolean
          p_series_id: string
          p_stage_token: string
        }
        Returns: {
          failed: number
          published: boolean
          rows_published: number
          rows_unchanged: number
          rules: number
          run_at: string
          warnings: number
        }[]
      }
      ds_macro_assumptions: {
        Args: { p_edition: string }
        Returns: {
          edition: string
          indicator: string
          is_projection: boolean
          n_months: number
          series_id: string
          source_code: string
          unit: string
          value: number
          vintage: string
          year: number
        }[]
      }
      ds_on_grid: {
        Args: {
          p_frequency: Database["public"]["Enums"]["ds_frequency"]
          p_period: string
        }
        Returns: boolean
      }
      ds_preview_stage: {
        Args: { p_series_id: string; p_stage_token: string }
        Returns: {
          actual: string
          detail: string
          expected: string
          passed: boolean
          rule_id: string
          severity: string
        }[]
      }
      ds_publish_series: {
        Args: {
          p_confirm_warnings?: boolean
          p_series_id: string
          p_stage_token: string
        }
        Returns: {
          failed: number
          published: boolean
          rows_published: number
          rows_unchanged: number
          rules: number
          run_at: string
          warnings: number
        }[]
      }
      ds_run_publish_gate: {
        Args: { p_series_id: string; p_stage_token: string }
        Returns: {
          failed: number
          published: boolean
          rows_published: number
          rows_unchanged: number
          rules: number
          run_at: string
          warnings: number
        }[]
      }
      ds_stage_checks: {
        Args: { p_series_id: string; p_stage_token: string }
        Returns: {
          actual: string
          detail: string
          expected: string
          passed: boolean
          rule_id: string
          severity: string
        }[]
      }
      ds_vintage_date: { Args: { p_vintage: string }; Returns: string }
      fs_publish_period: {
        Args: { p_period_id: string }
        Returns: {
          failed: number
          published: boolean
          rules: number
          run_at: string
        }[]
      }
      fs_run_publish_gate: {
        Args: { p_period_id: string }
        Returns: {
          failed: number
          published: boolean
          rules: number
          run_at: string
        }[]
      }
      fs_tieout: {
        Args: { p_period_id: string }
        Returns: {
          actual: number
          description: string
          diff: number
          expected: number
          passed: boolean
          rule_id: string
          statement: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      tracker_sources_valid: { Args: { s: Json }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      content_status_enum: "draft" | "tone_pending" | "published" | "archived"
      ds_chain_link:
        | "policy"
        | "infrastructure"
        | "finance"
        | "transition"
        | "carbon_price"
        | "macro"
      ds_chart_type:
        | "line"
        | "bar"
        | "stacked_bar"
        | "step"
        | "dot_whisker"
        | "timeline"
      ds_frequency: "A" | "Q" | "M" | "event"
      lesson_type_enum:
        | "concept"
        | "framework"
        | "case-study"
        | "exercise"
        | "model-walkthrough"
      model_depth: "foundation" | "executive" | "institutional"
      tracker_sector:
        | "geothermal"
        | "solar"
        | "pln_procurement"
        | "jetp"
        | "ojk_taxonomy"
        | "danantara"
        | "other"
      tracker_status: "advanced" | "unchanged" | "regressed" | "mixed"
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
    Enums: {
      app_role: ["admin", "user"],
      content_status_enum: ["draft", "tone_pending", "published", "archived"],
      ds_chain_link: [
        "policy",
        "infrastructure",
        "finance",
        "transition",
        "carbon_price",
        "macro",
      ],
      ds_chart_type: [
        "line",
        "bar",
        "stacked_bar",
        "step",
        "dot_whisker",
        "timeline",
      ],
      ds_frequency: ["A", "Q", "M", "event"],
      lesson_type_enum: [
        "concept",
        "framework",
        "case-study",
        "exercise",
        "model-walkthrough",
      ],
      model_depth: ["foundation", "executive", "institutional"],
      tracker_sector: [
        "geothermal",
        "solar",
        "pln_procurement",
        "jetp",
        "ojk_taxonomy",
        "danantara",
        "other",
      ],
      tracker_status: ["advanced", "unchanged", "regressed", "mixed"],
      voice_role_enum: ["manager", "economist", "educator", "coach", "hybrid"],
    },
  },
} as const
