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
      chat_logs: {
        Row: {
          ai_reply: string | null
          channel: string | null
          client_id: string
          created_at: string
          id: string
          user_message: string | null
        }
        Insert: {
          ai_reply?: string | null
          channel?: string | null
          client_id: string
          created_at?: string
          id?: string
          user_message?: string | null
        }
        Update: {
          ai_reply?: string | null
          channel?: string | null
          client_id?: string
          created_at?: string
          id?: string
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_activity_log: {
        Row: {
          client_id: string
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_submissions: {
        Row: {
          admin_notes: string | null
          ai_business_info: string | null
          ai_prompt: string | null
          ai_reply_style: string | null
          archived_at: string | null
          business_hours: string | null
          business_information: string | null
          checklist_ai_tested: boolean
          checklist_confirmation_sent: boolean
          checklist_info_reviewed: boolean
          checklist_n8n_updated: boolean
          checklist_prompt_updated: boolean
          client_email: string | null
          client_id: string
          client_name: string | null
          faq: string | null
          id: string
          important_notes: string | null
          lead_collection_rules: string[] | null
          other_notes: string | null
          preferred_language: string | null
          preferred_languages: string[] | null
          promotion: string | null
          service_pricing: string | null
          services_products: string | null
          status: string
          submission_kind: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          ai_business_info?: string | null
          ai_prompt?: string | null
          ai_reply_style?: string | null
          archived_at?: string | null
          business_hours?: string | null
          business_information?: string | null
          checklist_ai_tested?: boolean
          checklist_confirmation_sent?: boolean
          checklist_info_reviewed?: boolean
          checklist_n8n_updated?: boolean
          checklist_prompt_updated?: boolean
          client_email?: string | null
          client_id: string
          client_name?: string | null
          faq?: string | null
          id?: string
          important_notes?: string | null
          lead_collection_rules?: string[] | null
          other_notes?: string | null
          preferred_language?: string | null
          preferred_languages?: string[] | null
          promotion?: string | null
          service_pricing?: string | null
          services_products?: string | null
          status?: string
          submission_kind?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          ai_business_info?: string | null
          ai_prompt?: string | null
          ai_reply_style?: string | null
          archived_at?: string | null
          business_hours?: string | null
          business_information?: string | null
          checklist_ai_tested?: boolean
          checklist_confirmation_sent?: boolean
          checklist_info_reviewed?: boolean
          checklist_n8n_updated?: boolean
          checklist_prompt_updated?: boolean
          client_email?: string | null
          client_id?: string
          client_name?: string | null
          faq?: string | null
          id?: string
          important_notes?: string | null
          lead_collection_rules?: string[] | null
          other_notes?: string | null
          preferred_language?: string | null
          preferred_languages?: string[] | null
          promotion?: string | null
          service_pricing?: string | null
          services_products?: string | null
          status?: string
          submission_kind?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          ai_business_info: string | null
          ai_prompt: string | null
          automation_note: string | null
          business_industry: string | null
          business_type: string | null
          client_id: string
          client_name: string
          created_at: string
          current_password_admin_only: string | null
          email: string
          expiry_date: string | null
          faq: string | null
          id: string
          instagram_link: string | null
          instagram_status: string | null
          internal_admin_note: string | null
          messenger_link: string | null
          messenger_status: string | null
          monthly_fee: number | null
          n8n_workflow_link: string | null
          n8n_workflow_name: string | null
          n8n_workflow_status: string | null
          other_notes: string | null
          package_name: string | null
          password_note: string | null
          password_updated_at: string | null
          preferred_language: string | null
          promotion: string | null
          renewal_note: string | null
          service_pricing: string | null
          status: string
          telegram_bot: string | null
          telegram_bot_link: string | null
          temporary_password: string | null
          updated_at: string
          whatsapp_link: string | null
          whatsapp_status: string | null
        }
        Insert: {
          ai_business_info?: string | null
          ai_prompt?: string | null
          automation_note?: string | null
          business_industry?: string | null
          business_type?: string | null
          client_id?: string
          client_name: string
          created_at?: string
          current_password_admin_only?: string | null
          email: string
          expiry_date?: string | null
          faq?: string | null
          id?: string
          instagram_link?: string | null
          instagram_status?: string | null
          internal_admin_note?: string | null
          messenger_link?: string | null
          messenger_status?: string | null
          monthly_fee?: number | null
          n8n_workflow_link?: string | null
          n8n_workflow_name?: string | null
          n8n_workflow_status?: string | null
          other_notes?: string | null
          package_name?: string | null
          password_note?: string | null
          password_updated_at?: string | null
          preferred_language?: string | null
          promotion?: string | null
          renewal_note?: string | null
          service_pricing?: string | null
          status?: string
          telegram_bot?: string | null
          telegram_bot_link?: string | null
          temporary_password?: string | null
          updated_at?: string
          whatsapp_link?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          ai_business_info?: string | null
          ai_prompt?: string | null
          automation_note?: string | null
          business_industry?: string | null
          business_type?: string | null
          client_id?: string
          client_name?: string
          created_at?: string
          current_password_admin_only?: string | null
          email?: string
          expiry_date?: string | null
          faq?: string | null
          id?: string
          instagram_link?: string | null
          instagram_status?: string | null
          internal_admin_note?: string | null
          messenger_link?: string | null
          messenger_status?: string | null
          monthly_fee?: number | null
          n8n_workflow_link?: string | null
          n8n_workflow_name?: string | null
          n8n_workflow_status?: string | null
          other_notes?: string | null
          package_name?: string | null
          password_note?: string | null
          password_updated_at?: string | null
          preferred_language?: string | null
          promotion?: string | null
          renewal_note?: string | null
          service_pricing?: string | null
          status?: string
          telegram_bot?: string | null
          telegram_bot_link?: string | null
          temporary_password?: string | null
          updated_at?: string
          whatsapp_link?: string | null
          whatsapp_status?: string | null
        }
        Relationships: []
      }
      device_connections: {
        Row: {
          client_id: string
          connection_name: string | null
          connection_status: string
          created_at: string
          device_name: string | null
          device_slot: number
          id: string
          last_connected_at: string | null
          platform: string
          provider: string | null
          provider_session_id: string | null
          provider_token: string | null
          qr_code: string | null
          qr_expires_at: string | null
          session_health: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          connection_name?: string | null
          connection_status?: string
          created_at?: string
          device_name?: string | null
          device_slot: number
          id?: string
          last_connected_at?: string | null
          platform: string
          provider?: string | null
          provider_session_id?: string | null
          provider_token?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          session_health?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          connection_name?: string | null
          connection_status?: string
          created_at?: string
          device_name?: string | null
          device_slot?: number
          id?: string
          last_connected_at?: string | null
          platform?: string
          provider?: string | null
          provider_session_id?: string | null
          provider_token?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          session_health?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_checklist: {
        Row: {
          done_at: string | null
          done_by: string | null
          id: string
          is_done: boolean
          item_key: string
          item_label: string
          sort_order: number
          submission_id: string
        }
        Insert: {
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          item_key: string
          item_label: string
          sort_order?: number
          submission_id: string
        }
        Update: {
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          item_key?: string
          item_label?: string
          sort_order?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_checklist_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "client_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      whatsapp_contacts: {
        Row: {
          assigned_staff: string | null
          avatar_url: string | null
          client_id: string
          created_at: string
          device_slot: number
          display_name: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          lead_score: number | null
          notes: string | null
          phone: string
          tags: string[] | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_staff?: string | null
          avatar_url?: string | null
          client_id: string
          created_at?: string
          device_slot: number
          display_name?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_score?: number | null
          notes?: string | null
          phone: string
          tags?: string[] | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_staff?: string | null
          avatar_url?: string | null
          client_id?: string
          created_at?: string
          device_slot?: number
          display_name?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_score?: number | null
          notes?: string | null
          phone?: string
          tags?: string[] | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          client_id: string
          contact_id: string | null
          created_at: string
          device_slot: number
          direction: string
          id: string
          is_ai_reply: boolean
          media_url: string | null
          message_type: string
          sent_at: string
        }
        Insert: {
          body?: string | null
          client_id: string
          contact_id?: string | null
          created_at?: string
          device_slot: number
          direction: string
          id?: string
          is_ai_reply?: boolean
          media_url?: string | null
          message_type?: string
          sent_at?: string
        }
        Update: {
          body?: string | null
          client_id?: string
          contact_id?: string | null
          created_at?: string
          device_slot?: number
          direction?: string
          id?: string
          is_ai_reply?: boolean
          media_url?: string | null
          message_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_is_active: { Args: { _id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
