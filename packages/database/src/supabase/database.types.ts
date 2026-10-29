export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      albums: {
        Row: {
          cover_media_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          memorial_id: string
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["section_visibility"]
        }
        Insert: {
          cover_media_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          memorial_id: string
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Update: {
          cover_media_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          memorial_id?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "albums_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_kind: Database["public"]["Enums"]["audit_actor_kind"]
          actor_profile_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          memorial_id: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_kind?: Database["public"]["Enums"]["audit_actor_kind"]
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          memorial_id?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_kind?: Database["public"]["Enums"]["audit_actor_kind"]
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          memorial_id?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      family_updates: {
        Row: {
          author_profile_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          funeral_event_id: string | null
          id: string
          importance: Database["public"]["Enums"]["update_importance"]
          memorial_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["section_visibility"]
        }
        Insert: {
          author_profile_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          funeral_event_id?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["update_importance"]
          memorial_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Update: {
          author_profile_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          funeral_event_id?: string | null
          id?: string
          importance?: Database["public"]["Enums"]["update_importance"]
          memorial_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "family_updates_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_updates_funeral_event_id_fkey"
            columns: ["funeral_event_id"]
            isOneToOne: false
            referencedRelation: "funeral_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_updates_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_settings: {
        Row: {
          candles_enabled: boolean
          family_section_enabled: boolean
          funeral_enabled: boolean
          guestbook_enabled: boolean
          memorial_id: string
          photo_contributions_enabled: boolean
          qr_code_enabled: boolean
          sharing_enabled: boolean
          tribute_moderation_enabled: boolean
          tributes_enabled: boolean
          updated_at: string
          updates_enabled: boolean
          visitor_analytics_enabled: boolean
        }
        Insert: {
          candles_enabled?: boolean
          family_section_enabled?: boolean
          funeral_enabled?: boolean
          guestbook_enabled?: boolean
          memorial_id: string
          photo_contributions_enabled?: boolean
          qr_code_enabled?: boolean
          sharing_enabled?: boolean
          tribute_moderation_enabled?: boolean
          tributes_enabled?: boolean
          updated_at?: string
          updates_enabled?: boolean
          visitor_analytics_enabled?: boolean
        }
        Update: {
          candles_enabled?: boolean
          family_section_enabled?: boolean
          funeral_enabled?: boolean
          guestbook_enabled?: boolean
          memorial_id?: string
          photo_contributions_enabled?: boolean
          qr_code_enabled?: boolean
          sharing_enabled?: boolean
          tribute_moderation_enabled?: boolean
          tributes_enabled?: boolean
          updated_at?: string
          updates_enabled?: boolean
          visitor_analytics_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feature_settings_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: true
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      funeral_events: {
        Row: {
          address_line: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          city: string | null
          contact_name: string | null
          contact_phone: string | null
          contacts: Json
          country: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number
          dress_code: string | null
          end_time: string | null
          event_date: string | null
          event_type: Database["public"]["Enums"]["funeral_event_type"]
          id: string
          instructions: string | null
          latitude: number | null
          livestream_url: string | null
          longitude: number | null
          memorial_id: string
          postal_code: string | null
          published_at: string | null
          region: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["funeral_event_status"]
          timezone: string | null
          title: string
          updated_at: string
          venue_name: string | null
          visibility: Database["public"]["Enums"]["section_visibility"]
        }
        Insert: {
          address_line?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacts?: Json
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          dress_code?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["funeral_event_type"]
          id?: string
          instructions?: string | null
          latitude?: number | null
          livestream_url?: string | null
          longitude?: number | null
          memorial_id: string
          postal_code?: string | null
          published_at?: string | null
          region?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["funeral_event_status"]
          timezone?: string | null
          title: string
          updated_at?: string
          venue_name?: string | null
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Update: {
          address_line?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacts?: Json
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          dress_code?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["funeral_event_type"]
          id?: string
          instructions?: string | null
          latitude?: number | null
          livestream_url?: string | null
          longitude?: number | null
          memorial_id?: string
          postal_code?: string | null
          published_at?: string | null
          region?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["funeral_event_status"]
          timezone?: string | null
          title?: string
          updated_at?: string
          venue_name?: string | null
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "funeral_events_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          album_id: string | null
          alt_text: string | null
          byte_size: number | null
          caption: string | null
          checksum: string | null
          created_at: string
          deleted_at: string | null
          display_order: number
          duration_seconds: number | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          memorial_id: string
          mime_type: string | null
          processing_status: Database["public"]["Enums"]["media_processing_status"]
          source: Database["public"]["Enums"]["media_source"]
          storage_bucket: string
          storage_path: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
          visibility: Database["public"]["Enums"]["section_visibility"]
          width: number | null
        }
        Insert: {
          album_id?: string | null
          alt_text?: string | null
          byte_size?: number | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          memorial_id: string
          mime_type?: string | null
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          source?: Database["public"]["Enums"]["media_source"]
          storage_bucket: string
          storage_path: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["section_visibility"]
          width?: number | null
        }
        Update: {
          album_id?: string | null
          alt_text?: string | null
          byte_size?: number | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          memorial_id?: string
          mime_type?: string | null
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          source?: Database["public"]["Enums"]["media_source"]
          storage_bucket?: string
          storage_path?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["section_visibility"]
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          invited_email: string | null
          memorial_id: string
          profile_id: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["memorial_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          invited_email?: string | null
          memorial_id: string
          profile_id?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["memorial_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          invited_email?: string | null
          memorial_id?: string
          profile_id?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["memorial_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_memberships_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_people: {
        Row: {
          biography: string | null
          created_at: string
          deleted_at: string | null
          display_order: number
          full_name: string
          id: string
          is_deceased: boolean
          memorial_id: string
          photo_media_id: string | null
          relationship: string | null
          updated_at: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          full_name: string
          id?: string
          is_deceased?: boolean
          memorial_id: string
          photo_media_id?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          full_name?: string
          id?: string
          is_deceased?: boolean
          memorial_id?: string
          photo_media_id?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_people_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_people_photo_media_fkey"
            columns: ["photo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_slugs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_canonical: boolean
          memorial_id: string
          redirect_enabled: boolean
          retired_at: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_canonical?: boolean
          memorial_id: string
          redirect_enabled?: boolean
          retired_at?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_canonical?: boolean
          memorial_id?: string
          redirect_enabled?: boolean
          retired_at?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_slugs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_slugs_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorials: {
        Row: {
          archived_at: string | null
          biography_summary: string | null
          birth_place: string | null
          birth_year_only: boolean
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          date_of_death: string | null
          deleted_at: string | null
          full_name: string
          funeral_planning_status: Database["public"]["Enums"]["funeral_planning_status"]
          gender: Database["public"]["Enums"]["memorial_gender"] | null
          headline: string | null
          id: string
          portrait_media_id: string | null
          preferred_name: string | null
          published_at: string | null
          resting_place: string | null
          status: Database["public"]["Enums"]["memorial_status"]
          survived_by: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          biography_summary?: string | null
          birth_place?: string | null
          birth_year_only?: boolean
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          deleted_at?: string | null
          full_name: string
          funeral_planning_status?: Database["public"]["Enums"]["funeral_planning_status"]
          gender?: Database["public"]["Enums"]["memorial_gender"] | null
          headline?: string | null
          id?: string
          portrait_media_id?: string | null
          preferred_name?: string | null
          published_at?: string | null
          resting_place?: string | null
          status?: Database["public"]["Enums"]["memorial_status"]
          survived_by?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          biography_summary?: string | null
          birth_place?: string | null
          birth_year_only?: boolean
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          date_of_death?: string | null
          deleted_at?: string | null
          full_name?: string
          funeral_planning_status?: Database["public"]["Enums"]["funeral_planning_status"]
          gender?: Database["public"]["Enums"]["memorial_gender"] | null
          headline?: string | null
          id?: string
          portrait_media_id?: string | null
          preferred_name?: string | null
          published_at?: string | null
          resting_place?: string | null
          status?: Database["public"]["Enums"]["memorial_status"]
          survived_by?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorials_cover_media_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorials_portrait_media_fkey"
            columns: ["portrait_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          memorial_id: string
          on_date: string | null
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["section_visibility"]
          year: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          memorial_id: string
          on_date?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
          year: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          memorial_id?: string
          on_date?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          memorial_id: string | null
          payload: Json
          read_at: string | null
          recipient_email: string | null
          recipient_profile_id: string | null
          sent_at: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          memorial_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_email?: string | null
          recipient_profile_id?: string | null
          sent_at?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          memorial_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_email?: string | null
          recipient_profile_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          documents_visibility: Database["public"]["Enums"]["section_visibility"]
          family_details_visibility: Database["public"]["Enums"]["section_visibility"]
          funeral_events_visibility: Database["public"]["Enums"]["section_visibility"]
          memorial_id: string
          photos_visibility: Database["public"]["Enums"]["section_visibility"]
          resting_place_visibility: Database["public"]["Enums"]["section_visibility"]
          search_indexing_enabled: boolean
          story_visibility: Database["public"]["Enums"]["section_visibility"]
          updated_at: string
          updates_visibility: Database["public"]["Enums"]["section_visibility"]
          visibility: Database["public"]["Enums"]["memorial_visibility"]
        }
        Insert: {
          documents_visibility?: Database["public"]["Enums"]["section_visibility"]
          family_details_visibility?: Database["public"]["Enums"]["section_visibility"]
          funeral_events_visibility?: Database["public"]["Enums"]["section_visibility"]
          memorial_id: string
          photos_visibility?: Database["public"]["Enums"]["section_visibility"]
          resting_place_visibility?: Database["public"]["Enums"]["section_visibility"]
          search_indexing_enabled?: boolean
          story_visibility?: Database["public"]["Enums"]["section_visibility"]
          updated_at?: string
          updates_visibility?: Database["public"]["Enums"]["section_visibility"]
          visibility?: Database["public"]["Enums"]["memorial_visibility"]
        }
        Update: {
          documents_visibility?: Database["public"]["Enums"]["section_visibility"]
          family_details_visibility?: Database["public"]["Enums"]["section_visibility"]
          funeral_events_visibility?: Database["public"]["Enums"]["section_visibility"]
          memorial_id?: string
          photos_visibility?: Database["public"]["Enums"]["section_visibility"]
          resting_place_visibility?: Database["public"]["Enums"]["section_visibility"]
          search_indexing_enabled?: boolean
          story_visibility?: Database["public"]["Enums"]["section_visibility"]
          updated_at?: string
          updates_visibility?: Database["public"]["Enums"]["section_visibility"]
          visibility?: Database["public"]["Enums"]["memorial_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "privacy_settings_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: true
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          full_name: string | null
          id: string
          is_platform_admin: boolean
          locale: string
          marketing_opt_in: boolean
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          locale?: string
          marketing_opt_in?: boolean
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          locale?: string
          marketing_opt_in?: boolean
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      remembrance_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["remembrance_action_type"]
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          memorial_id: string
          message: string | null
          submitted_ip: unknown
          visitor_display_name: string | null
          visitor_session: string | null
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["remembrance_action_type"]
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          memorial_id: string
          message?: string | null
          submitted_ip?: unknown
          visitor_display_name?: string | null
          visitor_session?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["remembrance_action_type"]
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          memorial_id?: string
          message?: string | null
          submitted_ip?: unknown
          visitor_display_name?: string | null
          visitor_session?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remembrance_actions_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remembrance_actions_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          memorial_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_email: string | null
          reporter_profile_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          submitted_ip: unknown
          tribute_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          memorial_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_email?: string | null
          reporter_profile_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_ip?: unknown
          tribute_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          memorial_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_email?: string | null
          reporter_profile_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_ip?: unknown
          tribute_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tribute_id_fkey"
            columns: ["tribute_id"]
            isOneToOne: false
            referencedRelation: "public_tributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tribute_id_fkey"
            columns: ["tribute_id"]
            isOneToOne: false
            referencedRelation: "tributes"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_slugs: {
        Row: {
          category: string
          created_at: string
          note: string | null
          slug: string
        }
        Insert: {
          category?: string
          created_at?: string
          note?: string | null
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          note?: string | null
          slug?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          assigned_to: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          details: string | null
          id: string
          internal_notes: string | null
          memorial_id: string | null
          requested_by: string | null
          resolved_at: string | null
          service_type: Database["public"]["Enums"]["service_request_type"]
          status: Database["public"]["Enums"]["service_request_status"]
          submitted_ip: unknown
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          details?: string | null
          id?: string
          internal_notes?: string | null
          memorial_id?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          service_type?: Database["public"]["Enums"]["service_request_type"]
          status?: Database["public"]["Enums"]["service_request_status"]
          submitted_ip?: unknown
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          details?: string | null
          id?: string
          internal_notes?: string | null
          memorial_id?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          service_type?: Database["public"]["Enums"]["service_request_type"]
          status?: Database["public"]["Enums"]["service_request_status"]
          submitted_ip?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      share_resolvers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string | null
          medium: string | null
          memorial_id: string
          retired_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          medium?: string | null
          memorial_id: string
          retired_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          medium?: string | null
          memorial_id?: string
          retired_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_resolvers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_resolvers_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      story_sections: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          display_order: number
          id: string
          kind: Database["public"]["Enums"]["story_section_kind"]
          memorial_id: string
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["section_visibility"]
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          kind?: Database["public"]["Enums"]["story_section_kind"]
          memorial_id: string
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          kind?: Database["public"]["Enums"]["story_section_kind"]
          memorial_id?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["section_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "story_sections_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tributes: {
        Row: {
          author_display_name: string
          author_email: string | null
          author_relationship: string | null
          created_at: string
          deleted_at: string | null
          edit_token: string
          id: string
          media_id: string | null
          memorial_id: string
          message: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["tribute_status"]
          submitted_ip: unknown
          submitted_user_agent: string | null
          updated_at: string
        }
        Insert: {
          author_display_name: string
          author_email?: string | null
          author_relationship?: string | null
          created_at?: string
          deleted_at?: string | null
          edit_token?: string
          id?: string
          media_id?: string | null
          memorial_id: string
          message: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["tribute_status"]
          submitted_ip?: unknown
          submitted_user_agent?: string | null
          updated_at?: string
        }
        Update: {
          author_display_name?: string
          author_email?: string | null
          author_relationship?: string | null
          created_at?: string
          deleted_at?: string | null
          edit_token?: string
          id?: string
          media_id?: string | null
          memorial_id?: string
          message?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["tribute_status"]
          submitted_ip?: unknown
          submitted_user_agent?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tributes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tributes_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tributes_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_service_requests: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          details: string | null
          id: string | null
          memorial_id: string | null
          resolved_at: string | null
          service_type:
            | Database["public"]["Enums"]["service_request_type"]
            | null
          status: Database["public"]["Enums"]["service_request_status"] | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          details?: string | null
          id?: string | null
          memorial_id?: string | null
          resolved_at?: string | null
          service_type?:
            | Database["public"]["Enums"]["service_request_type"]
            | null
          status?: Database["public"]["Enums"]["service_request_status"] | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          details?: string | null
          id?: string | null
          memorial_id?: string | null
          resolved_at?: string | null
          service_type?:
            | Database["public"]["Enums"]["service_request_type"]
            | null
          status?: Database["public"]["Enums"]["service_request_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      public_tributes: {
        Row: {
          author_display_name: string | null
          author_relationship: string | null
          created_at: string | null
          id: string | null
          media_id: string | null
          memorial_id: string | null
          message: string | null
          published_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tributes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tributes_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      remembrance_action_counts: {
        Row: {
          action_type:
            | Database["public"]["Enums"]["remembrance_action_type"]
            | null
          memorial_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "remembrance_actions_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_memorial_invite: {
        Args: { membership: string }
        Returns: {
          memorial_id: string
          role: Database["public"]["Enums"]["memorial_role"]
        }[]
      }
      apply_tribute_edit: {
        Args: {
          new_author_display_name: string
          new_author_relationship: string
          new_message: string
          new_status: Database["public"]["Enums"]["tribute_status"]
          token: string
        }
        Returns: {
          author_display_name: string
          author_relationship: string
          id: string
          memorial_id: string
          message: string
          status: Database["public"]["Enums"]["tribute_status"]
        }[]
      }
      memorial_invite_preview: {
        Args: { membership: string }
        Returns: {
          invited_by_name: string
          memorial_id: string
          memorial_name: string
          role: Database["public"]["Enums"]["memorial_role"]
        }[]
      }
      recent_reports_from_ip: {
        Args: { from_ip: unknown; since: string }
        Returns: number
      }
      recent_service_requests_from_ip: {
        Args: { from_ip: unknown; since: string }
        Returns: number
      }
      recent_tributes_from_ip: {
        Args: { from_ip: unknown; since: string; target_memorial: string }
        Returns: number
      }
      resolve_memorial_slug: {
        Args: { lookup: string }
        Returns: {
          canonical_slug: string
          is_alias: boolean
          memorial_id: string
          redirect_enabled: boolean
        }[]
      }
      resolve_share_token: {
        Args: { lookup: string }
        Returns: {
          canonical_slug: string
          is_active: boolean
          memorial_id: string
        }[]
      }
      resolve_tribute_edit_token: {
        Args: { token: string }
        Returns: {
          author_display_name: string
          author_relationship: string
          created_at: string
          id: string
          memorial_id: string
          message: string
          status: Database["public"]["Enums"]["tribute_status"]
        }[]
      }
      slug_is_available: { Args: { candidate: string }; Returns: boolean }
      transfer_memorial_ownership: {
        Args: { new_owner: string; target_memorial: string }
        Returns: {
          previous_owner: string
          promoted_owner: string
        }[]
      }
    }
    Enums: {
      audit_actor_kind: "user" | "platform_admin" | "system" | "anonymous"
      funeral_event_status: "draft" | "published" | "cancelled" | "completed"
      funeral_event_type:
        | "service_of_songs"
        | "wake"
        | "viewing"
        | "funeral_service"
        | "burial"
        | "reception"
        | "thanksgiving"
        | "custom"
      funeral_planning_status:
        | "not_started"
        | "planning"
        | "partially_confirmed"
        | "confirmed"
        | "completed"
      media_kind: "image" | "video" | "audio" | "document"
      media_processing_status: "pending" | "ready" | "failed"
      media_source: "family" | "tribute" | "admin" | "import"
      membership_status: "invited" | "active" | "suspended" | "revoked"
      memorial_gender: "male" | "female"
      memorial_role:
        | "owner"
        | "admin"
        | "content_editor"
        | "tribute_moderator"
        | "viewer"
      memorial_status:
        | "draft"
        | "published"
        | "archived"
        | "suspended"
        | "deleted"
      memorial_visibility: "private" | "anyone_with_link" | "public"
      notification_channel: "in_app" | "email"
      notification_event_type:
        | "tribute_submitted"
        | "tribute_approved"
        | "photo_submitted"
        | "admin_invited"
        | "funeral_event_published"
        | "funeral_event_updated"
        | "family_update_published"
        | "service_request_received"
        | "memorial_reported"
        | "anniversary_upcoming"
      publication_status: "draft" | "published" | "archived"
      remembrance_action_type:
        | "candle"
        | "flower"
        | "prayer"
        | "stone"
        | "heart"
      report_reason:
        | "spam"
        | "abuse"
        | "impersonation"
        | "privacy"
        | "inaccurate"
        | "other"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      section_visibility: "inherit" | "private" | "members" | "public"
      service_request_status:
        | "new"
        | "in_review"
        | "contacted"
        | "scheduled"
        | "completed"
        | "declined"
        | "cancelled"
      service_request_type:
        | "funeral_planning"
        | "printing"
        | "livestream"
        | "catering"
        | "transport"
        | "flowers"
        | "other"
      story_section_kind:
        | "biography"
        | "early_life"
        | "family"
        | "career"
        | "education"
        | "faith"
        | "achievements"
        | "legacy"
        | "custom"
      tribute_status:
        | "pending"
        | "approved"
        | "rejected"
        | "hidden"
        | "reported"
      update_importance: "normal" | "high" | "urgent"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_actor_kind: ["user", "platform_admin", "system", "anonymous"],
      funeral_event_status: ["draft", "published", "cancelled", "completed"],
      funeral_event_type: [
        "service_of_songs",
        "wake",
        "viewing",
        "funeral_service",
        "burial",
        "reception",
        "thanksgiving",
        "custom",
      ],
      funeral_planning_status: [
        "not_started",
        "planning",
        "partially_confirmed",
        "confirmed",
        "completed",
      ],
      media_kind: ["image", "video", "audio", "document"],
      media_processing_status: ["pending", "ready", "failed"],
      media_source: ["family", "tribute", "admin", "import"],
      membership_status: ["invited", "active", "suspended", "revoked"],
      memorial_gender: ["male", "female"],
      memorial_role: [
        "owner",
        "admin",
        "content_editor",
        "tribute_moderator",
        "viewer",
      ],
      memorial_status: [
        "draft",
        "published",
        "archived",
        "suspended",
        "deleted",
      ],
      memorial_visibility: ["private", "anyone_with_link", "public"],
      notification_channel: ["in_app", "email"],
      notification_event_type: [
        "tribute_submitted",
        "tribute_approved",
        "photo_submitted",
        "admin_invited",
        "funeral_event_published",
        "funeral_event_updated",
        "family_update_published",
        "service_request_received",
        "memorial_reported",
        "anniversary_upcoming",
      ],
      publication_status: ["draft", "published", "archived"],
      remembrance_action_type: ["candle", "flower", "prayer", "stone", "heart"],
      report_reason: [
        "spam",
        "abuse",
        "impersonation",
        "privacy",
        "inaccurate",
        "other",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      section_visibility: ["inherit", "private", "members", "public"],
      service_request_status: [
        "new",
        "in_review",
        "contacted",
        "scheduled",
        "completed",
        "declined",
        "cancelled",
      ],
      service_request_type: [
        "funeral_planning",
        "printing",
        "livestream",
        "catering",
        "transport",
        "flowers",
        "other",
      ],
      story_section_kind: [
        "biography",
        "early_life",
        "family",
        "career",
        "education",
        "faith",
        "achievements",
        "legacy",
        "custom",
      ],
      tribute_status: ["pending", "approved", "rejected", "hidden", "reported"],
      update_importance: ["normal", "high", "urgent"],
    },
  },
} as const

