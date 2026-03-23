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
      ai_usage: {
        Row: {
          created_at: string
          id: string
          month_year: string
          source: Database["public"]["Enums"]["document_source"]
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          source: Database["public"]["Enums"]["document_source"]
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          source?: Database["public"]["Enums"]["document_source"]
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      connected_bank_accounts: {
        Row: {
          account_label: string | null
          account_type: string | null
          bank_name: string
          created_at: string
          id: string
          last_sync_at: string | null
          provider: string
          provider_account_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          account_type?: string | null
          bank_name: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          provider_account_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          account_type?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          provider_account_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          label: string | null
          last_sync_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          error_message: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          raw_text: string | null
          source: Database["public"]["Enums"]["document_source"]
          status: Database["public"]["Enums"]["analysis_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          raw_text?: string | null
          source: Database["public"]["Enums"]["document_source"]
          status?: Database["public"]["Enums"]["analysis_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          raw_text?: string | null
          source?: Database["public"]["Enums"]["document_source"]
          status?: Database["public"]["Enums"]["analysis_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          abonnement_detecte: boolean | null
          articles: Json | null
          categorie: string | null
          commentaire: string | null
          created_at: string
          date_expense: string | null
          description: string | null
          devise: string | null
          document_id: string | null
          fournisseur: string | null
          id: string
          magasin: string | null
          montant_total: number | null
          moyen_paiement: string | null
          numero_facture: string | null
          raw_ai_response: Json | null
          recurrence: string | null
          source: Database["public"]["Enums"]["document_source"]
          source_id: string | null
          type_depense: string | null
          type_document: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abonnement_detecte?: boolean | null
          articles?: Json | null
          categorie?: string | null
          commentaire?: string | null
          created_at?: string
          date_expense?: string | null
          description?: string | null
          devise?: string | null
          document_id?: string | null
          fournisseur?: string | null
          id?: string
          magasin?: string | null
          montant_total?: number | null
          moyen_paiement?: string | null
          numero_facture?: string | null
          raw_ai_response?: Json | null
          recurrence?: string | null
          source: Database["public"]["Enums"]["document_source"]
          source_id?: string | null
          type_depense?: string | null
          type_document?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abonnement_detecte?: boolean | null
          articles?: Json | null
          categorie?: string | null
          commentaire?: string | null
          created_at?: string
          date_expense?: string | null
          description?: string | null
          devise?: string | null
          document_id?: string | null
          fournisseur?: string | null
          id?: string
          magasin?: string | null
          montant_total?: number | null
          moyen_paiement?: string | null
          numero_facture?: string | null
          raw_ai_response?: Json | null
          recurrence?: string | null
          source?: Database["public"]["Enums"]["document_source"]
          source_id?: string | null
          type_depense?: string | null
          type_document?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_tokens: {
        Row: {
          access_token: string
          connected_email_id: string | null
          created_at: string
          email: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_email_id?: string | null
          created_at?: string
          email: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_email_id?: string | null
          created_at?: string
          email?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_tokens_connected_email_id_fkey"
            columns: ["connected_email_id"]
            isOneToOne: false
            referencedRelation: "connected_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          owner_id: string
          relationship: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          owner_id: string
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          owner_id?: string
          relationship?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      microsoft_tokens: {
        Row: {
          access_token: string
          connected_email_id: string | null
          created_at: string
          email: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_email_id?: string | null
          created_at?: string
          email: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_email_id?: string | null
          created_at?: string
          email?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "microsoft_tokens_connected_email_id_fkey"
            columns: ["connected_email_id"]
            isOneToOne: false
            referencedRelation: "connected_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          categorie: string | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          detected_from_document_id: string | null
          devise: string | null
          fournisseur: string
          id: string
          montant: number | null
          recurrence: string | null
          source: Database["public"]["Enums"]["document_source"] | null
          statut: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categorie?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          detected_from_document_id?: string | null
          devise?: string | null
          fournisseur: string
          id?: string
          montant?: number | null
          recurrence?: string | null
          source?: Database["public"]["Enums"]["document_source"] | null
          statut?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categorie?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          detected_from_document_id?: string | null
          devise?: string | null
          fournisseur?: string
          id?: string
          montant?: number | null
          recurrence?: string | null
          source?: Database["public"]["Enums"]["document_source"] | null
          statut?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_detected_from_document_id_fkey"
            columns: ["detected_from_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: {
        Args: {
          _source: Database["public"]["Enums"]["document_source"]
          _user_id: string
        }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      analysis_status: "pending" | "processing" | "completed" | "failed"
      app_role: "admin" | "moderator" | "user"
      document_source: "receipt" | "invoice" | "email" | "bank"
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
      analysis_status: ["pending", "processing", "completed", "failed"],
      app_role: ["admin", "moderator", "user"],
      document_source: ["receipt", "invoice", "email", "bank"],
    },
  },
} as const
