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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
          section_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          section_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          section_id?: string | null
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
      category_cards: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          link_text: string | null
          link_url: string | null
          page_slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          link_text?: string | null
          link_url?: string | null
          page_slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          link_text?: string | null
          link_url?: string | null
          page_slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_key: string
          block_type: string | null
          content: string
          created_at: string
          id: string
          page_slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          block_key: string
          block_type?: string | null
          content: string
          created_at?: string
          id?: string
          page_slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          block_key?: string
          block_type?: string | null
          content?: string
          created_at?: string
          id?: string
          page_slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      embeds: {
        Row: {
          created_at: string
          created_by: string | null
          embed_type: string
          height: number | null
          id: string
          page_slug: string
          scrollable: boolean | null
          sort_order: number | null
          src: string
          title: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          embed_type: string
          height?: number | null
          id?: string
          page_slug: string
          scrollable?: boolean | null
          sort_order?: number | null
          src: string
          title?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          embed_type?: string
          height?: number | null
          id?: string
          page_slug?: string
          scrollable?: boolean | null
          sort_order?: number | null
          src?: string
          title?: string | null
          width?: number | null
        }
        Relationships: []
      }
      essays: {
        Row: {
          author: string | null
          category_id: string | null
          coach_fields: Json | null
          content: string | null
          created_at: string
          date: string | null
          economist_fields: Json | null
          educator_fields: Json | null
          finance_order: number | null
          finance_section: string | null
          fsli_slug: string | null
          module_id: string | null
          id: string
          learning_outcomes: string[] | null
          manager_fields: Json | null
          phase: string | null
          prerequisites: string[] | null
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
          category_id?: string | null
          coach_fields?: Json | null
          content?: string | null
          created_at?: string
          date?: string | null
          economist_fields?: Json | null
          educator_fields?: Json | null
          finance_order?: number | null
          finance_section?: string | null
          fsli_slug?: string | null
          module_id?: string | null
          id?: string
          learning_outcomes?: string[] | null
          manager_fields?: Json | null
          phase?: string | null
          prerequisites?: string[] | null
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
          category_id?: string | null
          coach_fields?: Json | null
          content?: string | null
          created_at?: string
          date?: string | null
          economist_fields?: Json | null
          educator_fields?: Json | null
          finance_order?: number | null
          finance_section?: string | null
          fsli_slug?: string | null
          module_id?: string | null
          id?: string
          learning_outcomes?: string[] | null
          manager_fields?: Json | null
          phase?: string | null
          prerequisites?: string[] | null
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
        ]
      }
      finance_accounts: {
        Row: {
          account_number: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          created_at: string
          currency: string
          id: string
          institution: string | null
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          period: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          period?: string
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          period?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          category_type: Database["public"]["Enums"]["transaction_type"]
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          category_type?: Database["public"]["Enums"]["transaction_type"]
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          category_type?: Database["public"]["Enums"]["transaction_type"]
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_fundamentals: {
        Row: {
          created_at: string
          framing_content: string | null
          id: string
          number: number | null
          slug: string
          sort_order: number
          thesis: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          framing_content?: string | null
          id?: string
          number?: number | null
          slug: string
          sort_order?: number
          thesis?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          framing_content?: string | null
          id?: string
          number?: number | null
          slug?: string
          sort_order?: number
          thesis?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_net_worth_history: {
        Row: {
          created_at: string
          date: string
          id: string
          net_worth: number
          total_assets: number
          total_liabilities: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          net_worth?: number
          total_assets?: number
          total_liabilities?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          net_worth?: number
          total_assets?: number
          total_liabilities?: number
          user_id?: string
        }
        Relationships: []
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
      finance_transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          merchant: string | null
          notes: string | null
          tags: string[] | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          transfer_to_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          transfer_to_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          transfer_to_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_transfer_to_account_id_fkey"
            columns: ["transfer_to_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      pages: {
        Row: {
          created_at: string
          description: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      quant_backtest_results: {
        Row: {
          avg_trade_return: number | null
          backtest_id: string | null
          cagr: number | null
          created_at: string
          drawdown_curve: Json | null
          equity_curve: Json | null
          id: string
          max_drawdown: number | null
          max_drawdown_duration: number | null
          profit_factor: number | null
          regime_metrics: Json | null
          sharpe_ratio: number | null
          sortino_ratio: number | null
          total_trades: number | null
          trade_log: Json | null
          win_rate: number | null
        }
        Insert: {
          avg_trade_return?: number | null
          backtest_id?: string | null
          cagr?: number | null
          created_at?: string
          drawdown_curve?: Json | null
          equity_curve?: Json | null
          id?: string
          max_drawdown?: number | null
          max_drawdown_duration?: number | null
          profit_factor?: number | null
          regime_metrics?: Json | null
          sharpe_ratio?: number | null
          sortino_ratio?: number | null
          total_trades?: number | null
          trade_log?: Json | null
          win_rate?: number | null
        }
        Update: {
          avg_trade_return?: number | null
          backtest_id?: string | null
          cagr?: number | null
          created_at?: string
          drawdown_curve?: Json | null
          equity_curve?: Json | null
          id?: string
          max_drawdown?: number | null
          max_drawdown_duration?: number | null
          profit_factor?: number | null
          regime_metrics?: Json | null
          sharpe_ratio?: number | null
          sortino_ratio?: number | null
          total_trades?: number | null
          trade_log?: Json | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quant_backtest_results_backtest_id_fkey"
            columns: ["backtest_id"]
            isOneToOne: false
            referencedRelation: "quant_backtests"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_backtests: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          rebalance_frequency: string
          start_date: string
          status: string
          training_window_days: number
          universe: Json
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          config: Json
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          rebalance_frequency?: string
          start_date: string
          status?: string
          training_window_days?: number
          universe: Json
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          rebalance_frequency?: string
          start_date?: string
          status?: string
          training_window_days?: number
          universe?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      quant_data_quality: {
        Row: {
          check_date: string
          check_type: string
          created_at: string
          details: Json | null
          id: string
          is_resolved: boolean
          severity: string
          stock_id: string | null
        }
        Insert: {
          check_date: string
          check_type: string
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          severity: string
          stock_id?: string | null
        }
        Update: {
          check_date?: string
          check_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          is_resolved?: boolean
          severity?: string
          stock_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quant_data_quality_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_features: {
        Row: {
          created_at: string
          feature_date: string
          id: string
          log_return: number | null
          mean_reversion_signal: number | null
          momentum_10d: number | null
          price_zscore_20d: number | null
          rolling_vol_20d: number | null
          rolling_vol_5d: number | null
          rsi_14: number | null
          sma_cross_signal: number | null
          stock_id: string | null
          trend_signal: number | null
          volume_zscore: number | null
        }
        Insert: {
          created_at?: string
          feature_date: string
          id?: string
          log_return?: number | null
          mean_reversion_signal?: number | null
          momentum_10d?: number | null
          price_zscore_20d?: number | null
          rolling_vol_20d?: number | null
          rolling_vol_5d?: number | null
          rsi_14?: number | null
          sma_cross_signal?: number | null
          stock_id?: string | null
          trend_signal?: number | null
          volume_zscore?: number | null
        }
        Update: {
          created_at?: string
          feature_date?: string
          id?: string
          log_return?: number | null
          mean_reversion_signal?: number | null
          momentum_10d?: number | null
          price_zscore_20d?: number | null
          rolling_vol_20d?: number | null
          rolling_vol_5d?: number | null
          rsi_14?: number | null
          sma_cross_signal?: number | null
          stock_id?: string | null
          trend_signal?: number | null
          volume_zscore?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quant_features_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_positions: {
        Row: {
          calculation_date: string
          created_at: string
          current_exposure: number | null
          execution_feasibility: string | null
          expected_shortfall: number | null
          half_kelly_size: number | null
          id: string
          kelly_fraction: number | null
          liquidity_score: number | null
          max_position_pct: number | null
          stock_id: string | null
          var_1d: number | null
        }
        Insert: {
          calculation_date: string
          created_at?: string
          current_exposure?: number | null
          execution_feasibility?: string | null
          expected_shortfall?: number | null
          half_kelly_size?: number | null
          id?: string
          kelly_fraction?: number | null
          liquidity_score?: number | null
          max_position_pct?: number | null
          stock_id?: string | null
          var_1d?: number | null
        }
        Update: {
          calculation_date?: string
          created_at?: string
          current_exposure?: number | null
          execution_feasibility?: string | null
          expected_shortfall?: number | null
          half_kelly_size?: number | null
          id?: string
          kelly_fraction?: number | null
          liquidity_score?: number | null
          max_position_pct?: number | null
          stock_id?: string | null
          var_1d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quant_positions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      quant_regimes: {
        Row: {
          created_at: string
          id: string
          probability: number
          regime_date: string
          regime_id: number
          regime_label: string
          regime_probabilities: Json
          symbol: string
          trend_state: string | null
          volatility_state: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          probability: number
          regime_date: string
          regime_id: number
          regime_label: string
          regime_probabilities: Json
          symbol: string
          trend_state?: string | null
          volatility_state?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          probability?: number
          regime_date?: string
          regime_id?: number
          regime_label?: string
          regime_probabilities?: Json
          symbol?: string
          trend_state?: string | null
          volatility_state?: string | null
        }
        Relationships: []
      }
      quant_signals: {
        Row: {
          created_at: string
          direction: string
          expected_return: number | null
          expected_vol: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          probability: number
          raw_score: number | null
          regime_context: Json | null
          signal_date: string
          signal_type: string
          stock_id: string | null
        }
        Insert: {
          created_at?: string
          direction: string
          expected_return?: number | null
          expected_vol?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          probability: number
          raw_score?: number | null
          regime_context?: Json | null
          signal_date: string
          signal_type: string
          stock_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          expected_return?: number | null
          expected_vol?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          probability?: number
          raw_score?: number | null
          regime_context?: Json | null
          signal_date?: string
          signal_type?: string
          stock_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quant_signals_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      remora_corporate_actions: {
        Row: {
          action_type: string
          created_at: string
          data_source: string | null
          dividend_amount: number | null
          ex_date: string | null
          id: string
          ingested_at: string
          notes: string | null
          payment_date: string | null
          ratio_new: number | null
          ratio_old: number | null
          record_date: string | null
          stock_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          data_source?: string | null
          dividend_amount?: number | null
          ex_date?: string | null
          id?: string
          ingested_at?: string
          notes?: string | null
          payment_date?: string | null
          ratio_new?: number | null
          ratio_old?: number | null
          record_date?: string | null
          stock_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          data_source?: string | null
          dividend_amount?: number | null
          ex_date?: string | null
          id?: string
          ingested_at?: string
          notes?: string | null
          payment_date?: string | null
          ratio_new?: number | null
          ratio_old?: number | null
          record_date?: string | null
          stock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remora_corporate_actions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      remora_data_freshness: {
        Row: {
          dataset_type: string
          expected_update_frequency: string
          id: string
          is_stale: boolean
          last_update: string | null
          record_count: number | null
          source_name: string | null
          source_url: string | null
          staleness_threshold_minutes: number
          updated_at: string
        }
        Insert: {
          dataset_type: string
          expected_update_frequency: string
          id?: string
          is_stale?: boolean
          last_update?: string | null
          record_count?: number | null
          source_name?: string | null
          source_url?: string | null
          staleness_threshold_minutes?: number
          updated_at?: string
        }
        Update: {
          dataset_type?: string
          expected_update_frequency?: string
          id?: string
          is_stale?: boolean
          last_update?: string | null
          record_count?: number | null
          source_name?: string | null
          source_url?: string | null
          staleness_threshold_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      remora_ingestion_logs: {
        Row: {
          completed_at: string | null
          dataset_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          records_invalid: number
          records_processed: number
          records_valid: number
          source_name: string
          source_url: string | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          dataset_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_invalid?: number
          records_processed?: number
          records_valid?: number
          source_name: string
          source_url?: string | null
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          dataset_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_invalid?: number
          records_processed?: number
          records_valid?: number
          source_name?: string
          source_url?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      remora_ohlcv_daily: {
        Row: {
          close_price: number
          data_source: string | null
          date: string
          foreign_buy: number | null
          foreign_sell: number | null
          frequency: number | null
          high_price: number
          id: string
          ingested_at: string
          is_valid: boolean
          low_price: number
          open_price: number
          stock_id: string
          validation_errors: string[] | null
          value: number | null
          volume: number
        }
        Insert: {
          close_price: number
          data_source?: string | null
          date: string
          foreign_buy?: number | null
          foreign_sell?: number | null
          frequency?: number | null
          high_price: number
          id?: string
          ingested_at?: string
          is_valid?: boolean
          low_price: number
          open_price: number
          stock_id: string
          validation_errors?: string[] | null
          value?: number | null
          volume: number
        }
        Update: {
          close_price?: number
          data_source?: string | null
          date?: string
          foreign_buy?: number | null
          foreign_sell?: number | null
          frequency?: number | null
          high_price?: number
          id?: string
          ingested_at?: string
          is_valid?: boolean
          low_price?: number
          open_price?: number
          stock_id?: string
          validation_errors?: string[] | null
          value?: number | null
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "remora_ohlcv_daily_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      remora_signals: {
        Row: {
          confidence: string
          created_at: string
          direction: string
          id: string
          input_data_timestamp: string
          is_stale: boolean
          price_at_signal: number
          reasoning: Json | null
          signal_date: string
          signal_type: string
          stock_id: string
          stop_loss: number | null
          strength: number
          target_price: number | null
        }
        Insert: {
          confidence: string
          created_at?: string
          direction: string
          id?: string
          input_data_timestamp: string
          is_stale?: boolean
          price_at_signal: number
          reasoning?: Json | null
          signal_date: string
          signal_type: string
          stock_id: string
          stop_loss?: number | null
          strength: number
          target_price?: number | null
        }
        Update: {
          confidence?: string
          created_at?: string
          direction?: string
          id?: string
          input_data_timestamp?: string
          is_stale?: boolean
          price_at_signal?: number
          reasoning?: Json | null
          signal_date?: string
          signal_type?: string
          stock_id?: string
          stop_loss?: number | null
          strength?: number
          target_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "remora_signals_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      remora_stocks: {
        Row: {
          created_at: string
          data_source: string | null
          free_float_shares: number | null
          id: string
          is_active: boolean
          last_updated: string
          listing_date: string | null
          market_cap: number | null
          name: string
          sector: string | null
          subsector: string | null
          symbol: string
          total_shares: number | null
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          free_float_shares?: number | null
          id?: string
          is_active?: boolean
          last_updated?: string
          listing_date?: string | null
          market_cap?: number | null
          name: string
          sector?: string | null
          subsector?: string | null
          symbol: string
          total_shares?: number | null
        }
        Update: {
          created_at?: string
          data_source?: string | null
          free_float_shares?: number | null
          id?: string
          is_active?: boolean
          last_updated?: string
          listing_date?: string | null
          market_cap?: number | null
          name?: string
          sector?: string | null
          subsector?: string | null
          symbol?: string
          total_shares?: number | null
        }
        Relationships: []
      }
      remora_system_health: {
        Row: {
          error_count: number
          execution_time_ms: number | null
          id: string
          last_error: string | null
          last_run_at: string | null
          last_success_at: string | null
          metadata: Json | null
          module_name: string
          status: string
          updated_at: string
        }
        Insert: {
          error_count?: number
          execution_time_ms?: number | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          module_name: string
          status: string
          updated_at?: string
        }
        Update: {
          error_count?: number
          execution_time_ms?: number | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          module_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      remora_watchlist: {
        Row: {
          alert_on_signal: boolean
          created_at: string
          id: string
          notes: string | null
          stock_id: string
          user_id: string
        }
        Insert: {
          alert_on_signal?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          stock_id: string
          user_id: string
        }
        Update: {
          alert_on_signal?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          stock_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remora_watchlist_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "remora_stocks"
            referencedColumns: ["id"]
          },
        ]
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
      account_type:
        | "checking"
        | "savings"
        | "credit_card"
        | "investment"
        | "loan"
        | "property"
        | "vehicle"
        | "crypto"
        | "other"
      app_role: "admin" | "user"
      content_status_enum: "draft" | "tone_pending" | "published" | "archived"
      transaction_type: "income" | "expense" | "transfer"
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
      account_type: [
        "checking",
        "savings",
        "credit_card",
        "investment",
        "loan",
        "property",
        "vehicle",
        "crypto",
        "other",
      ],
      app_role: ["admin", "user"],
      content_status_enum: ["draft", "tone_pending", "published", "archived"],
      transaction_type: ["income", "expense", "transfer"],
      voice_role_enum: ["manager", "economist", "educator", "coach", "hybrid"],
    },
  },
} as const
