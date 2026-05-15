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
      ai_usage_daily_summary: {
        Row: {
          company_id: string
          created_at: string
          date: string
          id: string
          model: string
          module: string
          total_calls: number
          total_completion_tokens: number
          total_cost_usd: number
          total_prompt_tokens: number
          total_tokens: number
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          id?: string
          model: string
          module: string
          total_calls?: number
          total_completion_tokens?: number
          total_cost_usd?: number
          total_prompt_tokens?: number
          total_tokens?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          model?: string
          module?: string
          total_calls?: number
          total_completion_tokens?: number
          total_cost_usd?: number
          total_prompt_tokens?: number
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_summary_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_activity_log: {
        Row: {
          actor_user_id: string | null
          agent_id: string
          company_id: string
          created_at: string
          details: Json
          event_type: string
          id: string
        }
        Insert: {
          actor_user_id?: string | null
          agent_id: string
          company_id: string
          created_at?: string
          details?: Json
          event_type: string
          id?: string
        }
        Update: {
          actor_user_id?: string | null
          agent_id?: string
          company_id?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          company_id: string
          completion_tokens: number
          created_at: string
          estimated_cost_usd: number
          id: string
          is_fallback: boolean
          metadata: Json
          model: string
          module: string
          operation: string
          prompt_tokens: number
          total_tokens: number
        }
        Insert: {
          company_id: string
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          is_fallback?: boolean
          metadata?: Json
          model: string
          module: string
          operation: string
          prompt_tokens?: number
          total_tokens?: number
        }
        Update: {
          company_id?: string
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          is_fallback?: boolean
          metadata?: Json
          model?: string
          module?: string
          operation?: string
          prompt_tokens?: number
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_log: {
        Row: {
          alert_type: string
          company_id: string
          error_detail: string | null
          id: string
          message_preview: string | null
          recipient_phone: string
          sent_at: string
          source_id: string | null
          status: string
        }
        Insert: {
          alert_type: string
          company_id: string
          error_detail?: string | null
          id?: string
          message_preview?: string | null
          recipient_phone: string
          sent_at?: string
          source_id?: string | null
          status?: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          error_detail?: string | null
          id?: string
          message_preview?: string | null
          recipient_phone?: string
          sent_at?: string
          source_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_preferences: {
        Row: {
          alert_type: string
          company_id: string
          cooldown_minutes: number
          created_at: string
          id: string
          is_enabled: boolean
          recipient_phone: string | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          company_id: string
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          recipient_phone?: string | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          recipient_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      async_jobs: {
        Row: {
          attempts: number | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number | null
          payload: Json | null
          result: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number | null
          payload?: Json | null
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number | null
          payload?: Json | null
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "async_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bridge_events: {
        Row: {
          attempts: number
          company_id: string
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          scheduled_at: string
          source: string
          status: string
          target: string
        }
        Insert: {
          attempts?: number
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string
          source: string
          status?: string
          target: string
        }
        Update: {
          attempts?: number
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string
          source?: string
          status?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridge_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collected_posts: {
        Row: {
          collected_at: string | null
          comments_count: number | null
          company_id: string | null
          competitor_id: string | null
          content: string | null
          engagement_score: number | null
          id: string
          likes_count: number | null
          platform: string | null
          post_url: string | null
          posted_at: string | null
          shares_count: number | null
          source_type: string
        }
        Insert: {
          collected_at?: string | null
          comments_count?: number | null
          company_id?: string | null
          competitor_id?: string | null
          content?: string | null
          engagement_score?: number | null
          id?: string
          likes_count?: number | null
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
          shares_count?: number | null
          source_type: string
        }
        Update: {
          collected_at?: string | null
          comments_count?: number | null
          company_id?: string | null
          competitor_id?: string | null
          content?: string | null
          engagement_score?: number | null
          id?: string
          likes_count?: number | null
          platform?: string | null
          post_url?: string | null
          posted_at?: string | null
          shares_count?: number | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "collected_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collected_posts_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          business_hours: Json | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          niche: string | null
          niche_slug: string | null
          settings: Json | null
          slug: string
          sub_niche: string | null
          timezone: string
          vocabulary_overrides: Json | null
          website_url: string | null
        }
        Insert: {
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          niche?: string | null
          niche_slug?: string | null
          settings?: Json | null
          slug: string
          sub_niche?: string | null
          timezone?: string
          vocabulary_overrides?: Json | null
          website_url?: string | null
        }
        Update: {
          business_hours?: Json | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          niche?: string | null
          niche_slug?: string | null
          settings?: Json | null
          slug?: string
          sub_niche?: string | null
          timezone?: string
          vocabulary_overrides?: Json | null
          website_url?: string | null
        }
        Relationships: []
      }
      competitor_profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          name: string
          website_url: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name: string
          website_url?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_demands: {
        Row: {
          approval_token: string | null
          approval_token_expires_at: string | null
          assigned_to: string | null
          caption: string | null
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          media_file_ids: string[]
          platforms: Json
          scheduled_post_id: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          approval_token?: string | null
          approval_token_expires_at?: string | null
          assigned_to?: string | null
          caption?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          media_file_ids?: string[]
          platforms?: Json
          scheduled_post_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          approval_token?: string | null
          approval_token_expires_at?: string | null
          assigned_to?: string | null
          caption?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          media_file_ids?: string[]
          platforms?: Json
          scheduled_post_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_demands_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_demands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_demands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_demands_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_digests: {
        Row: {
          company_id: string | null
          conversations_analyzed: number
          created_at: string | null
          id: string
          negative_sentiments: number
          period_end: string
          period_start: string
          purchase_intents: number
          summary_text: string
        }
        Insert: {
          company_id?: string | null
          conversations_analyzed?: number
          created_at?: string | null
          id?: string
          negative_sentiments?: number
          period_end: string
          period_start: string
          purchase_intents?: number
          summary_text: string
        }
        Update: {
          company_id?: string | null
          conversations_analyzed?: number
          created_at?: string | null
          id?: string
          negative_sentiments?: number
          period_end?: string
          period_start?: string
          purchase_intents?: number
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_digests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_exclusions: {
        Row: {
          company_id: string
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          external_id: string
          id: string
          remote_jid: string | null
        }
        Insert: {
          company_id: string
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          external_id: string
          id?: string
          remote_jid?: string | null
        }
        Update: {
          company_id?: string
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          external_id?: string
          id?: string
          remote_jid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_exclusions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_insights: {
        Row: {
          action_items: Json | null
          company_id: string | null
          confidence_score: number | null
          conversation_id: string | null
          explicit_need: string | null
          feedback_at: string | null
          feedback_by: string | null
          feedback_note: string | null
          feedback_status: string | null
          generated_at: string | null
          id: string
          implicit_need: string | null
          intent: string | null
          next_commitment: string | null
          objections: Json | null
          sales_stage: string | null
          sentiment: string | null
          stall_reason: string | null
          summary: string | null
        }
        Insert: {
          action_items?: Json | null
          company_id?: string | null
          confidence_score?: number | null
          conversation_id?: string | null
          explicit_need?: string | null
          feedback_at?: string | null
          feedback_by?: string | null
          feedback_note?: string | null
          feedback_status?: string | null
          generated_at?: string | null
          id?: string
          implicit_need?: string | null
          intent?: string | null
          next_commitment?: string | null
          objections?: Json | null
          sales_stage?: string | null
          sentiment?: string | null
          stall_reason?: string | null
          summary?: string | null
        }
        Update: {
          action_items?: Json | null
          company_id?: string | null
          confidence_score?: number | null
          conversation_id?: string | null
          explicit_need?: string | null
          feedback_at?: string | null
          feedback_by?: string | null
          feedback_note?: string | null
          feedback_status?: string | null
          generated_at?: string | null
          id?: string
          implicit_need?: string | null
          intent?: string | null
          next_commitment?: string | null
          objections?: Json | null
          sales_stage?: string | null
          sentiment?: string | null
          stall_reason?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_insights_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_insights_feedback_by_fkey"
            columns: ["feedback_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_notes: {
        Row: {
          company_id: string
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          contact_avatar_url: string | null
          contact_email: string | null
          contact_external_id: string | null
          contact_labels: Json | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          external_id: string | null
          id: string
          inbox_id: string | null
          labels: string[] | null
          last_message_at: string | null
          last_synced_at: string | null
          pipeline_stage: string | null
          remote_jid: string
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          contact_avatar_url?: string | null
          contact_email?: string | null
          contact_external_id?: string | null
          contact_labels?: Json | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          inbox_id?: string | null
          labels?: string[] | null
          last_message_at?: string | null
          last_synced_at?: string | null
          pipeline_stage?: string | null
          remote_jid: string
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          contact_avatar_url?: string | null
          contact_email?: string | null
          contact_external_id?: string | null
          contact_labels?: Json | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          inbox_id?: string | null
          labels?: string[] | null
          last_message_at?: string | null
          last_synced_at?: string | null
          pipeline_stage?: string | null
          remote_jid?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_comments: {
        Row: {
          author_name: string | null
          content: string
          created_at: string | null
          demand_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string | null
          demand_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string | null
          demand_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_comments_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "content_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_history: {
        Row: {
          comment: string | null
          created_at: string | null
          demand_id: string
          from_status: string
          id: string
          to_status: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          demand_id: string
          from_status: string
          id?: string
          to_status: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          demand_id?: string
          from_status?: string
          id?: string
          to_status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_history_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "content_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_agent_configs: {
        Row: {
          agent_name: string
          agent_tone: string
          company_id: string
          cooldown_seconds: number
          created_at: string
          evolution_instance_name: string | null
          feed_to_rag: boolean
          group_jid: string
          group_name: string | null
          id: string
          is_active: boolean
          is_hidden: boolean
          last_sales_alert_sent_at: string | null
          last_summary_sent_at: string | null
          max_responses_per_hour: number
          proactive_sales_alert: boolean
          proactive_summary: boolean
          proactive_summary_hour: number
          rag_batch_interval_minutes: number
          rag_min_message_length: number
          trigger_keywords: string[]
          updated_at: string
        }
        Insert: {
          agent_name?: string
          agent_tone?: string
          company_id: string
          cooldown_seconds?: number
          created_at?: string
          evolution_instance_name?: string | null
          feed_to_rag?: boolean
          group_jid: string
          group_name?: string | null
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          last_sales_alert_sent_at?: string | null
          last_summary_sent_at?: string | null
          max_responses_per_hour?: number
          proactive_sales_alert?: boolean
          proactive_summary?: boolean
          proactive_summary_hour?: number
          rag_batch_interval_minutes?: number
          rag_min_message_length?: number
          trigger_keywords?: string[]
          updated_at?: string
        }
        Update: {
          agent_name?: string
          agent_tone?: string
          company_id?: string
          cooldown_seconds?: number
          created_at?: string
          evolution_instance_name?: string | null
          feed_to_rag?: boolean
          group_jid?: string
          group_name?: string | null
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          last_sales_alert_sent_at?: string | null
          last_summary_sent_at?: string | null
          max_responses_per_hour?: number
          proactive_sales_alert?: boolean
          proactive_summary?: boolean
          proactive_summary_hour?: number
          rag_batch_interval_minutes?: number
          rag_min_message_length?: number
          trigger_keywords?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_agent_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      group_agent_notes: {
        Row: {
          category: string
          company_id: string
          config_id: string
          content: string
          created_at: string
          group_jid: string
          id: string
          is_active: boolean
          relevance_score: number
          source_sender: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          config_id: string
          content: string
          created_at?: string
          group_jid: string
          id?: string
          is_active?: boolean
          relevance_score?: number
          source_sender?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          config_id?: string
          content?: string
          created_at?: string
          group_jid?: string
          id?: string
          is_active?: boolean
          relevance_score?: number
          source_sender?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_agent_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_agent_notes_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "group_agent_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      group_agent_responses: {
        Row: {
          company_id: string
          config_id: string
          created_at: string
          evolution_status: string | null
          group_jid: string
          id: string
          model_used: string | null
          processing_time_ms: number | null
          rag_sources_used: number | null
          response_text: string
          response_type: string
          trigger_message_id: string | null
        }
        Insert: {
          company_id: string
          config_id: string
          created_at?: string
          evolution_status?: string | null
          group_jid: string
          id?: string
          model_used?: string | null
          processing_time_ms?: number | null
          rag_sources_used?: number | null
          response_text: string
          response_type?: string
          trigger_message_id?: string | null
        }
        Update: {
          company_id?: string
          config_id?: string
          created_at?: string
          evolution_status?: string | null
          group_jid?: string
          id?: string
          model_used?: string | null
          processing_time_ms?: number | null
          rag_sources_used?: number | null
          response_text?: string
          response_type?: string
          trigger_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_agent_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_agent_responses_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "group_agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_agent_responses_trigger_message_id_fkey"
            columns: ["trigger_message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_agent_sessions: {
        Row: {
          company_id: string
          config_id: string
          created_at: string
          expires_at: string
          group_jid: string
          id: string
          messages: Json
          sender_jid: string
          updated_at: string
        }
        Insert: {
          company_id: string
          config_id: string
          created_at?: string
          expires_at?: string
          group_jid: string
          id?: string
          messages?: Json
          sender_jid: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          config_id?: string
          created_at?: string
          expires_at?: string
          group_jid?: string
          id?: string
          messages?: Json
          sender_jid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_agent_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_agent_sessions_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "group_agent_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          agent_responded: boolean
          company_id: string
          config_id: string
          content: string | null
          group_jid: string
          id: string
          is_trigger: boolean
          message_id: string
          message_type: string | null
          rag_processed: boolean
          received_at: string
          sender_jid: string
          sender_name: string | null
          sent_at: string
        }
        Insert: {
          agent_responded?: boolean
          company_id: string
          config_id: string
          content?: string | null
          group_jid: string
          id?: string
          is_trigger?: boolean
          message_id: string
          message_type?: string | null
          rag_processed?: boolean
          received_at?: string
          sender_jid: string
          sender_name?: string | null
          sent_at: string
        }
        Update: {
          agent_responded?: boolean
          company_id?: string
          config_id?: string
          content?: string | null
          group_jid?: string
          id?: string
          is_trigger?: boolean
          message_id?: string
          message_type?: string | null
          rag_processed?: boolean
          received_at?: string
          sender_jid?: string
          sender_name?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "group_agent_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtag_groups: {
        Row: {
          company_id: string
          created_at: string | null
          hashtags: string[]
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          hashtags?: string[]
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          hashtags?: string[]
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hashtag_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          company_id: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          test_status: string | null
          type: string
        }
        Insert: {
          company_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          test_status?: string | null
          type: string
        }
        Update: {
          company_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          test_status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_insights: {
        Row: {
          analysis_type: string | null
          company_id: string | null
          competitor_id: string | null
          content: string | null
          generated_at: string | null
          id: string
          recommendations: Json | null
          source_type: string
          top_themes: Json | null
        }
        Insert: {
          analysis_type?: string | null
          company_id?: string | null
          competitor_id?: string | null
          content?: string | null
          generated_at?: string | null
          id?: string
          recommendations?: Json | null
          source_type: string
          top_themes?: Json | null
        }
        Update: {
          analysis_type?: string | null
          company_id?: string | null
          competitor_id?: string | null
          content?: string | null
          generated_at?: string | null
          id?: string
          recommendations?: Json | null
          source_type?: string
          top_themes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_insights_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          cloudinary_format: string | null
          cloudinary_public_id: string | null
          company_id: string | null
          created_at: string | null
          duration: number | null
          file_name: string
          file_size: number
          file_type: string
          height: number | null
          id: string
          public_url: string
          resource_type: string | null
          storage_path: string
          tags: string[] | null
          thumbnail_url: string | null
          width: number | null
        }
        Insert: {
          cloudinary_format?: string | null
          cloudinary_public_id?: string | null
          company_id?: string | null
          created_at?: string | null
          duration?: number | null
          file_name: string
          file_size: number
          file_type: string
          height?: number | null
          id?: string
          public_url: string
          resource_type?: string | null
          storage_path: string
          tags?: string[] | null
          thumbnail_url?: string | null
          width?: number | null
        }
        Update: {
          cloudinary_format?: string | null
          cloudinary_public_id?: string | null
          company_id?: string | null
          created_at?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          height?: number | null
          id?: string
          public_url?: string
          resource_type?: string | null
          storage_path?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          company_id: string | null
          content: string | null
          conversation_id: string | null
          direction: string | null
          id: string
          media_url: string | null
          message_type: string | null
          raw_payload: Json | null
          sent_at: string | null
        }
        Insert: {
          company_id?: string | null
          content?: string | null
          conversation_id?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          raw_payload?: Json | null
          sent_at?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string | null
          conversation_id?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          raw_payload?: Json | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      niche_aggregates: {
        Row: {
          avg_weekly_volume: number | null
          computed_at: string
          niche_slug: string
          opportunity_pct: number | null
          peer_count: number
          sentiment_positive_pct: number | null
          window_days: number
        }
        Insert: {
          avg_weekly_volume?: number | null
          computed_at?: string
          niche_slug: string
          opportunity_pct?: number | null
          peer_count?: number
          sentiment_positive_pct?: number | null
          window_days?: number
        }
        Update: {
          avg_weekly_volume?: number | null
          computed_at?: string
          niche_slug?: string
          opportunity_pct?: number | null
          peer_count?: number
          sentiment_positive_pct?: number | null
          window_days?: number
        }
        Relationships: []
      }
      operator_nudges: {
        Row: {
          company_id: string
          conversation_id: string | null
          created_at: string
          customer_name: string | null
          from_user_id: string
          id: string
          read_at: string | null
          to_user_id: string
          wait_seconds: number | null
        }
        Insert: {
          company_id: string
          conversation_id?: string | null
          created_at?: string
          customer_name?: string | null
          from_user_id: string
          id?: string
          read_at?: string | null
          to_user_id: string
          wait_seconds?: number | null
        }
        Update: {
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          customer_name?: string | null
          from_user_id?: string
          id?: string
          read_at?: string | null
          to_user_id?: string
          wait_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_nudges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_nudges_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_document_chunks: {
        Row: {
          chunk_index: number
          company_id: string | null
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          scope: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          company_id?: string | null
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          scope?: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          company_id?: string | null
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          scope?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_document_chunks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          company_id: string | null
          created_at: string | null
          error_message: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          scope: string
          source_key: string | null
          status: string
          storage_path: string
          total_chunks: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_size: number
          file_type?: string
          id?: string
          scope?: string
          source_key?: string | null
          status?: string
          storage_path: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          scope?: string
          source_key?: string | null
          status?: string
          storage_path?: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          attempt_count: number
          caption: string | null
          company_id: string | null
          created_at: string | null
          error_details: Json | null
          external_post_ids: Json | null
          id: string
          media_file_ids: string[]
          platforms: Json
          post_type: string
          progress: Json | null
          published_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          caption?: string | null
          company_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          external_post_ids?: Json | null
          id?: string
          media_file_ids: string[]
          platforms?: Json
          post_type: string
          progress?: Json | null
          published_at?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          caption?: string | null
          company_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          external_post_ids?: Json | null
          id?: string
          media_file_ids?: string[]
          platforms?: Json
          post_type?: string
          progress?: Json | null
          published_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_due_scheduled_posts: {
        Args: { p_batch_size?: number }
        Returns: {
          attempt_count: number
          company_id: string
          id: string
        }[]
      }
      dashboard_bootstrap: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          niche_slug: string
          role: string
          user_id: string
        }[]
      }
      dashboard_sentiment_trend_30d: {
        Args: { p_company_id: string }
        Returns: {
          day: string
          negativo: number
          neutro: number
          positivo: number
        }[]
      }
      match_rag_chunks:
        | {
            Args: {
              include_global?: boolean
              match_company_id: string
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              chunk_index: number
              content: string
              document_id: string
              id: string
              similarity: number
            }[]
          }
        | {
            Args: {
              match_company_id: string
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              chunk_index: number
              content: string
              document_id: string
              id: string
              similarity: number
            }[]
          }
      recompute_niche_aggregates: { Args: never; Returns: number }
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
