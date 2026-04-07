/**
 * Arquivo: src/database/types/database.types.ts
 * Propósito: Definir tipos estáticos do schema público usado pelo Supabase no Task 2.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          id: string;
          company_id: string;
          module: string;
          operation: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          estimated_cost_usd: number;
          is_fallback: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          module: string;
          operation: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          estimated_cost_usd?: number;
          is_fallback?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          module?: string;
          operation?: string;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          estimated_cost_usd?: number;
          is_fallback?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_usage_daily_summary: {
        Row: {
          id: string;
          company_id: string;
          date: string;
          module: string;
          model: string;
          total_calls: number;
          total_prompt_tokens: number;
          total_completion_tokens: number;
          total_tokens: number;
          total_cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          date: string;
          module: string;
          model: string;
          total_calls?: number;
          total_prompt_tokens?: number;
          total_completion_tokens?: number;
          total_tokens?: number;
          total_cost_usd?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          date?: string;
          module?: string;
          model?: string;
          total_calls?: number;
          total_prompt_tokens?: number;
          total_completion_tokens?: number;
          total_tokens?: number;
          total_cost_usd?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          created_at: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          niche: string | null;
          settings: Json | null;
          slug: string;
          sub_niche: string | null;
          website_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          niche?: string | null;
          settings?: Json | null;
          slug: string;
          sub_niche?: string | null;
          website_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          niche?: string | null;
          settings?: Json | null;
          slug?: string;
          sub_niche?: string | null;
          website_url?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          id: string;
          role: "owner" | "admin" | "member";
          user_id: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: "owner" | "admin" | "member";
          user_id?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: "owner" | "admin" | "member";
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          company_id: string | null;
          config: Json | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          last_tested_at: string | null;
          test_status: "ok" | "error" | null;
          type: "sofia_crm" | "evolution_api" | "upload_post" | "openrouter";
        };
        Insert: {
          company_id?: string | null;
          config?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_tested_at?: string | null;
          test_status?: "ok" | "error" | null;
          type: "sofia_crm" | "evolution_api" | "upload_post" | "openrouter";
        };
        Update: {
          company_id?: string | null;
          config?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_tested_at?: string | null;
          test_status?: "ok" | "error" | null;
          type?: "sofia_crm" | "evolution_api" | "upload_post" | "openrouter";
        };
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          template_name: string;
          language: string;
          body_params_template: Json;
          header_params_template: Json;
          inbox_id: string;
          status: string;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          stats: Json;
          filters: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          qstash_message_id: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          template_name: string;
          language?: string;
          body_params_template?: Json;
          header_params_template?: Json;
          inbox_id: string;
          status?: string;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          stats?: Json;
          filters?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          qstash_message_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          template_name?: string;
          language?: string;
          body_params_template?: Json;
          header_params_template?: Json;
          inbox_id?: string;
          status?: string;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          stats?: Json;
          filters?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          qstash_message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_recipients: {
        Row: {
          id: string;
          campaign_id: string;
          contact_id: string;
          contact_name: string | null;
          contact_phone: string;
          status: string;
          sent_at: string | null;
          error_message: string | null;
          variables: Json;
          created_at: string;
          provider_message_id: string | null;
          delivery_status: string | null;
          delivery_updated_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          contact_id: string;
          contact_name?: string | null;
          contact_phone: string;
          status?: string;
          sent_at?: string | null;
          error_message?: string | null;
          variables?: Json;
          created_at?: string;
          provider_message_id?: string | null;
          delivery_status?: string | null;
          delivery_updated_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          contact_id?: string;
          contact_name?: string | null;
          contact_phone?: string;
          status?: string;
          sent_at?: string | null;
          error_message?: string | null;
          variables?: Json;
          created_at?: string;
          provider_message_id?: string | null;
          delivery_status?: string | null;
          delivery_updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          assigned_to: string | null;
          company_id: string | null;
          contact_avatar_url: string | null;
          contact_email: string | null;
          contact_external_id: string | null;
          contact_labels: Json | null;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string | null;
          external_id: string | null;
          id: string;
          last_message_at: string | null;
          last_synced_at: string | null;
          remote_jid: string;
          status: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          company_id?: string | null;
          contact_avatar_url?: string | null;
          contact_email?: string | null;
          contact_external_id?: string | null;
          contact_labels?: Json | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          external_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          last_synced_at?: string | null;
          remote_jid: string;
          status?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          company_id?: string | null;
          contact_avatar_url?: string | null;
          contact_email?: string | null;
          contact_external_id?: string | null;
          contact_labels?: Json | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          external_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          last_synced_at?: string | null;
          remote_jid?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_exclusions: {
        Row: {
          company_id: string;
          contact_name: string | null;
          created_at: string | null;
          created_by: string | null;
          external_id: string;
          id: string;
          remote_jid: string | null;
        };
        Insert: {
          company_id: string;
          contact_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          external_id: string;
          id?: string;
          remote_jid?: string | null;
        };
        Update: {
          company_id?: string;
          contact_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          external_id?: string;
          id?: string;
          remote_jid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_exclusions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_exclusions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_notes: {
        Row: {
          company_id: string;
          content: string;
          conversation_id: string;
          created_at: string | null;
          id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          company_id: string;
          content: string;
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          company_id?: string;
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_notes_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_notes_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          company_id: string | null;
          content: string | null;
          conversation_id: string | null;
          direction: "inbound" | "outbound" | null;
          id: string;
          message_type: string | null;
          sent_at: string | null;
        };
        Insert: {
          company_id?: string | null;
          content?: string | null;
          conversation_id?: string | null;
          direction?: "inbound" | "outbound" | null;
          id?: string;
          message_type?: string | null;
          sent_at?: string | null;
        };
        Update: {
          company_id?: string | null;
          content?: string | null;
          conversation_id?: string | null;
          direction?: "inbound" | "outbound" | null;
          id?: string;
          message_type?: string | null;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_insights: {
        Row: {
          action_items: Json | null;
          company_id: string | null;
          confidence_score: number | null;
          conversation_id: string | null;
          explicit_need: string | null;
          feedback_at: string | null;
          feedback_by: string | null;
          feedback_note: string | null;
          feedback_status: "helpful" | "needs_review" | "incorrect" | null;
          generated_at: string | null;
          id: string;
          implicit_need: string | null;
          intent: string | null;
          next_commitment: string | null;
          objections: Json | null;
          sales_stage:
            | "discovery"
            | "qualification"
            | "proposal"
            | "negotiation"
            | "closing"
            | "post_sale"
            | "unknown"
            | null;
          sentiment: "positivo" | "neutro" | "negativo" | null;
          stall_reason: string | null;
          summary: string | null;
        };
        Insert: {
          action_items?: Json | null;
          company_id?: string | null;
          confidence_score?: number | null;
          conversation_id?: string | null;
          explicit_need?: string | null;
          feedback_at?: string | null;
          feedback_by?: string | null;
          feedback_note?: string | null;
          feedback_status?: "helpful" | "needs_review" | "incorrect" | null;
          generated_at?: string | null;
          id?: string;
          implicit_need?: string | null;
          intent?: string | null;
          next_commitment?: string | null;
          objections?: Json | null;
          sales_stage?:
            | "discovery"
            | "qualification"
            | "proposal"
            | "negotiation"
            | "closing"
            | "post_sale"
            | "unknown"
            | null;
          sentiment?: "positivo" | "neutro" | "negativo" | null;
          stall_reason?: string | null;
          summary?: string | null;
        };
        Update: {
          action_items?: Json | null;
          company_id?: string | null;
          confidence_score?: number | null;
          conversation_id?: string | null;
          explicit_need?: string | null;
          feedback_at?: string | null;
          feedback_by?: string | null;
          feedback_note?: string | null;
          feedback_status?: "helpful" | "needs_review" | "incorrect" | null;
          generated_at?: string | null;
          id?: string;
          implicit_need?: string | null;
          intent?: string | null;
          next_commitment?: string | null;
          objections?: Json | null;
          sales_stage?:
            | "discovery"
            | "qualification"
            | "proposal"
            | "negotiation"
            | "closing"
            | "post_sale"
            | "unknown"
            | null;
          sentiment?: "positivo" | "neutro" | "negativo" | null;
          stall_reason?: string | null;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_insights_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_insights_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_insights_feedback_by_fkey";
            columns: ["feedback_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_digests: {
        Row: {
          company_id: string | null;
          conversations_analyzed: number;
          created_at: string | null;
          id: string;
          negative_sentiments: number;
          period_end: string;
          period_start: string;
          purchase_intents: number;
          summary_text: string;
        };
        Insert: {
          company_id?: string | null;
          conversations_analyzed?: number;
          created_at?: string | null;
          id?: string;
          negative_sentiments?: number;
          period_end: string;
          period_start: string;
          purchase_intents?: number;
          summary_text: string;
        };
        Update: {
          company_id?: string | null;
          conversations_analyzed?: number;
          created_at?: string | null;
          id?: string;
          negative_sentiments?: number;
          period_end?: string;
          period_start?: string;
          purchase_intents?: number;
          summary_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_digests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      competitor_profiles: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          id: string;
          instagram_url: string | null;
          linkedin_url: string | null;
          name: string;
          website_url: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          name: string;
          website_url?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          id?: string;
          instagram_url?: string | null;
          linkedin_url?: string | null;
          name?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "competitor_profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      collected_posts: {
        Row: {
          collected_at: string | null;
          comments_count: number | null;
          company_id: string | null;
          competitor_id: string | null;
          content: string | null;
          engagement_score: number | null;
          id: string;
          likes_count: number | null;
          platform: "instagram" | "linkedin" | "tiktok" | null;
          post_url: string | null;
          posted_at: string | null;
          shares_count: number | null;
          source_type: "competitor" | "radar";
        };
        Insert: {
          collected_at?: string | null;
          comments_count?: number | null;
          company_id?: string | null;
          competitor_id?: string | null;
          content?: string | null;
          engagement_score?: number | null;
          id?: string;
          likes_count?: number | null;
          platform?: "instagram" | "linkedin" | "tiktok" | null;
          post_url?: string | null;
          posted_at?: string | null;
          shares_count?: number | null;
          source_type: "competitor" | "radar";
        };
        Update: {
          collected_at?: string | null;
          comments_count?: number | null;
          company_id?: string | null;
          competitor_id?: string | null;
          content?: string | null;
          engagement_score?: number | null;
          id?: string;
          likes_count?: number | null;
          platform?: "instagram" | "linkedin" | "tiktok" | null;
          post_url?: string | null;
          posted_at?: string | null;
          shares_count?: number | null;
          source_type?: "competitor" | "radar";
        };
        Relationships: [
          {
            foreignKeyName: "collected_posts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collected_posts_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitor_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      intelligence_insights: {
        Row: {
          analysis_type: string | null;
          company_id: string | null;
          competitor_id: string | null;
          content: string | null;
          generated_at: string | null;
          id: string;
          recommendations: Json | null;
          source_type: "competitor" | "radar";
          top_themes: Json | null;
        };
        Insert: {
          analysis_type?: string | null;
          company_id?: string | null;
          competitor_id?: string | null;
          content?: string | null;
          generated_at?: string | null;
          id?: string;
          recommendations?: Json | null;
          source_type: "competitor" | "radar";
          top_themes?: Json | null;
        };
        Update: {
          analysis_type?: string | null;
          company_id?: string | null;
          competitor_id?: string | null;
          content?: string | null;
          generated_at?: string | null;
          id?: string;
          recommendations?: Json | null;
          source_type?: "competitor" | "radar";
          top_themes?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "intelligence_insights_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "intelligence_insights_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitor_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      async_jobs: {
        Row: {
          attempts: number | null;
          company_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          error_message: string | null;
          id: string;
          job_type:
            | "sofia_crm_sync"
            | "competitor_scrape"
            | "radar_collect"
            | "weekly_report"
            | "whatsapp_analyze"
            | "rag_process"
            | "daily_report"
            | "group_agent_respond"
            | "group_rag_batch"
            | "group_proactive";
          max_attempts: number | null;
          payload: Json | null;
          result: Json | null;
          scheduled_for: string | null;
          started_at: string | null;
          status: "pending" | "running" | "done" | "failed" | null;
        };
        Insert: {
          attempts?: number | null;
          company_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          job_type:
            | "sofia_crm_sync"
            | "competitor_scrape"
            | "radar_collect"
            | "weekly_report"
            | "whatsapp_analyze"
            | "rag_process"
            | "daily_report"
            | "group_agent_respond"
            | "group_rag_batch"
            | "group_proactive";
          max_attempts?: number | null;
          payload?: Json | null;
          result?: Json | null;
          scheduled_for?: string | null;
          started_at?: string | null;
          status?: "pending" | "running" | "done" | "failed" | null;
        };
        Update: {
          attempts?: number | null;
          company_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          job_type?:
            | "sofia_crm_sync"
            | "competitor_scrape"
            | "radar_collect"
            | "weekly_report"
            | "whatsapp_analyze"
            | "rag_process"
            | "daily_report"
            | "group_agent_respond"
            | "group_rag_batch"
            | "group_proactive";
          max_attempts?: number | null;
          payload?: Json | null;
          result?: Json | null;
          scheduled_for?: string | null;
          started_at?: string | null;
          status?: "pending" | "running" | "done" | "failed" | null;
        };
        Relationships: [
          {
            foreignKeyName: "async_jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      media_files: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          id: string;
          public_url: string;
          storage_path: string;
          cloudinary_public_id: string | null;
          cloudinary_format: string | null;
          width: number | null;
          height: number | null;
          duration: number | null;
          resource_type: string | null;
          thumbnail_url: string | null;
          tags: string[] | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          id?: string;
          public_url: string;
          storage_path: string;
          cloudinary_public_id?: string | null;
          cloudinary_format?: string | null;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          resource_type?: string | null;
          thumbnail_url?: string | null;
          tags?: string[] | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          id?: string;
          public_url?: string;
          storage_path?: string;
          cloudinary_public_id?: string | null;
          cloudinary_format?: string | null;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          resource_type?: string | null;
          thumbnail_url?: string | null;
          tags?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_files_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      hashtag_groups: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          hashtags: string[];
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          hashtags: string[];
        };
        Update: {
          name?: string;
          hashtags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "hashtag_groups_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      content_demands: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string | null;
          assigned_to: string | null;
          platforms: Json;
          due_date: string | null;
          status: "rascunho" | "em_revisao" | "alteracoes_solicitadas" | "aprovado" | "agendado" | "publicado";
          media_file_ids: string[];
          caption: string | null;
          scheduled_post_id: string | null;
          approval_token: string | null;
          approval_token_expires_at: string | null;
          created_by: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          platforms?: Json;
          due_date?: string | null;
          status?: "rascunho" | "em_revisao" | "alteracoes_solicitadas" | "aprovado" | "agendado" | "publicado";
          media_file_ids?: string[];
          caption?: string | null;
          scheduled_post_id?: string | null;
          approval_token?: string | null;
          approval_token_expires_at?: string | null;
          created_by: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          assigned_to?: string | null;
          platforms?: Json;
          due_date?: string | null;
          status?: "rascunho" | "em_revisao" | "alteracoes_solicitadas" | "aprovado" | "agendado" | "publicado";
          media_file_ids?: string[];
          caption?: string | null;
          scheduled_post_id?: string | null;
          approval_token?: string | null;
          approval_token_expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_demands_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_demands_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_demands_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_demands_scheduled_post_id_fkey";
            columns: ["scheduled_post_id"];
            isOneToOne: false;
            referencedRelation: "scheduled_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      demand_comments: {
        Row: {
          id: string;
          demand_id: string;
          user_id: string | null;
          author_name: string | null;
          content: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          demand_id: string;
          user_id?: string | null;
          author_name?: string | null;
          content: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "demand_comments_demand_id_fkey";
            columns: ["demand_id"];
            isOneToOne: false;
            referencedRelation: "content_demands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "demand_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      demand_history: {
        Row: {
          id: string;
          demand_id: string;
          user_id: string | null;
          from_status: string;
          to_status: string;
          comment: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          demand_id: string;
          user_id?: string | null;
          from_status: string;
          to_status: string;
          comment?: string | null;
        };
        Update: {
          comment?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "demand_history_demand_id_fkey";
            columns: ["demand_id"];
            isOneToOne: false;
            referencedRelation: "content_demands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "demand_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_posts: {
        Row: {
          caption: string | null;
          company_id: string | null;
          created_at: string | null;
          error_details: Json | null;
          external_post_ids: Json | null;
          id: string;
          media_file_ids: string[];
          platforms: Json;
          post_type: "photo" | "video" | "carousel";
          progress: Json | null;
          published_at: string | null;
          qstash_message_id: string | null;
          scheduled_at: string;
          status: "scheduled" | "processing" | "published" | "partial" | "failed" | "cancelled";
        };
        Insert: {
          caption?: string | null;
          company_id?: string | null;
          created_at?: string | null;
          error_details?: Json | null;
          external_post_ids?: Json | null;
          id?: string;
          media_file_ids: string[];
          platforms?: Json;
          post_type: "photo" | "video" | "carousel";
          progress?: Json | null;
          published_at?: string | null;
          qstash_message_id?: string | null;
          scheduled_at: string;
          status?: "scheduled" | "processing" | "published" | "partial" | "failed" | "cancelled";
        };
        Update: {
          caption?: string | null;
          company_id?: string | null;
          created_at?: string | null;
          error_details?: Json | null;
          external_post_ids?: Json | null;
          id?: string;
          media_file_ids?: string[];
          platforms?: Json;
          post_type?: "photo" | "video" | "carousel";
          progress?: Json | null;
          published_at?: string | null;
          qstash_message_id?: string | null;
          scheduled_at?: string;
          status?: "scheduled" | "processing" | "published" | "partial" | "failed" | "cancelled";
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_reports: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          delivery_response: Json | null;
          delivery_status: "sent" | "failed";
          id: string;
          job_id: string | null;
          pdf_public_url: string | null;
          pdf_storage_path: string | null;
          report_text: string;
          sent_at: string | null;
          sent_to: string | null;
          week_end: string;
          week_start: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          delivery_response?: Json | null;
          delivery_status?: "sent" | "failed";
          id?: string;
          job_id?: string | null;
          pdf_public_url?: string | null;
          pdf_storage_path?: string | null;
          report_text: string;
          sent_at?: string | null;
          sent_to?: string | null;
          week_end: string;
          week_start: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          delivery_response?: Json | null;
          delivery_status?: "sent" | "failed";
          id?: string;
          job_id?: string | null;
          pdf_public_url?: string | null;
          pdf_storage_path?: string | null;
          report_text?: string;
          sent_at?: string | null;
          sent_to?: string | null;
          week_end?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_reports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_reports_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "async_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_reports: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          delivery_response: Json | null;
          delivery_status: "sent" | "failed";
          id: string;
          job_id: string | null;
          report_date: string;
          report_text: string;
          sent_at: string | null;
          sent_to: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string | null;
          delivery_response?: Json | null;
          delivery_status?: "sent" | "failed";
          id?: string;
          job_id?: string | null;
          report_date: string;
          report_text: string;
          sent_at?: string | null;
          sent_to?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string | null;
          delivery_response?: Json | null;
          delivery_status?: "sent" | "failed";
          id?: string;
          job_id?: string | null;
          report_date?: string;
          report_text?: string;
          sent_at?: string | null;
          sent_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_reports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_reports_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "async_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_preferences: {
        Row: {
          id: string;
          company_id: string;
          alert_type: "purchase_intent" | "negative_sentiment" | "failed_post" | "viral_content";
          is_enabled: boolean;
          recipient_phone: string | null;
          cooldown_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          alert_type: "purchase_intent" | "negative_sentiment" | "failed_post" | "viral_content";
          is_enabled?: boolean;
          recipient_phone?: string | null;
          cooldown_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          alert_type?: "purchase_intent" | "negative_sentiment" | "failed_post" | "viral_content";
          is_enabled?: boolean;
          recipient_phone?: string | null;
          cooldown_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_preferences_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_log: {
        Row: {
          id: string;
          company_id: string;
          alert_type: "purchase_intent" | "negative_sentiment" | "failed_post" | "viral_content";
          source_id: string | null;
          recipient_phone: string;
          message_preview: string | null;
          status: "sent" | "failed" | "skipped";
          error_detail: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          alert_type: "purchase_intent" | "negative_sentiment" | "failed_post" | "viral_content";
          source_id?: string | null;
          recipient_phone: string;
          message_preview?: string | null;
          status?: "sent" | "failed" | "skipped";
          error_detail?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          alert_type?: "purchase_intent" | "negative_sentiment" | "failed_post" | "viral_content";
          source_id?: string | null;
          recipient_phone?: string;
          message_preview?: string | null;
          status?: "sent" | "failed" | "skipped";
          error_detail?: string | null;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_log_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      rag_documents: {
        Row: {
          id: string;
          company_id: string | null;
          scope: "company" | "global";
          file_name: string;
          file_size: number;
          file_type: string;
          storage_path: string;
          source_key: string | null;
          status: "pending" | "processing" | "ready" | "failed";
          total_chunks: number | null;
          error_message: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          scope?: "company" | "global";
          file_name: string;
          file_size: number;
          file_type?: string;
          storage_path: string;
          source_key?: string | null;
          status?: "pending" | "processing" | "ready" | "failed";
          total_chunks?: number | null;
          error_message?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          scope?: "company" | "global";
          file_name?: string;
          file_size?: number;
          file_type?: string;
          storage_path?: string;
          source_key?: string | null;
          status?: "pending" | "processing" | "ready" | "failed";
          total_chunks?: number | null;
          error_message?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rag_documents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      rag_document_chunks: {
        Row: {
          id: string;
          document_id: string;
          company_id: string | null;
          scope: "company" | "global";
          chunk_index: number;
          content: string;
          token_count: number | null;
          embedding: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          company_id?: string | null;
          scope?: "company" | "global";
          chunk_index: number;
          content: string;
          token_count?: number | null;
          embedding?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          document_id?: string;
          company_id?: string | null;
          scope?: "company" | "global";
          chunk_index?: number;
          content?: string;
          token_count?: number | null;
          embedding?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rag_document_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "rag_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rag_document_chunks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      group_agent_configs: {
        Row: {
          id: string;
          company_id: string;
          group_jid: string;
          group_name: string | null;
          is_active: boolean;
          trigger_keywords: string[];
          agent_name: string;
          agent_tone: "profissional" | "casual" | "tecnico";
          feed_to_rag: boolean;
          rag_min_message_length: number;
          rag_batch_interval_minutes: number;
          max_responses_per_hour: number;
          cooldown_seconds: number;
          evolution_instance_name: string | null;
          is_hidden: boolean;
          proactive_summary: boolean;
          proactive_summary_hour: number;
          proactive_sales_alert: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          group_jid: string;
          group_name?: string | null;
          is_active?: boolean;
          trigger_keywords?: string[];
          agent_name?: string;
          agent_tone?: "profissional" | "casual" | "tecnico";
          feed_to_rag?: boolean;
          rag_min_message_length?: number;
          rag_batch_interval_minutes?: number;
          max_responses_per_hour?: number;
          cooldown_seconds?: number;
          evolution_instance_name?: string | null;
          is_hidden?: boolean;
          proactive_summary?: boolean;
          proactive_summary_hour?: number;
          proactive_sales_alert?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          group_jid?: string;
          group_name?: string | null;
          is_active?: boolean;
          trigger_keywords?: string[];
          agent_name?: string;
          agent_tone?: "profissional" | "casual" | "tecnico";
          feed_to_rag?: boolean;
          rag_min_message_length?: number;
          rag_batch_interval_minutes?: number;
          max_responses_per_hour?: number;
          cooldown_seconds?: number;
          evolution_instance_name?: string | null;
          is_hidden?: boolean;
          proactive_summary?: boolean;
          proactive_summary_hour?: number;
          proactive_sales_alert?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_agent_configs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      group_agent_sessions: {
        Row: {
          id: string;
          company_id: string;
          config_id: string;
          group_jid: string;
          sender_jid: string;
          messages: Json;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          config_id: string;
          group_jid: string;
          sender_jid: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          config_id?: string;
          group_jid?: string;
          sender_jid?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_agent_sessions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_agent_sessions_config_id_fkey";
            columns: ["config_id"];
            isOneToOne: false;
            referencedRelation: "group_agent_configs";
            referencedColumns: ["id"];
          },
        ];
      };
      group_messages: {
        Row: {
          id: string;
          company_id: string;
          config_id: string;
          group_jid: string;
          sender_jid: string;
          sender_name: string | null;
          message_id: string;
          content: string | null;
          message_type: string | null;
          is_trigger: boolean;
          agent_responded: boolean;
          rag_processed: boolean;
          sent_at: string;
          received_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          config_id: string;
          group_jid: string;
          sender_jid: string;
          sender_name?: string | null;
          message_id: string;
          content?: string | null;
          message_type?: string | null;
          is_trigger?: boolean;
          agent_responded?: boolean;
          rag_processed?: boolean;
          sent_at: string;
          received_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          config_id?: string;
          group_jid?: string;
          sender_jid?: string;
          sender_name?: string | null;
          message_id?: string;
          content?: string | null;
          message_type?: string | null;
          is_trigger?: boolean;
          agent_responded?: boolean;
          rag_processed?: boolean;
          sent_at?: string;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_messages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_messages_config_id_fkey";
            columns: ["config_id"];
            isOneToOne: false;
            referencedRelation: "group_agent_configs";
            referencedColumns: ["id"];
          },
        ];
      };
      group_agent_responses: {
        Row: {
          id: string;
          company_id: string;
          config_id: string;
          trigger_message_id: string | null;
          group_jid: string;
          response_text: string;
          response_type: "reply" | "summary" | "rag_query" | "sales_data" | "report" | "error" | "proactive_summary" | "proactive_alert";
          rag_sources_used: number | null;
          model_used: string | null;
          processing_time_ms: number | null;
          evolution_status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          config_id: string;
          trigger_message_id?: string | null;
          group_jid: string;
          response_text: string;
          response_type?: "reply" | "summary" | "rag_query" | "sales_data" | "report" | "error" | "proactive_summary" | "proactive_alert";
          rag_sources_used?: number | null;
          model_used?: string | null;
          processing_time_ms?: number | null;
          evolution_status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          config_id?: string;
          trigger_message_id?: string | null;
          group_jid?: string;
          response_text?: string;
          response_type?: "reply" | "summary" | "rag_query" | "sales_data" | "report" | "error" | "proactive_summary" | "proactive_alert";
          rag_sources_used?: number | null;
          model_used?: string | null;
          processing_time_ms?: number | null;
          evolution_status?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_agent_responses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_agent_responses_config_id_fkey";
            columns: ["config_id"];
            isOneToOne: false;
            referencedRelation: "group_agent_configs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_agent_responses_trigger_message_id_fkey";
            columns: ["trigger_message_id"];
            isOneToOne: false;
            referencedRelation: "group_messages";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_rag_chunks: {
        Args: {
          query_embedding: string;
          match_company_id: string;
          include_global?: boolean;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: Array<{
          id: string;
          document_id: string;
          content: string;
          chunk_index: number;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
