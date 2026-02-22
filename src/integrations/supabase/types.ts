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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_merge_requests: {
        Row: {
          admin_note: string | null
          auto_provisioned: boolean | null
          created_at: string
          email: string
          id: string
          merge_type: string
          platform_data: Json | null
          provision_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_platform: string
          source_user_id: string | null
          source_username: string | null
          status: string
          target_platform: string
          target_user_id: string | null
          updated_at: string
          webhook_sent: boolean | null
          webhook_sent_at: string | null
        }
        Insert: {
          admin_note?: string | null
          auto_provisioned?: boolean | null
          created_at?: string
          email: string
          id?: string
          merge_type: string
          platform_data?: Json | null
          provision_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_platform: string
          source_user_id?: string | null
          source_username?: string | null
          status?: string
          target_platform?: string
          target_user_id?: string | null
          updated_at?: string
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Update: {
          admin_note?: string | null
          auto_provisioned?: boolean | null
          created_at?: string
          email?: string
          id?: string
          merge_type?: string
          platform_data?: Json | null
          provision_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_platform?: string
          source_user_id?: string | null
          source_username?: string | null
          status?: string
          target_platform?: string
          target_user_id?: string | null
          updated_at?: string
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      blacklisted_ips: {
        Row: {
          alert_on_login: boolean
          associated_usernames: string[] | null
          flagged_at: string
          flagged_by: string | null
          id: string
          ip_address: string
          is_active: boolean
          notes: string | null
          reason: string
        }
        Insert: {
          alert_on_login?: boolean
          associated_usernames?: string[] | null
          flagged_at?: string
          flagged_by?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          notes?: string | null
          reason: string
        }
        Update: {
          alert_on_login?: boolean
          associated_usernames?: string[] | null
          flagged_at?: string
          flagged_by?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          notes?: string | null
          reason?: string
        }
        Relationships: []
      }
      blacklisted_wallets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_permanent: boolean
          reason: string
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_permanent?: boolean
          reason?: string
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_permanent?: boolean
          reason?: string
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_session_id: string | null
          created_at: string | null
          id: string
          is_muted: boolean | null
          is_video_off: boolean | null
          joined_at: string | null
          left_at: string | null
          user_id: string
        }
        Insert: {
          call_session_id?: string | null
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id: string
        }
        Update: {
          call_session_id?: string | null
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_type: string
          channel_name: string
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiator_id: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          call_type: string
          channel_name: string
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          call_type?: string
          channel_name?: string
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiator_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          created_at: string | null
          id: string
          show_read_receipts: boolean | null
          show_typing_indicator: boolean | null
          updated_at: string | null
          user_id: string
          who_can_message: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          show_read_receipts?: boolean | null
          show_typing_indicator?: boolean | null
          updated_at?: string | null
          user_id: string
          who_can_message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          show_read_receipts?: boolean | null
          show_typing_indicator?: boolean | null
          updated_at?: string | null
          user_id?: string
          who_can_message?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          parent_comment_id: string | null
          post_id: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_comment_id?: string | null
          post_id: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          left_at: string | null
          muted_until: string | null
          nickname: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          left_at?: string | null
          muted_until?: string | null
          nickname?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          left_at?: string | null
          muted_until?: string | null
          nickname?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cross_platform_tokens: {
        Row: {
          access_token: string
          access_token_expires_at: string
          client_id: string
          created_at: string
          device_info: Json | null
          id: string
          is_revoked: boolean
          last_used_at: string | null
          refresh_token: string
          refresh_token_expires_at: string
          scope: string[]
          user_id: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          client_id: string
          created_at?: string
          device_info?: Json | null
          id?: string
          is_revoked?: boolean
          last_used_at?: string | null
          refresh_token: string
          refresh_token_expires_at: string
          scope?: string[]
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          client_id?: string
          created_at?: string
          device_info?: Json | null
          id?: string
          is_revoked?: boolean
          last_used_at?: string | null
          refresh_token?: string
          refresh_token_expires_at?: string
          scope?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_platform_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cross_platform_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_platform_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_gifts: {
        Row: {
          amount_numeric: number
          chain_id: number
          conversation_id: string | null
          created_at: string
          error: string | null
          from_user_id: string
          id: string
          message_id: string | null
          status: string
          to_address: string
          to_user_id: string
          token: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          amount_numeric?: number
          chain_id?: number
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          from_user_id: string
          id?: string
          message_id?: string | null
          status?: string
          to_address: string
          to_user_id: string
          token?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount_numeric?: number
          chain_id?: number
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          from_user_id?: string
          id?: string
          message_id?: string | null
          status?: string
          to_address?: string
          to_user_id?: string
          token?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_gifts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_gifts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      custodial_wallets: {
        Row: {
          chain_id: number
          created_at: string
          encrypted_private_key: string
          encryption_version: number
          id: string
          is_active: boolean
          last_activity_at: string | null
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          chain_id?: number
          created_at?: string
          encrypted_private_key: string
          encryption_version?: number
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          chain_id?: number
          created_at?: string
          encrypted_private_key?: string
          encryption_version?: number
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "custodial_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodial_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: string
          amount_usd: number | null
          block_number: number | null
          card_background: string | null
          card_sound: string | null
          card_theme: string | null
          card_viewed_at: string | null
          chain_id: number
          confirmed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          is_external: boolean | null
          light_action_id: string | null
          light_score_earned: number | null
          message: string | null
          message_id: string | null
          message_template: string | null
          metadata: Json | null
          post_id: string | null
          recipient_id: string | null
          sender_address: string | null
          sender_id: string | null
          status: string
          token_address: string | null
          token_symbol: string
          tx_hash: string
        }
        Insert: {
          amount: string
          amount_usd?: number | null
          block_number?: number | null
          card_background?: string | null
          card_sound?: string | null
          card_theme?: string | null
          card_viewed_at?: string | null
          chain_id?: number
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_external?: boolean | null
          light_action_id?: string | null
          light_score_earned?: number | null
          message?: string | null
          message_id?: string | null
          message_template?: string | null
          metadata?: Json | null
          post_id?: string | null
          recipient_id?: string | null
          sender_address?: string | null
          sender_id?: string | null
          status?: string
          token_address?: string | null
          token_symbol?: string
          tx_hash: string
        }
        Update: {
          amount?: string
          amount_usd?: number | null
          block_number?: number | null
          card_background?: string | null
          card_sound?: string | null
          card_theme?: string | null
          card_viewed_at?: string | null
          chain_id?: number
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_external?: boolean | null
          light_action_id?: string | null
          light_score_earned?: number | null
          message?: string | null
          message_id?: string | null
          message_template?: string | null
          metadata?: Json | null
          post_id?: string | null
          recipient_id?: string | null
          sender_address?: string | null
          sender_id?: string | null
          status?: string
          token_address?: string | null
          token_symbol?: string
          tx_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_light_action_id_fkey"
            columns: ["light_action_id"]
            isOneToOne: false
            referencedRelation: "light_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          action: string
          amount: number
          client_id: string
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          transaction_id: string
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fun_distribution_logs: {
        Row: {
          action_id: string
          actor_id: string
          created_at: string | null
          fund_processed_at: string | null
          fund_processing_status: string | null
          fund_tx_hashes: Json | null
          genesis_amount: number | null
          genesis_percentage: number | null
          id: string
          mint_request_id: string | null
          partners_amount: number | null
          partners_percentage: number | null
          platform_amount: number | null
          platform_percentage: number | null
          total_reward: number
          user_amount: number
          user_percentage: number
        }
        Insert: {
          action_id: string
          actor_id: string
          created_at?: string | null
          fund_processed_at?: string | null
          fund_processing_status?: string | null
          fund_tx_hashes?: Json | null
          genesis_amount?: number | null
          genesis_percentage?: number | null
          id?: string
          mint_request_id?: string | null
          partners_amount?: number | null
          partners_percentage?: number | null
          platform_amount?: number | null
          platform_percentage?: number | null
          total_reward?: number
          user_amount?: number
          user_percentage?: number
        }
        Update: {
          action_id?: string
          actor_id?: string
          created_at?: string | null
          fund_processed_at?: string | null
          fund_processing_status?: string | null
          fund_tx_hashes?: Json | null
          genesis_amount?: number | null
          genesis_percentage?: number | null
          id?: string
          mint_request_id?: string | null
          partners_amount?: number | null
          partners_percentage?: number | null
          platform_amount?: number | null
          platform_percentage?: number | null
          total_reward?: number
          user_amount?: number
          user_percentage?: number
        }
        Relationships: []
      }
      fun_pool_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          pool_label: string
          pool_name: string
          retention_rate: number | null
          tier_order: number | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pool_label: string
          pool_name: string
          retention_rate?: number | null
          tier_order?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pool_label?: string
          pool_name?: string
          retention_rate?: number | null
          tier_order?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      light_actions: {
        Row: {
          action_type: string
          actor_id: string | null
          angel_evaluation: Json | null
          base_reward: number
          content_preview: string | null
          created_at: string
          evaluated_at: string | null
          id: string
          impact_score: number
          integrity_score: number
          is_eligible: boolean
          light_score: number
          mint_amount: number | null
          mint_request_id: string | null
          mint_status: string
          minted_at: string | null
          quality_score: number
          reference_id: string | null
          reference_type: string | null
          tx_hash: string | null
          unity_multiplier: number
          unity_score: number
          user_id: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          angel_evaluation?: Json | null
          base_reward?: number
          content_preview?: string | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          impact_score?: number
          integrity_score?: number
          is_eligible?: boolean
          light_score?: number
          mint_amount?: number | null
          mint_request_id?: string | null
          mint_status?: string
          minted_at?: string | null
          quality_score?: number
          reference_id?: string | null
          reference_type?: string | null
          tx_hash?: string | null
          unity_multiplier?: number
          unity_score?: number
          user_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          angel_evaluation?: Json | null
          base_reward?: number
          content_preview?: string | null
          created_at?: string
          evaluated_at?: string | null
          id?: string
          impact_score?: number
          integrity_score?: number
          is_eligible?: boolean
          light_score?: number
          mint_amount?: number | null
          mint_request_id?: string | null
          mint_status?: string
          minted_at?: string | null
          quality_score?: number
          reference_id?: string | null
          reference_type?: string | null
          tx_hash?: string | null
          unity_multiplier?: number
          unity_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "light_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "light_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "light_actions_mint_request_id_fkey"
            columns: ["mint_request_id"]
            isOneToOne: false
            referencedRelation: "pplp_mint_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "light_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "light_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      light_reputation: {
        Row: {
          actions_count: number
          avg_impact: number
          avg_integrity: number
          avg_quality: number
          avg_unity: number
          created_at: string
          daily_mint_cap: number
          last_action_at: string | null
          last_mint_at: string | null
          pillar_healing: number
          pillar_service: number
          pillar_truth: number
          pillar_unity: number
          pillar_value: number
          tier: number
          today_date: string
          today_minted: number
          total_light_score: number
          total_minted: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actions_count?: number
          avg_impact?: number
          avg_integrity?: number
          avg_quality?: number
          avg_unity?: number
          created_at?: string
          daily_mint_cap?: number
          last_action_at?: string | null
          last_mint_at?: string | null
          pillar_healing?: number
          pillar_service?: number
          pillar_truth?: number
          pillar_unity?: number
          pillar_value?: number
          tier?: number
          today_date?: string
          today_minted?: number
          total_light_score?: number
          total_minted?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actions_count?: number
          avg_impact?: number
          avg_integrity?: number
          avg_quality?: number
          avg_unity?: number
          created_at?: string
          daily_mint_cap?: number
          last_action_at?: string | null
          last_mint_at?: string | null
          pillar_healing?: number
          pillar_service?: number
          pillar_truth?: number
          pillar_unity?: number
          pillar_value?: number
          tier?: number
          today_date?: string
          today_minted?: number
          total_light_score?: number
          total_minted?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "light_reputation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "light_reputation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_comments: {
        Row: {
          created_at: string
          id: string
          live_session_id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_session_id: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_session_id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_comments_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: number
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: number
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          file_list_json: Json
          id: string
          live_id: string
          media_url: string | null
          mode: string | null
          raw_response: Json | null
          recorder_uid: string | null
          resource_id: string | null
          sid: string | null
          status: string
          stopped_at: string | null
          storage_region: number | null
          storage_vendor: number | null
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          file_list_json?: Json
          id?: string
          live_id: string
          media_url?: string | null
          mode?: string | null
          raw_response?: Json | null
          recorder_uid?: string | null
          resource_id?: string | null
          sid?: string | null
          status?: string
          stopped_at?: string | null
          storage_region?: number | null
          storage_vendor?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          file_list_json?: Json
          id?: string
          live_id?: string
          media_url?: string | null
          mode?: string | null
          raw_response?: Json | null
          recorder_uid?: string | null
          resource_id?: string | null
          sid?: string | null
          status?: string
          stopped_at?: string | null
          storage_region?: number | null
          storage_vendor?: number | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_recordings_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          agora_channel: string | null
          agora_uid_host: number | null
          channel_name: string
          created_at: string
          ended_at: string | null
          host_user_id: string
          id: string
          last_worker_response: Json | null
          owner_id: string
          post_id: string | null
          privacy: string
          recording_acquired_at: string | null
          recording_error: string | null
          recording_files: Json | null
          recording_ready_at: string | null
          recording_resource_id: string | null
          recording_sid: string | null
          recording_started_at: string | null
          recording_status: string
          recording_stopped_at: string | null
          recording_uid: number | null
          resource_id: string | null
          sid: string | null
          started_at: string
          status: string
          title: string | null
          updated_at: string
          viewer_count: number
        }
        Insert: {
          agora_channel?: string | null
          agora_uid_host?: number | null
          channel_name: string
          created_at?: string
          ended_at?: string | null
          host_user_id: string
          id?: string
          last_worker_response?: Json | null
          owner_id: string
          post_id?: string | null
          privacy?: string
          recording_acquired_at?: string | null
          recording_error?: string | null
          recording_files?: Json | null
          recording_ready_at?: string | null
          recording_resource_id?: string | null
          recording_sid?: string | null
          recording_started_at?: string | null
          recording_status?: string
          recording_stopped_at?: string | null
          recording_uid?: number | null
          resource_id?: string | null
          sid?: string | null
          started_at?: string
          status?: string
          title?: string | null
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          agora_channel?: string | null
          agora_uid_host?: number | null
          channel_name?: string
          created_at?: string
          ended_at?: string | null
          host_user_id?: string
          id?: string
          last_worker_response?: Json | null
          owner_id?: string
          post_id?: string | null
          privacy?: string
          recording_acquired_at?: string | null
          recording_error?: string | null
          recording_files?: Json | null
          recording_ready_at?: string | null
          recording_resource_id?: string | null
          recording_sid?: string | null
          recording_started_at?: string | null
          recording_status?: string
          recording_stopped_at?: string | null
          recording_uid?: number | null
          resource_id?: string | null
          sid?: string | null
          started_at?: string
          status?: string
          title?: string | null
          updated_at?: string
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      livestreams: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          is_eligible: boolean | null
          started_at: string
          stream_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_eligible?: boolean | null
          started_at?: string
          stream_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_eligible?: boolean | null
          started_at?: string
          stream_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestreams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestreams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_ip_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_ip_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "login_ip_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          media_urls: Json | null
          message_type: string
          metadata: Json
          pinned_at: string | null
          pinned_by: string | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_urls?: Json | null
          message_type?: string
          metadata?: Json
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_urls?: Json | null
          message_type?: string
          metadata?: Json
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mint_epochs: {
        Row: {
          created_at: string
          epoch_date: string
          id: string
          platform_pool: Json
          total_actions: number
          total_cap: number
          total_minted: number
          unique_users: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          epoch_date: string
          id?: string
          platform_pool?: Json
          total_actions?: number
          total_cap?: number
          total_minted?: number
          unique_users?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          epoch_date?: string
          id?: string
          platform_pool?: Json
          total_actions?: number
          total_cap?: number
          total_minted?: number
          unique_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          allowed_scopes: string[]
          client_id: string
          client_name: string
          client_secret: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          platform_name: string | null
          redirect_uris: string[]
          updated_at: string
          webhook_url: string | null
          website_url: string | null
        }
        Insert: {
          allowed_scopes?: string[]
          client_id: string
          client_name: string
          client_secret: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          platform_name?: string | null
          redirect_uris?: string[]
          updated_at?: string
          webhook_url?: string | null
          website_url?: string | null
        }
        Update: {
          allowed_scopes?: string[]
          client_id?: string
          client_name?: string
          client_secret?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          platform_name?: string | null
          redirect_uris?: string[]
          updated_at?: string
          webhook_url?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      oauth_codes: {
        Row: {
          client_id: string
          code: string
          code_challenge: string | null
          code_challenge_method: string | null
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          redirect_uri: string
          scope: string[]
          user_id: string
        }
        Insert: {
          client_id: string
          code: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          redirect_uri: string
          scope?: string[]
          user_id: string
        }
        Update: {
          client_id?: string
          code?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          redirect_uri?: string
          scope?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          identifier: string
          is_used: boolean
          max_attempts: number
          type: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          identifier: string
          is_used?: boolean
          max_attempts?: number
          type?: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          is_used?: boolean
          max_attempts?: number
          type?: string
        }
        Relationships: []
      }
      pending_provisions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          email: string
          fun_profile_id: string | null
          id: string
          merge_request_id: string | null
          password_token_hash: string
          platform_data: Json | null
          platform_id: string
          platform_user_id: string | null
          status: string | null
          token_expires_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          email: string
          fun_profile_id?: string | null
          id?: string
          merge_request_id?: string | null
          password_token_hash: string
          platform_data?: Json | null
          platform_id: string
          platform_user_id?: string | null
          status?: string | null
          token_expires_at: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          email?: string
          fun_profile_id?: string | null
          id?: string
          merge_request_id?: string | null
          password_token_hash?: string
          platform_data?: Json | null
          platform_id?: string
          platform_user_id?: string | null
          status?: string | null
          token_expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_provisions_merge_request_id_fkey"
            columns: ["merge_request_id"]
            isOneToOne: false
            referencedRelation: "account_merge_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_financial_data: {
        Row: {
          client_id: string
          client_timestamp: string | null
          created_at: string
          id: string
          last_sync_at: string
          sync_count: number
          total_bet: number
          total_deposit: number
          total_loss: number
          total_profit: number
          total_win: number
          total_withdraw: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          client_timestamp?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string
          sync_count?: number
          total_bet?: number
          total_deposit?: number
          total_loss?: number
          total_profit?: number
          total_win?: number
          total_withdraw?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_timestamp?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string
          sync_count?: number
          total_bet?: number
          total_deposit?: number
          total_loss?: number
          total_profit?: number
          total_win?: number
          total_withdraw?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_user_data: {
        Row: {
          client_id: string
          client_timestamp: string | null
          created_at: string
          data: Json
          id: string
          last_sync_mode: string | null
          sync_count: number
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          client_timestamp?: string | null
          created_at?: string
          data?: Json
          id?: string
          last_sync_mode?: string | null
          sync_count?: number
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_timestamp?: string | null
          created_at?: string
          data?: Json
          id?: string
          last_sync_mode?: string | null
          sync_count?: number
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tagged_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tagged_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          content_hash: string | null
          created_at: string
          gift_amount: string | null
          gift_message: string | null
          gift_recipient_id: string | null
          gift_sender_id: string | null
          gift_token: string | null
          highlight_expires_at: string | null
          id: string
          image_url: string | null
          is_highlighted: boolean
          is_reward_eligible: boolean | null
          location: string | null
          media_urls: Json | null
          metadata: Json
          moderation_status: string
          post_type: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          visibility: string
        }
        Insert: {
          content: string
          content_hash?: string | null
          created_at?: string
          gift_amount?: string | null
          gift_message?: string | null
          gift_recipient_id?: string | null
          gift_sender_id?: string | null
          gift_token?: string | null
          highlight_expires_at?: string | null
          id?: string
          image_url?: string | null
          is_highlighted?: boolean
          is_reward_eligible?: boolean | null
          location?: string | null
          media_urls?: Json | null
          metadata?: Json
          moderation_status?: string
          post_type?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          visibility?: string
        }
        Update: {
          content?: string
          content_hash?: string | null
          created_at?: string
          gift_amount?: string | null
          gift_message?: string | null
          gift_recipient_id?: string | null
          gift_sender_id?: string | null
          gift_token?: string | null
          highlight_expires_at?: string | null
          id?: string
          image_url?: string | null
          is_highlighted?: boolean
          is_reward_eligible?: boolean | null
          location?: string | null
          media_urls?: Json | null
          metadata?: Json
          moderation_status?: string
          post_type?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pplp_action_caps: {
        Row: {
          action_type: string
          base_reward: number | null
          cooldown_seconds: number | null
          created_at: string | null
          diminishing_factor: number | null
          diminishing_threshold: number | null
          id: string
          is_active: boolean | null
          max_global_daily: number | null
          max_per_user_daily: number | null
          max_per_user_weekly: number | null
          min_quality_score: number | null
          multiplier_ranges: Json | null
          platform_id: string | null
          thresholds: Json | null
        }
        Insert: {
          action_type: string
          base_reward?: number | null
          cooldown_seconds?: number | null
          created_at?: string | null
          diminishing_factor?: number | null
          diminishing_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_global_daily?: number | null
          max_per_user_daily?: number | null
          max_per_user_weekly?: number | null
          min_quality_score?: number | null
          multiplier_ranges?: Json | null
          platform_id?: string | null
          thresholds?: Json | null
        }
        Update: {
          action_type?: string
          base_reward?: number | null
          cooldown_seconds?: number | null
          created_at?: string | null
          diminishing_factor?: number | null
          diminishing_threshold?: number | null
          id?: string
          is_active?: boolean | null
          max_global_daily?: number | null
          max_per_user_daily?: number | null
          max_per_user_weekly?: number | null
          min_quality_score?: number | null
          multiplier_ranges?: Json | null
          platform_id?: string | null
          thresholds?: Json | null
        }
        Relationships: []
      }
      pplp_actions: {
        Row: {
          action_type: string
          action_type_enum: string | null
          actor_id: string
          canonical_hash: string | null
          created_at: string | null
          evidence_hash: string | null
          id: string
          impact: Json | null
          integrity: Json | null
          metadata: Json | null
          mint_request_hash: string | null
          minted_at: string | null
          platform_id: string
          policy_snapshot: Json | null
          policy_version: string | null
          scored_at: string | null
          status: string | null
          target_id: string | null
        }
        Insert: {
          action_type: string
          action_type_enum?: string | null
          actor_id: string
          canonical_hash?: string | null
          created_at?: string | null
          evidence_hash?: string | null
          id?: string
          impact?: Json | null
          integrity?: Json | null
          metadata?: Json | null
          mint_request_hash?: string | null
          minted_at?: string | null
          platform_id?: string
          policy_snapshot?: Json | null
          policy_version?: string | null
          scored_at?: string | null
          status?: string | null
          target_id?: string | null
        }
        Update: {
          action_type?: string
          action_type_enum?: string | null
          actor_id?: string
          canonical_hash?: string | null
          created_at?: string | null
          evidence_hash?: string | null
          id?: string
          impact?: Json | null
          integrity?: Json | null
          metadata?: Json | null
          mint_request_hash?: string | null
          minted_at?: string | null
          platform_id?: string
          policy_snapshot?: Json | null
          policy_version?: string | null
          scored_at?: string | null
          status?: string | null
          target_id?: string | null
        }
        Relationships: []
      }
      pplp_audits: {
        Row: {
          action_id: string | null
          actor_id: string
          audit_type: string | null
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          action_id?: string | null
          actor_id: string
          audit_type?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          action_id?: string | null
          actor_id?: string
          audit_type?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pplp_audits_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "pplp_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      pplp_device_registry: {
        Row: {
          device_hash: string
          fingerprint_version: number
          flag_reason: string | null
          id: string
          is_flagged: boolean | null
          last_seen: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          device_hash: string
          fingerprint_version?: number
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          last_seen?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          device_hash?: string
          fingerprint_version?: number
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          last_seen?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      pplp_epoch_caps: {
        Row: {
          action_counts: Json | null
          created_at: string | null
          epoch_date: string
          epoch_type: string | null
          id: string
          total_minted: number | null
          unique_users: number | null
          updated_at: string | null
        }
        Insert: {
          action_counts?: Json | null
          created_at?: string | null
          epoch_date: string
          epoch_type?: string | null
          id?: string
          total_minted?: number | null
          unique_users?: number | null
          updated_at?: string | null
        }
        Update: {
          action_counts?: Json | null
          created_at?: string | null
          epoch_date?: string
          epoch_type?: string | null
          id?: string
          total_minted?: number | null
          unique_users?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pplp_evidences: {
        Row: {
          action_id: string | null
          content_hash: string | null
          created_at: string | null
          evidence_type: string
          evidence_type_enum: string | null
          id: string
          metadata: Json | null
          uri: string | null
        }
        Insert: {
          action_id?: string | null
          content_hash?: string | null
          created_at?: string | null
          evidence_type: string
          evidence_type_enum?: string | null
          id?: string
          metadata?: Json | null
          uri?: string | null
        }
        Update: {
          action_id?: string | null
          content_hash?: string | null
          created_at?: string | null
          evidence_type?: string
          evidence_type_enum?: string | null
          id?: string
          metadata?: Json | null
          uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pplp_evidences_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "pplp_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      pplp_fraud_signals: {
        Row: {
          actor_id: string
          created_at: string | null
          details: Json | null
          id: string
          is_resolved: boolean | null
          resolution: string | null
          severity: number | null
          signal_type: string
          source: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          resolution?: string | null
          severity?: number | null
          signal_type: string
          source?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_resolved?: boolean | null
          resolution?: string | null
          severity?: number | null
          signal_type?: string
          source?: string | null
        }
        Relationships: []
      }
      pplp_mint_requests: {
        Row: {
          action_hash: string | null
          action_ids: string[]
          action_name: string
          action_types: string[]
          amount_display: number
          amount_wei: string
          block_number: number | null
          confirmed_at: string | null
          created_at: string
          deadline: number | null
          error_message: string | null
          evidence_hash: string
          id: string
          multisig_completed_groups: string[] | null
          multisig_required_groups: string[] | null
          multisig_signatures: Json | null
          nonce: number
          recipient_address: string
          retry_count: number
          signature: string | null
          signed_at: string | null
          signed_by: string | null
          status: string
          submitted_at: string | null
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_hash?: string | null
          action_ids?: string[]
          action_name?: string
          action_types?: string[]
          amount_display: number
          amount_wei: string
          block_number?: number | null
          confirmed_at?: string | null
          created_at?: string
          deadline?: number | null
          error_message?: string | null
          evidence_hash: string
          id?: string
          multisig_completed_groups?: string[] | null
          multisig_required_groups?: string[] | null
          multisig_signatures?: Json | null
          nonce: number
          recipient_address: string
          retry_count?: number
          signature?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          submitted_at?: string | null
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_hash?: string | null
          action_ids?: string[]
          action_name?: string
          action_types?: string[]
          amount_display?: number
          amount_wei?: string
          block_number?: number | null
          confirmed_at?: string | null
          created_at?: string
          deadline?: number | null
          error_message?: string | null
          evidence_hash?: string
          id?: string
          multisig_completed_groups?: string[] | null
          multisig_required_groups?: string[] | null
          multisig_signatures?: Json | null
          nonce?: number
          recipient_address?: string
          retry_count?: number
          signature?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          submitted_at?: string | null
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pplp_policies: {
        Row: {
          action_configs: Json | null
          caps: Json | null
          created_at: string | null
          formulas: Json | null
          id: string
          is_active: boolean | null
          policy_hash: string | null
          thresholds: Json | null
          version: string
        }
        Insert: {
          action_configs?: Json | null
          caps?: Json | null
          created_at?: string | null
          formulas?: Json | null
          id?: string
          is_active?: boolean | null
          policy_hash?: string | null
          thresholds?: Json | null
          version: string
        }
        Update: {
          action_configs?: Json | null
          caps?: Json | null
          created_at?: string | null
          formulas?: Json | null
          id?: string
          is_active?: boolean | null
          policy_hash?: string | null
          thresholds?: Json | null
          version?: string
        }
        Relationships: []
      }
      pplp_scores: {
        Row: {
          action_id: string | null
          base_reward: number | null
          created_at: string | null
          decision: string
          decision_reason: string | null
          fail_reasons: string[] | null
          final_reward: number
          id: string
          light_score: number
          multiplier_i: number | null
          multiplier_k: number | null
          multiplier_q: number | null
          pillar_c: number
          pillar_h: number
          pillar_s: number
          pillar_t: number
          pillar_u: number
          policy_version: string | null
          scored_by: string | null
        }
        Insert: {
          action_id?: string | null
          base_reward?: number | null
          created_at?: string | null
          decision?: string
          decision_reason?: string | null
          fail_reasons?: string[] | null
          final_reward?: number
          id?: string
          light_score?: number
          multiplier_i?: number | null
          multiplier_k?: number | null
          multiplier_q?: number | null
          pillar_c?: number
          pillar_h?: number
          pillar_s?: number
          pillar_t?: number
          pillar_u?: number
          policy_version?: string | null
          scored_by?: string | null
        }
        Update: {
          action_id?: string | null
          base_reward?: number | null
          created_at?: string | null
          decision?: string
          decision_reason?: string | null
          fail_reasons?: string[] | null
          final_reward?: number
          id?: string
          light_score?: number
          multiplier_i?: number | null
          multiplier_k?: number | null
          multiplier_q?: number | null
          pillar_c?: number
          pillar_h?: number
          pillar_s?: number
          pillar_t?: number
          pillar_u?: number
          policy_version?: string | null
          scored_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pplp_scores_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: true
            referencedRelation: "pplp_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      pplp_user_caps: {
        Row: {
          action_counts: Json | null
          created_at: string | null
          epoch_date: string
          epoch_type: string | null
          id: string
          last_action_at: string | null
          total_minted: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_counts?: Json | null
          created_at?: string | null
          epoch_date?: string
          epoch_type?: string | null
          id?: string
          last_action_at?: string | null
          total_minted?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_counts?: Json | null
          created_at?: string | null
          epoch_date?: string
          epoch_type?: string | null
          id?: string
          last_action_at?: string | null
          total_minted?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pplp_user_nonces: {
        Row: {
          current_nonce: number | null
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          current_nonce?: number | null
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          current_nonce?: number | null
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pplp_user_tiers: {
        Row: {
          cap_multiplier: number | null
          created_at: string | null
          failed_actions: number | null
          fraud_flags: number | null
          id: string
          known_device_hashes: string[] | null
          last_device_hash: string | null
          last_tier_change: string | null
          passed_actions: number | null
          tier: number | null
          tier_change_reason: string | null
          total_actions_scored: number | null
          trust_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cap_multiplier?: number | null
          created_at?: string | null
          failed_actions?: number | null
          fraud_flags?: number | null
          id?: string
          known_device_hashes?: string[] | null
          last_device_hash?: string | null
          last_tier_change?: string | null
          passed_actions?: number | null
          tier?: number | null
          tier_change_reason?: string | null
          total_actions_scored?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cap_multiplier?: number | null
          created_at?: string | null
          failed_actions?: number | null
          fraud_flags?: number | null
          id?: string
          known_device_hashes?: string[] | null
          last_device_hash?: string | null
          last_tier_change?: string | null
          passed_actions?: number | null
          tier?: number | null
          tier_change_reason?: string | null
          total_actions_scored?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          approved_reward: number
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          claim_freeze_until: string | null
          cover_url: string | null
          created_at: string
          cross_platform_data: Json | null
          custodial_wallet_address: string | null
          default_wallet_type: string | null
          display_name: string | null
          education: string | null
          external_wallet_address: string | null
          financial_updated_at: string | null
          full_name: string | null
          fun_id: string | null
          grand_total_bet: number
          grand_total_deposit: number
          grand_total_loss: number
          grand_total_profit: number
          grand_total_win: number
          grand_total_withdraw: number
          id: string
          is_banned: boolean
          is_restricted: boolean
          last_login_platform: string | null
          last_wallet_change_at: string | null
          law_of_light_accepted: boolean
          law_of_light_accepted_at: string | null
          location: string | null
          oauth_provider: string | null
          pending_reward: number
          pinned_post_id: string | null
          public_wallet_address: string | null
          registered_from: string | null
          relationship_status: string | null
          reward_status: string
          social_links: Json | null
          soul_level: number
          total_rewards: number
          updated_at: string
          username: string
          username_normalized: string | null
          wallet_address: string | null
          wallet_change_count_30d: number | null
          wallet_risk_status: string | null
          workplace: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_reward?: number
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          claim_freeze_until?: string | null
          cover_url?: string | null
          created_at?: string
          cross_platform_data?: Json | null
          custodial_wallet_address?: string | null
          default_wallet_type?: string | null
          display_name?: string | null
          education?: string | null
          external_wallet_address?: string | null
          financial_updated_at?: string | null
          full_name?: string | null
          fun_id?: string | null
          grand_total_bet?: number
          grand_total_deposit?: number
          grand_total_loss?: number
          grand_total_profit?: number
          grand_total_win?: number
          grand_total_withdraw?: number
          id: string
          is_banned?: boolean
          is_restricted?: boolean
          last_login_platform?: string | null
          last_wallet_change_at?: string | null
          law_of_light_accepted?: boolean
          law_of_light_accepted_at?: string | null
          location?: string | null
          oauth_provider?: string | null
          pending_reward?: number
          pinned_post_id?: string | null
          public_wallet_address?: string | null
          registered_from?: string | null
          relationship_status?: string | null
          reward_status?: string
          social_links?: Json | null
          soul_level?: number
          total_rewards?: number
          updated_at?: string
          username: string
          username_normalized?: string | null
          wallet_address?: string | null
          wallet_change_count_30d?: number | null
          wallet_risk_status?: string | null
          workplace?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_reward?: number
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          claim_freeze_until?: string | null
          cover_url?: string | null
          created_at?: string
          cross_platform_data?: Json | null
          custodial_wallet_address?: string | null
          default_wallet_type?: string | null
          display_name?: string | null
          education?: string | null
          external_wallet_address?: string | null
          financial_updated_at?: string | null
          full_name?: string | null
          fun_id?: string | null
          grand_total_bet?: number
          grand_total_deposit?: number
          grand_total_loss?: number
          grand_total_profit?: number
          grand_total_win?: number
          grand_total_withdraw?: number
          id?: string
          is_banned?: boolean
          is_restricted?: boolean
          last_login_platform?: string | null
          last_wallet_change_at?: string | null
          law_of_light_accepted?: boolean
          law_of_light_accepted_at?: string | null
          location?: string | null
          oauth_provider?: string | null
          pending_reward?: number
          pinned_post_id?: string | null
          public_wallet_address?: string | null
          registered_from?: string | null
          relationship_status?: string | null
          reward_status?: string
          social_links?: Json | null
          soul_level?: number
          total_rewards?: number
          updated_at?: string
          username?: string
          username_normalized?: string | null
          wallet_address?: string | null
          wallet_change_count_30d?: number | null
          wallet_risk_status?: string | null
          workplace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pinned_post_id_fkey"
            columns: ["pinned_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_state: {
        Row: {
          count: number
          expires_at: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          expires_at: string
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          expires_at?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_logs: {
        Row: {
          auto_adjusted: boolean | null
          discrepancies: Json | null
          id: string
          level: number
          notes: string | null
          run_at: string
          run_by: string | null
          status: string
          total_checked: number | null
          total_mismatched: number | null
        }
        Insert: {
          auto_adjusted?: boolean | null
          discrepancies?: Json | null
          id?: string
          level?: number
          notes?: string | null
          run_at?: string
          run_by?: string | null
          status?: string
          total_checked?: number | null
          total_mismatched?: number | null
        }
        Update: {
          auto_adjusted?: boolean | null
          discrepancies?: Json | null
          id?: string
          level?: number
          notes?: string | null
          run_at?: string
          run_by?: string | null
          status?: string
          total_checked?: number | null
          total_mismatched?: number | null
        }
        Relationships: []
      }
      red_envelope_claims: {
        Row: {
          amount: number
          claimed_at: string
          claimer_id: string
          envelope_id: string
          id: string
        }
        Insert: {
          amount: number
          claimed_at?: string
          claimer_id: string
          envelope_id: string
          id?: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          claimer_id?: string
          envelope_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "red_envelope_claims_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "red_envelopes"
            referencedColumns: ["id"]
          },
        ]
      }
      red_envelopes: {
        Row: {
          conversation_id: string
          created_at: string
          creator_id: string
          expires_at: string
          greeting: string | null
          id: string
          message_id: string | null
          remaining_amount: number
          remaining_count: number
          status: string
          token: string
          total_amount: number
          total_count: number
        }
        Insert: {
          conversation_id: string
          created_at?: string
          creator_id: string
          expires_at?: string
          greeting?: string | null
          id?: string
          message_id?: string | null
          remaining_amount: number
          remaining_count: number
          status?: string
          token?: string
          total_amount: number
          total_count: number
        }
        Update: {
          conversation_id?: string
          created_at?: string
          creator_id?: string
          expires_at?: string
          greeting?: string | null
          id?: string
          message_id?: string | null
          remaining_amount?: number
          remaining_count?: number
          status?: string
          token?: string
          total_amount?: number
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "red_envelopes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_envelopes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_bookmarks: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_bookmarks_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          like_count: number
          parent_comment_id: string | null
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_comment_id?: string | null
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_shares: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          shared_to: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          shared_to?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          shared_to?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_shares_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_views: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          reel_id: string
          user_id: string | null
          watch_duration_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          reel_id: string
          user_id?: string | null
          watch_duration_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string | null
          watch_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          audio_artist: string | null
          audio_name: string | null
          caption: string | null
          comment_count: number
          created_at: string
          duration_seconds: number | null
          id: string
          is_active: boolean
          like_count: number
          share_count: number
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
          view_count: number
          visibility: string
        }
        Insert: {
          audio_artist?: string | null
          audio_name?: string | null
          caption?: string | null
          comment_count?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          like_count?: number
          share_count?: number
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
          view_count?: number
          visibility?: string
        }
        Update: {
          audio_artist?: string | null
          audio_name?: string | null
          caption?: string | null
          comment_count?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          like_count?: number
          share_count?: number
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
          view_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          conversation_id: string | null
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_adjustments: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_approvals: {
        Row: {
          admin_id: string
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_id: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_claims: {
        Row: {
          amount: number
          created_at: string
          id: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          search_query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          search_query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          search_query?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_posts: {
        Row: {
          created_at: string
          id: string
          original_post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_posts_original_post_id_fkey"
            columns: ["original_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      soul_nfts: {
        Row: {
          chain_id: number
          contract_address: string | null
          created_at: string
          experience_points: number
          id: string
          is_minted: boolean
          metadata_uri: string | null
          minted_at: string | null
          soul_element: string | null
          soul_level: number
          soul_name: string | null
          token_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chain_id?: number
          contract_address?: string | null
          created_at?: string
          experience_points?: number
          id?: string
          is_minted?: boolean
          metadata_uri?: string | null
          minted_at?: string | null
          soul_element?: string | null
          soul_level?: number
          soul_name?: string | null
          token_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chain_id?: number
          contract_address?: string | null
          created_at?: string
          experience_points?: number
          id?: string
          is_minted?: boolean
          metadata_uri?: string | null
          minted_at?: string | null
          soul_element?: string | null
          soul_level?: number
          soul_name?: string | null
          token_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "soul_nfts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soul_nfts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_packs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_free: boolean
          name: string
          preview_url: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name: string
          preview_url: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          name?: string
          preview_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      stickers: {
        Row: {
          created_at: string
          id: string
          is_animated: boolean
          name: string
          pack_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_animated?: boolean
          name: string
          pack_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_animated?: boolean
          name?: string
          pack_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          created_at: string
          duration: number
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          video_path: string
        }
        Insert: {
          created_at?: string
          duration: number
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          video_path: string
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: string
          chain_id: number
          created_at: string
          from_address: string
          id: string
          status: string
          to_address: string
          token_address: string | null
          token_symbol: string
          tx_hash: string
          user_id: string
        }
        Insert: {
          amount: string
          chain_id: number
          created_at?: string
          from_address: string
          id?: string
          status?: string
          to_address: string
          token_address?: string | null
          token_symbol: string
          tx_hash: string
          user_id: string
        }
        Update: {
          amount?: string
          chain_id?: number
          created_at?: string
          from_address?: string
          id?: string
          status?: string
          to_address?: string
          token_address?: string | null
          token_symbol?: string
          tx_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_reel_preferences: {
        Row: {
          engagement_score: number | null
          id: string
          liked_categories: string[] | null
          updated_at: string
          user_id: string
          watched_creators: string[] | null
        }
        Insert: {
          engagement_score?: number | null
          id?: string
          liked_categories?: string[] | null
          updated_at?: string
          user_id: string
          watched_creators?: string[] | null
        }
        Update: {
          engagement_score?: number | null
          id?: string
          liked_categories?: string[] | null
          updated_at?: string
          user_id?: string
          watched_creators?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reel_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reel_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_history: {
        Row: {
          change_reason: string | null
          created_at: string
          device_hash: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          metadata: Json | null
          started_at: string
          user_agent: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          device_hash?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          metadata?: Json | null
          started_at?: string
          user_agent?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          device_hash?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          metadata?: Json | null
          started_at?: string
          user_agent?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_light_reputation: {
        Row: {
          actions_count: number | null
          tier: number | null
          total_light_score: number | null
          total_minted: number | null
          user_id: string | null
        }
        Insert: {
          actions_count?: number | null
          tier?: number | null
          total_light_score?: number | null
          total_minted?: number | null
          user_id?: string | null
        }
        Update: {
          actions_count?: number | null
          tier?: number | null
          total_light_score?: number | null
          total_minted?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "light_reputation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "light_reputation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          full_name: string | null
          id: string | null
          public_wallet_address: string | null
          social_links: Json | null
          username: string | null
          username_normalized: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string | null
          public_wallet_address?: string | null
          social_links?: Json | null
          username?: string | null
          username_normalized?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string | null
          public_wallet_address?: string | null
          social_links?: Json | null
          username?: string | null
          username_normalized?: string | null
        }
        Relationships: []
      }
      user_custodial_wallets: {
        Row: {
          chain_id: number | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          last_activity_at: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          chain_id?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          chain_id?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custodial_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custodial_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_user_reward: {
        Args: { p_admin_id: string; p_note?: string; p_user_id: string }
        Returns: number
      }
      attach_live_replay_to_post: {
        Args: {
          _duration_seconds?: number
          _playback_url: string
          _session_id: string
          _thumbnail_url?: string
        }
        Returns: {
          agora_channel: string | null
          agora_uid_host: number | null
          channel_name: string
          created_at: string
          ended_at: string | null
          host_user_id: string
          id: string
          last_worker_response: Json | null
          owner_id: string
          post_id: string | null
          privacy: string
          recording_acquired_at: string | null
          recording_error: string | null
          recording_files: Json | null
          recording_ready_at: string | null
          recording_resource_id: string | null
          recording_sid: string | null
          recording_started_at: string | null
          recording_status: string
          recording_stopped_at: string | null
          recording_uid: number | null
          resource_id: string | null
          sid: string | null
          started_at: string
          status: string
          title: string | null
          updated_at: string
          viewer_count: number
        }
        SetofOptions: {
          from: "*"
          to: "live_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ban_user_permanently: {
        Args: { p_admin_id: string; p_reason?: string; p_user_id: string }
        Returns: boolean
      }
      batch_ban_ghost_users: {
        Args: { admin_id: string; user_ids: string[] }
        Returns: number
      }
      batch_delete_orphan_auth_users: {
        Args: { p_admin_id: string }
        Returns: number
      }
      calculate_light_score: {
        Args: {
          base_reward: number
          impact_score: number
          integrity_score: number
          quality_score: number
          unity_multiplier: number
        }
        Returns: number
      }
      calculate_tier: { Args: { total_score: number }; Returns: number }
      calculate_unity_multiplier: {
        Args: { unity_score: number }
        Returns: number
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_ms?: number }
        Returns: Json
      }
      check_user_cap_and_update: {
        Args: { _action_type: string; _reward_amount: number; _user_id: string }
        Returns: Json
      }
      claim_red_envelope: { Args: { p_envelope_id: string }; Returns: number }
      cleanup_expired_oauth_data: { Args: never; Returns: undefined }
      decrement_live_viewer_count: {
        Args: { session_id: string }
        Returns: undefined
      }
      end_livestream: { Args: { p_livestream_id: string }; Returns: boolean }
      expire_old_mint_requests_v2: { Args: never; Returns: number }
      generate_secure_token: { Args: { length?: number }; Returns: string }
      get_app_stats: {
        Args: never
        Returns: {
          total_camly_claimed: number
          total_photos: number
          total_posts: number
          total_rewards: number
          total_users: number
          total_videos: number
          treasury_camly_received: number
        }[]
      }
      get_banned_user_claims: {
        Args: never
        Returns: {
          claim_count: number
          first_claim_at: string
          last_claim_at: string
          total_claimed: number
          user_id: string
        }[]
      }
      get_benefactor_leaderboard: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_time_range?: string
          p_token_symbol?: string
        }
        Returns: {
          avatar_url: string
          full_name: string
          rank: number
          total_donated: number
          total_donations: number
          total_light_score: number
          user_id: string
          username: string
        }[]
      }
      get_daily_cap: { Args: { tier: number }; Returns: number }
      get_donation_history: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_type?: string
          p_user_id: string
        }
        Returns: {
          amount: string
          amount_usd: number
          confirmed_at: string
          created_at: string
          id: string
          light_score_earned: number
          message: string
          message_template: string
          post_id: string
          recipient_avatar_url: string
          recipient_id: string
          recipient_username: string
          sender_avatar_url: string
          sender_id: string
          sender_username: string
          status: string
          token_symbol: string
          tx_hash: string
        }[]
      }
      get_live_recording_context: {
        Args: { _session_id: string }
        Returns: {
          agora_channel: string
          channel_name: string
          host_user_id: string
          id: string
          last_worker_response: Json
          post_id: string
          recording_error: string
          recording_ready_at: string
          recording_started_at: string
          recording_status: string
          recording_stopped_at: string
          recording_uid: number
          resource_id: string
          sid: string
        }[]
      }
      get_next_nonce: { Args: { _user_id: string }; Returns: number }
      get_pplp_admin_stats: { Args: never; Returns: Json }
      get_recipient_leaderboard: {
        Args: { p_limit?: number; p_offset?: number; p_time_range?: string }
        Returns: {
          avatar_url: string
          full_name: string
          rank: number
          total_donations: number
          total_received: number
          user_id: string
          username: string
        }[]
      }
      get_user_directory_summary: {
        Args: never
        Returns: {
          approved_reward: number
          avatar_url: string
          camly_calculated: number
          camly_claimed: number
          camly_today: number
          comments_count: number
          created_at: string
          email: string
          friends_count: number
          full_name: string
          id: string
          internal_received: number
          internal_sent: number
          is_banned: boolean
          livestreams_count: number
          pending_reward: number
          posts_count: number
          reactions_on_posts: number
          reward_status: string
          shares_count: number
          tier: number
          total_light_score: number
          total_minted: number
          usdt_received: number
          username: string
          wallet_address: string
          web3_received: number
          web3_sent: number
        }[]
      }
      get_user_directory_totals: {
        Args: never
        Returns: {
          total_approved: number
          total_camly_calculated: number
          total_camly_claimed: number
          total_comments: number
          total_internal_received: number
          total_internal_sent: number
          total_light_score: number
          total_minted: number
          total_pending: number
          total_posts: number
          total_users: number
          total_web3_received: number
          total_web3_sent: number
          total_withdrawn: number
        }[]
      }
      get_user_donation_stats: {
        Args: { p_user_id: string }
        Returns: {
          donations_received: number
          donations_sent: number
          light_score_from_donations: number
          total_received: number
          total_sent: number
          unique_donors: number
          unique_recipients: number
        }[]
      }
      get_user_emails_for_admin: {
        Args: { p_admin_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_honor_stats: {
        Args: { p_user_id: string }
        Returns: {
          claimed_amount: number
          comments_count: number
          friends_count: number
          livestreams_count: number
          posts_count: number
          reactions_on_posts: number
          shares_count: number
          today_reward: number
          total_reward: number
        }[]
      }
      get_user_light_score: { Args: { p_user_id: string }; Returns: Json }
      get_user_rewards: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          comments_count: number
          friends_count: number
          id: string
          posts_count: number
          reactions_count: number
          reactions_on_posts: number
          shares_count: number
          total_reward: number
          username: string
        }[]
      }
      get_user_rewards_v2: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          comments_count: number
          friends_count: number
          id: string
          livestreams_count: number
          posts_count: number
          reactions_count: number
          reactions_on_posts: number
          shares_count: number
          today_reward: number
          total_reward: number
          username: string
        }[]
      }
      get_wallet_change_count_30d: {
        Args: { p_user_id: string }
        Returns: number
      }
      has_block_between: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_live_viewer_count: {
        Args: { session_id: string }
        Returns: undefined
      }
      is_conversation_admin: {
        Args: { check_user_id: string; conv_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { check_user_id: string; conv_id: string }
        Returns: boolean
      }
      is_gov_attester: { Args: { check_user_id: string }; Returns: boolean }
      normalize_username: { Args: { input_text: string }; Returns: string }
      pin_message: { Args: { p_message_id: string }; Returns: undefined }
      process_wallet_change: {
        Args: {
          p_device_hash?: string
          p_ip?: string
          p_new_wallet: string
          p_old_wallet?: string
          p_reason?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
      recalculate_user_financial:
        | { Args: { p_client_id?: string; p_user_id: string }; Returns: Json }
        | {
            Args: {
              p_admin_id?: string
              p_client_id?: string
              p_user_id: string
            }
            Returns: Json
          }
      reject_user_reward: {
        Args: { p_admin_id: string; p_note?: string; p_user_id: string }
        Returns: number
      }
      run_financial_reconciliation: {
        Args: { p_admin_id?: string }
        Returns: Json
      }
      set_live_recording_state: {
        Args: {
          _last_worker_response?: Json
          _recording_error?: string
          _recording_ready_at?: string
          _recording_started_at?: string
          _recording_status?: string
          _recording_stopped_at?: string
          _recording_uid?: number
          _resource_id?: string
          _session_id: string
          _sid?: string
        }
        Returns: {
          agora_channel: string | null
          agora_uid_host: number | null
          channel_name: string
          created_at: string
          ended_at: string | null
          host_user_id: string
          id: string
          last_worker_response: Json | null
          owner_id: string
          post_id: string | null
          privacy: string
          recording_acquired_at: string | null
          recording_error: string | null
          recording_files: Json | null
          recording_ready_at: string | null
          recording_resource_id: string | null
          recording_sid: string | null
          recording_started_at: string | null
          recording_status: string
          recording_stopped_at: string | null
          recording_uid: number | null
          resource_id: string | null
          sid: string | null
          started_at: string
          status: string
          title: string | null
          updated_at: string
          viewer_count: number
        }
        SetofOptions: {
          from: "*"
          to: "live_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpin_message: { Args: { p_message_id: string }; Returns: undefined }
      upsert_live_recording_row: {
        Args: {
          _duration_seconds?: number
          _file_list_json?: Json
          _media_url?: string
          _raw_response?: Json
          _recorder_uid?: string
          _resource_id?: string
          _session_id: string
          _sid?: string
          _status?: string
          _stopped_at?: string
          _thumbnail_url?: string
        }
        Returns: {
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          file_list_json: Json
          id: string
          live_id: string
          media_url: string | null
          mode: string | null
          raw_response: Json | null
          recorder_uid: string | null
          resource_id: string | null
          sid: string | null
          status: string
          stopped_at: string | null
          storage_region: number | null
          storage_vendor: number | null
          thumbnail_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "live_recordings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
