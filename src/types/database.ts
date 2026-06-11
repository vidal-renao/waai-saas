export type WaaiWorkspaceRole =
  | "owner"
  | "admin"
  | "agent_manager"
  | "human_agent"
  | "viewer";

// ── Fase 5 union types ────────────────────────────────────────────────────────
export type WaaiWhatsappConnectionStatus =
  | "draft"
  | "pending_verification"
  | "active"
  | "failed"
  | "suspended"
  | "disconnected"
  | "archived";

export type WaaiWhatsappProvider = "mock" | "whapi" | "meta";

export type WaaiWhatsappMessageDirection = "inbound" | "outbound";

export type WaaiWhatsappMessageType =
  | "text"
  | "image"
  | "audio"
  | "document"
  | "unknown";

export type WaaiWhatsappDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "received";

export type WaaiWebhookEventDirection =
  | "inbound"
  | "outbound"
  | "status"
  | "unknown";

export type WaaiWebhookProcessingStatus =
  | "received"
  | "processing"
  | "processed"
  | "ignored"
  | "failed";

// ── Fase 6 union types ────────────────────────────────────────────────────────
export type WaaiLeadStatus =
  | "new"
  | "qualified"
  | "contacted"
  | "won"
  | "lost"
  | "archived";

export type WaaiLeadPriority = "low" | "medium" | "high" | "urgent";

export type WaaiLeadSourceChannel = "whatsapp" | "sandbox" | "web" | "manual";

export type WaaiHandoffStatus =
  | "requested"
  | "active"
  | "resolved"
  | "canceled";

export type WaaiHandoffRequestedBy =
  | "agent"
  | "user"
  | "customer"
  | "system";

export type WaaiHandoffTriggerType =
  | "customer_request"
  | "low_confidence"
  | "angry_customer"
  | "urgent_request"
  | "sensitive_topic"
  | "manual"
  | "system_rule";

export type WaaiAssignmentStatus =
  | "active"
  | "resolved"
  | "transferred"
  | "closed";

export type WaaiNoteVisibility = "internal" | "owner_admin";

export type WaaiLeadDetectionRunStatus = "success" | "no_lead" | "error";

export type WaaiAgentStatus = "draft" | "active" | "paused" | "archived";

export type WaaiConversationStatus =
  | "open"
  | "closed"
  | "handoff_required"
  | "archived";

export type WaaiConversationChannel = "sandbox" | "whatsapp" | "web";

export type WaaiMessageRole = "user" | "assistant" | "system" | "tool";

export type WaaiAgentRunStatus = "success" | "error" | "canceled";

export type WaaiKnowledgeDocumentStatus =
  | "draft"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type WaaiKnowledgeSourceType =
  | "manual"
  | "txt"
  | "markdown"
  | "faq"
  | "pdf";

export type WaaiWorkspaceStatus = "active" | "paused" | "trial" | "cancelled";

export type WaaiPlanId =
  | "free"
  | "starter"
  | "pro"
  | "agency"
  | "enterprise";

// Exact shape required by @supabase/supabase-js generics.
// Each table must have Row, Insert, Update, Relationships.
// Insert/Update cannot be `never` — use empty mapped type `{ [K in never]: never }` for append-only tables.
export interface Database {
  public: {
    Tables: {
      waai_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          business_type: string | null;
          country: string;
          timezone: string;
          status: WaaiWorkspaceStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          business_type?: string | null;
          country?: string;
          timezone?: string;
          status?: WaaiWorkspaceStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          business_type?: string | null;
          country?: string;
          timezone?: string;
          status?: WaaiWorkspaceStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WaaiWorkspaceRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WaaiWorkspaceRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          role?: WaaiWorkspaceRole;
        };
        Relationships: [];
      };
      waai_plans: {
        Row: {
          id: WaaiPlanId;
          name: string;
          agents_limit: number;
          messages_limit: number;
          documents_limit: number;
          whatsapp_numbers_limit: number;
          human_handoff_enabled: boolean;
          monthly_price_usd: number;
          sort_order: number;
          created_at: string;
        };
        // Plans are seeded only — disallow insert/update from app layer
        Insert: { [K in never]: never };
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          plan_id: WaaiPlanId;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          plan_id?: WaaiPlanId;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_id?: WaaiPlanId;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_usage_events: {
        Row: {
          id: string;
          workspace_id: string;
          event_type: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_type: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_usage_counters: {
        Row: {
          id: string;
          workspace_id: string;
          period_month: string;
          messages_sent: number;
          documents_uploaded: number;
          agents_created: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          period_month: string;
          messages_sent?: number;
          documents_uploaded?: number;
          agents_created?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          messages_sent?: number;
          documents_uploaded?: number;
          agents_created?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_agents: {
        Row: {
          id: string;
          workspace_id: string;
          created_by: string | null;
          name: string;
          description: string | null;
          status: WaaiAgentStatus;
          primary_language: string;
          channel: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          created_by?: string | null;
          name: string;
          description?: string | null;
          status?: WaaiAgentStatus;
          primary_language?: string;
          channel?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: WaaiAgentStatus;
          primary_language?: string;
          channel?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_agent_configs: {
        Row: {
          id: string;
          agent_id: string;
          business_name: string;
          industry: string;
          country: string | null;
          city: string | null;
          timezone: string | null;
          tone: string;
          primary_goal: string;
          target_audience: string | null;
          business_description: string | null;
          opening_message: string | null;
          fallback_message: string | null;
          human_handoff_message: string | null;
          working_hours: Record<string, unknown>;
          service_areas: unknown[];
          services: unknown[];
          faqs: unknown[];
          lead_capture_fields: unknown[];
          handoff_rules: unknown[];
          restrictions: unknown[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          business_name: string;
          industry: string;
          country?: string | null;
          city?: string | null;
          timezone?: string | null;
          tone?: string;
          primary_goal: string;
          target_audience?: string | null;
          business_description?: string | null;
          opening_message?: string | null;
          fallback_message?: string | null;
          human_handoff_message?: string | null;
          working_hours?: Record<string, unknown>;
          service_areas?: unknown[];
          services?: unknown[];
          faqs?: unknown[];
          lead_capture_fields?: unknown[];
          handoff_rules?: unknown[];
          restrictions?: unknown[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          industry?: string;
          country?: string | null;
          city?: string | null;
          timezone?: string | null;
          tone?: string;
          primary_goal?: string;
          target_audience?: string | null;
          business_description?: string | null;
          opening_message?: string | null;
          fallback_message?: string | null;
          human_handoff_message?: string | null;
          working_hours?: Record<string, unknown>;
          service_areas?: unknown[];
          services?: unknown[];
          faqs?: unknown[];
          lead_capture_fields?: unknown[];
          handoff_rules?: unknown[];
          restrictions?: unknown[];
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_agent_questions: {
        Row: {
          id: string;
          question_key: string;
          question_text: string;
          description: string | null;
          input_type: string;
          section: string;
          required: boolean;
          options: unknown[];
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        // Seed only — no app-layer insert/update
        Insert: { [K in never]: never };
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_agent_prompt_versions: {
        Row: {
          id: string;
          agent_id: string;
          version: number;
          system_prompt: string;
          prompt_metadata: Record<string, unknown>;
          is_active: boolean;
          generated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          version: number;
          system_prompt: string;
          prompt_metadata?: Record<string, unknown>;
          is_active?: boolean;
          generated_by?: string | null;
          created_at?: string;
        };
        Update: {
          is_active?: boolean;
        };
        Relationships: [];
      };
      waai_agent_events: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string | null;
          actor_user_id: string | null;
          event_type: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id?: string | null;
          actor_user_id?: string | null;
          event_type: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_audit_logs: {
        Row: {
          id: string;
          workspace_id: string | null;
          actor_user_id: string | null;
          event_type: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          actor_user_id?: string | null;
          event_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Immutable — no updates
        Update: { [K in never]: never };
        Relationships: [];
      };
      // ── Fase 3 ───────────────────────────────────────────────────────────────
      waai_conversations: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string;
          channel: WaaiConversationChannel;
          external_conversation_id: string | null;
          status: WaaiConversationStatus;
          title: string | null;
          last_message_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id: string;
          channel?: WaaiConversationChannel;
          external_conversation_id?: string | null;
          status?: WaaiConversationStatus;
          title?: string | null;
          last_message_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          channel?: WaaiConversationChannel;
          external_conversation_id?: string | null;
          status?: WaaiConversationStatus;
          title?: string | null;
          last_message_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          workspace_id: string;
          agent_id: string | null;
          role: WaaiMessageRole;
          content: string;
          channel: WaaiConversationChannel;
          provider_message_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          workspace_id: string;
          agent_id?: string | null;
          role: WaaiMessageRole;
          content: string;
          channel?: WaaiConversationChannel;
          provider_message_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only — no updates
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_agent_runs: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string;
          conversation_id: string | null;
          prompt_version_id: string | null;
          provider: string;
          model: string;
          input_tokens: number | null;
          output_tokens: number | null;
          total_tokens: number | null;
          estimated_cost_cents: number | null;
          status: WaaiAgentRunStatus;
          error_message: string | null;
          latency_ms: number | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id: string;
          conversation_id?: string | null;
          prompt_version_id?: string | null;
          provider: string;
          model: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          total_tokens?: number | null;
          estimated_cost_cents?: number | null;
          status: WaaiAgentRunStatus;
          error_message?: string | null;
          latency_ms?: number | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only — no updates
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_sandbox_sessions: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string;
          conversation_id: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id: string;
          conversation_id: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          updated_at?: string;
        };
        Relationships: [];
      };
      // ── Fase 4 ───────────────────────────────────────────────────────────────
      waai_knowledge_documents: {
        Row: {
          id: string;
          workspace_id: string;
          uploaded_by: string | null;
          title: string;
          description: string | null;
          source_type: WaaiKnowledgeSourceType;
          status: WaaiKnowledgeDocumentStatus;
          file_name: string | null;
          file_path: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          text_content: string | null;
          metadata: Record<string, unknown>;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          uploaded_by?: string | null;
          title: string;
          description?: string | null;
          source_type?: WaaiKnowledgeSourceType;
          status?: WaaiKnowledgeDocumentStatus;
          file_name?: string | null;
          file_path?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          text_content?: string | null;
          metadata?: Record<string, unknown>;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          source_type?: WaaiKnowledgeSourceType;
          status?: WaaiKnowledgeDocumentStatus;
          file_name?: string | null;
          file_path?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          text_content?: string | null;
          metadata?: Record<string, unknown>;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_knowledge_chunks: {
        Row: {
          id: string;
          workspace_id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count: number | null;
          embedding: number[] | null;
          embedding_model: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count?: number | null;
          embedding?: number[] | null;
          embedding_model?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only — delete + re-insert on re-process
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_agent_knowledge_sources: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string;
          document_id: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id: string;
          document_id: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          is_active?: boolean;
        };
        Relationships: [];
      };
      waai_knowledge_events: {
        Row: {
          id: string;
          workspace_id: string;
          document_id: string | null;
          agent_id: string | null;
          actor_user_id: string | null;
          event_type: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          document_id?: string | null;
          agent_id?: string | null;
          actor_user_id?: string | null;
          event_type: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only
        Update: { [K in never]: never };
        Relationships: [];
      };
      // ── Fase 5 ───────────────────────────────────────────────────────────────
      waai_whatsapp_connections: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string | null;
          provider: WaaiWhatsappProvider;
          display_name: string | null;
          phone_number: string | null;
          phone_number_id: string | null;
          external_instance_id: string | null;
          status: WaaiWhatsappConnectionStatus;
          webhook_url: string | null;
          webhook_secret_hash: string | null;
          provider_metadata: Record<string, unknown>;
          last_connected_at: string | null;
          last_error_message: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id?: string | null;
          provider?: WaaiWhatsappProvider;
          display_name?: string | null;
          phone_number?: string | null;
          phone_number_id?: string | null;
          external_instance_id?: string | null;
          status?: WaaiWhatsappConnectionStatus;
          webhook_url?: string | null;
          webhook_secret_hash?: string | null;
          provider_metadata?: Record<string, unknown>;
          last_connected_at?: string | null;
          last_error_message?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          agent_id?: string | null;
          provider?: WaaiWhatsappProvider;
          display_name?: string | null;
          phone_number?: string | null;
          phone_number_id?: string | null;
          external_instance_id?: string | null;
          status?: WaaiWhatsappConnectionStatus;
          webhook_url?: string | null;
          webhook_secret_hash?: string | null;
          provider_metadata?: Record<string, unknown>;
          last_connected_at?: string | null;
          last_error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_whatsapp_webhook_events: {
        Row: {
          id: string;
          workspace_id: string | null;
          connection_id: string | null;
          provider: string;
          event_type: string;
          external_event_id: string | null;
          external_message_id: string | null;
          direction: WaaiWebhookEventDirection;
          raw_payload: Record<string, unknown>;
          normalized_payload: Record<string, unknown>;
          processing_status: WaaiWebhookProcessingStatus;
          error_message: string | null;
          received_at: string;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          connection_id?: string | null;
          provider: string;
          event_type: string;
          external_event_id?: string | null;
          external_message_id?: string | null;
          direction?: WaaiWebhookEventDirection;
          raw_payload?: Record<string, unknown>;
          normalized_payload?: Record<string, unknown>;
          processing_status?: WaaiWebhookProcessingStatus;
          error_message?: string | null;
          received_at?: string;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          processing_status?: WaaiWebhookProcessingStatus;
          error_message?: string | null;
          processed_at?: string | null;
          normalized_payload?: Record<string, unknown>;
          workspace_id?: string | null;
          connection_id?: string | null;
        };
        Relationships: [];
      };
      waai_whatsapp_messages: {
        Row: {
          id: string;
          workspace_id: string;
          connection_id: string;
          conversation_id: string | null;
          message_id: string | null;
          external_message_id: string | null;
          external_chat_id: string;
          from_number: string | null;
          to_number: string | null;
          direction: WaaiWhatsappMessageDirection;
          message_type: WaaiWhatsappMessageType;
          text_content: string | null;
          delivery_status: WaaiWhatsappDeliveryStatus;
          provider_metadata: Record<string, unknown>;
          sent_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          failed_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          connection_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          external_message_id?: string | null;
          external_chat_id: string;
          from_number?: string | null;
          to_number?: string | null;
          direction: WaaiWhatsappMessageDirection;
          message_type?: WaaiWhatsappMessageType;
          text_content?: string | null;
          delivery_status?: WaaiWhatsappDeliveryStatus;
          provider_metadata?: Record<string, unknown>;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          conversation_id?: string | null;
          message_id?: string | null;
          delivery_status?: WaaiWhatsappDeliveryStatus;
          provider_metadata?: Record<string, unknown>;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_whatsapp_connection_events: {
        Row: {
          id: string;
          workspace_id: string;
          connection_id: string | null;
          actor_user_id: string | null;
          event_type: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          connection_id?: string | null;
          actor_user_id?: string | null;
          event_type: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only
        Update: { [K in never]: never };
        Relationships: [];
      };
      // ── Fase 6 ───────────────────────────────────────────────────────────────
      waai_leads: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string | null;
          conversation_id: string | null;
          source_channel: WaaiLeadSourceChannel;
          status: WaaiLeadStatus;
          priority: WaaiLeadPriority;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          company_name: string | null;
          requested_service: string | null;
          location: string | null;
          desired_date: string | null;
          budget: string | null;
          urgency: string | null;
          summary: string | null;
          extracted_data: Record<string, unknown>;
          confidence_score: number | null;
          assigned_to: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id?: string | null;
          conversation_id?: string | null;
          source_channel?: WaaiLeadSourceChannel;
          status?: WaaiLeadStatus;
          priority?: WaaiLeadPriority;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          company_name?: string | null;
          requested_service?: string | null;
          location?: string | null;
          desired_date?: string | null;
          budget?: string | null;
          urgency?: string | null;
          summary?: string | null;
          extracted_data?: Record<string, unknown>;
          confidence_score?: number | null;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          agent_id?: string | null;
          conversation_id?: string | null;
          source_channel?: WaaiLeadSourceChannel;
          status?: WaaiLeadStatus;
          priority?: WaaiLeadPriority;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          company_name?: string | null;
          requested_service?: string | null;
          location?: string | null;
          desired_date?: string | null;
          budget?: string | null;
          urgency?: string | null;
          summary?: string | null;
          extracted_data?: Record<string, unknown>;
          confidence_score?: number | null;
          assigned_to?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_lead_events: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          actor_user_id: string | null;
          event_type: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          actor_user_id?: string | null;
          event_type: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        // Append-only
        Update: { [K in never]: never };
        Relationships: [];
      };
      waai_conversation_assignments: {
        Row: {
          id: string;
          workspace_id: string;
          conversation_id: string;
          assigned_to: string | null;
          assigned_by: string | null;
          status: WaaiAssignmentStatus;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          conversation_id: string;
          assigned_to?: string | null;
          assigned_by?: string | null;
          status?: WaaiAssignmentStatus;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: WaaiAssignmentStatus;
          assigned_to?: string | null;
          reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_handoffs: {
        Row: {
          id: string;
          workspace_id: string;
          conversation_id: string;
          agent_id: string | null;
          requested_by: WaaiHandoffRequestedBy;
          status: WaaiHandoffStatus;
          reason: string | null;
          trigger_type: WaaiHandoffTriggerType | null;
          automation_paused: boolean;
          assigned_to: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          conversation_id: string;
          agent_id?: string | null;
          requested_by?: WaaiHandoffRequestedBy;
          status?: WaaiHandoffStatus;
          reason?: string | null;
          trigger_type?: WaaiHandoffTriggerType | null;
          automation_paused?: boolean;
          assigned_to?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: WaaiHandoffStatus;
          reason?: string | null;
          trigger_type?: WaaiHandoffTriggerType | null;
          automation_paused?: boolean;
          assigned_to?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_internal_notes: {
        Row: {
          id: string;
          workspace_id: string;
          conversation_id: string | null;
          lead_id: string | null;
          author_user_id: string | null;
          note: string;
          visibility: WaaiNoteVisibility;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          conversation_id?: string | null;
          lead_id?: string | null;
          author_user_id?: string | null;
          note: string;
          visibility?: WaaiNoteVisibility;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          note?: string;
          visibility?: WaaiNoteVisibility;
          updated_at?: string;
        };
        Relationships: [];
      };
      waai_lead_detection_runs: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string | null;
          conversation_id: string;
          lead_id: string | null;
          provider: string | null;
          model: string | null;
          status: WaaiLeadDetectionRunStatus;
          input_messages_count: number | null;
          confidence_score: number | null;
          detected_intent: string | null;
          extracted_data: Record<string, unknown>;
          error_message: string | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id?: string | null;
          conversation_id: string;
          lead_id?: string | null;
          provider?: string | null;
          model?: string | null;
          status: WaaiLeadDetectionRunStatus;
          input_messages_count?: number | null;
          confidence_score?: number | null;
          detected_intent?: string | null;
          extracted_data?: Record<string, unknown>;
          error_message?: string | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        // Append-only
        Update: { [K in never]: never };
        Relationships: [];
      };
      // ── Fase 8 tables ──────────────────────────────────────
      waai_system_health_events: {
        Row: {
          id: string;
          workspace_id: string | null;
          severity: string;
          event_type: string;
          source: string;
          entity_type: string | null;
          entity_id: string | null;
          message: string;
          metadata: Record<string, unknown>;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          severity: string;
          event_type: string;
          source: string;
          entity_type?: string | null;
          entity_id?: string | null;
          message: string;
          metadata?: Record<string, unknown>;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      waai_billing_events: {
        Row: {
          id: string;
          workspace_id: string;
          subscription_id: string | null;
          event_type: string;
          provider: string | null;
          provider_event_id: string | null;
          amount_cents: number | null;
          currency: string;
          status: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          subscription_id?: string | null;
          event_type: string;
          provider?: string | null;
          provider_event_id?: string | null;
          amount_cents?: number | null;
          currency?: string;
          status?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: { status?: string };
        Relationships: [];
      };
      waai_ai_cost_snapshots: {
        Row: {
          id: string;
          workspace_id: string;
          period_start: string;
          period_end: string;
          provider: string | null;
          model: string | null;
          total_runs: number;
          total_input_tokens: number;
          total_output_tokens: number;
          estimated_cost_cents: number;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          period_start: string;
          period_end: string;
          provider?: string | null;
          model?: string | null;
          total_runs?: number;
          total_input_tokens?: number;
          total_output_tokens?: number;
          estimated_cost_cents?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: { [K in never]: never };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      waai_is_workspace_member: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      waai_get_workspace_role: {
        Args: { p_workspace_id: string };
        Returns: WaaiWorkspaceRole;
      };
      waai_is_workspace_admin: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      waai_increment_message_counter: {
        Args: { p_workspace_id: string };
        Returns: undefined;
      };
      waai_check_message_limit: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      waai_can_create_agent: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      waai_get_agent_count: {
        Args: { p_workspace_id: string };
        Returns: number;
      };
      waai_get_next_prompt_version: {
        Args: { p_agent_id: string };
        Returns: number;
      };
      waai_increment_agent_counter: {
        Args: { p_workspace_id: string };
        Returns: undefined;
      };
      waai_log_agent_event: {
        Args: {
          p_workspace_id: string;
          p_agent_id: string;
          p_actor_user_id: string;
          p_event_type: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      // ── Fase 3 RPCs ──────────────────────────────────────────────────────────
      waai_get_conversation_workspace: {
        Args: { p_conversation_id: string };
        Returns: string | null;
      };
      waai_update_conversation_last_message: {
        Args: { p_conversation_id: string };
        Returns: undefined;
      };
      waai_can_use_message: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      // ── Fase 4 RPCs ──────────────────────────────────────────────────────────
      waai_can_upload_document: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      waai_get_document_count: {
        Args: { p_workspace_id: string };
        Returns: number;
      };
      waai_increment_document_counter: {
        Args: { p_workspace_id: string };
        Returns: undefined;
      };
      waai_match_agent_knowledge: {
        Args: {
          query_embedding: number[];
          match_agent_id: string;
          match_workspace_id: string;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: Array<{
          chunk_id: string;
          document_id: string;
          content: string;
          similarity: number;
          metadata: Record<string, unknown>;
        }>;
      };
      waai_log_knowledge_event: {
        Args: {
          p_workspace_id: string;
          p_document_id: string | null;
          p_agent_id: string | null;
          p_actor_user_id: string | null;
          p_event_type: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      // ── Fase 5 RPCs ──────────────────────────────────────────────────────────
      waai_can_create_whatsapp_connection: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      waai_get_whatsapp_connection_count: {
        Args: { p_workspace_id: string };
        Returns: number;
      };
      waai_log_whatsapp_connection_event: {
        Args: {
          p_workspace_id: string;
          p_connection_id: string | null;
          p_actor_user_id: string | null;
          p_event_type: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      waai_mark_webhook_event_processed: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      waai_mark_webhook_event_failed: {
        Args: { p_event_id: string; p_error_message: string };
        Returns: undefined;
      };
      // ── Fase 6 RPCs ──────────────────────────────────────────────────────────
      waai_has_active_handoff: {
        Args: { p_conversation_id: string };
        Returns: boolean;
      };
      waai_log_lead_event: {
        Args: {
          p_workspace_id: string;
          p_lead_id: string;
          p_actor_user_id: string | null;
          p_event_type: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      waai_pause_conversation_automation: {
        Args: { p_conversation_id: string; p_reason?: string };
        Returns: undefined;
      };
      waai_resume_conversation_automation: {
        Args: { p_conversation_id: string };
        Returns: undefined;
      };
      waai_assign_conversation: {
        Args: {
          p_workspace_id: string;
          p_conversation_id: string;
          p_assigned_to: string;
          p_assigned_by: string;
          p_reason?: string;
        };
        Returns: string;
      };
      // ── Fase 7 RPCs ──────────────────────────────────────────────────────────
      waai_get_workspace_analytics: {
        Args: {
          p_workspace_id: string;
          p_from?: string;
          p_to?: string;
        };
        Returns: Record<string, unknown>;
      };
      waai_get_agent_performance: {
        Args: {
          p_workspace_id: string;
          p_from?: string;
          p_to?: string;
        };
        Returns: Record<string, unknown>;
      };
      waai_get_operational_alerts: {
        Args: { p_workspace_id: string };
        Returns: Record<string, unknown>;
      };
      waai_increment_usage_counter: {
        Args: { p_workspace_id: string; p_period_month: string; p_field: string };
        Returns: void;
      };
      waai_get_production_health: {
        Args: { p_workspace_id: string };
        Returns: Record<string, unknown>;
      };
      waai_get_billing_readiness_snapshot: {
        Args: { p_workspace_id: string };
        Returns: Record<string, unknown>;
      };
      waai_get_ai_cost_snapshot: {
        Args: { p_workspace_id: string; p_from: string; p_to: string };
        Returns: Record<string, unknown>;
      };
      waai_log_system_health_event: {
        Args: {
          p_workspace_id: string;
          p_severity: string;
          p_event_type: string;
          p_source: string;
          p_message: string;
          p_entity_type?: string | null;
          p_entity_id?: string | null;
          p_metadata?: Record<string, unknown>;
        };
        Returns: string;
      };
      waai_log_billing_event: {
        Args: {
          p_workspace_id: string;
          p_subscription_id?: string | null;
          p_event_type: string;
          p_provider?: string | null;
          p_provider_event_id?: string | null;
          p_amount_cents?: number | null;
          p_currency?: string;
          p_status?: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: string;
      };
    };
    Enums: {
      waai_workspace_role: WaaiWorkspaceRole;
      waai_agent_status: WaaiAgentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

// ── Fase 2 convenience row types ────────────────────────────────────────────
export type WaaiAgent =
  Database["public"]["Tables"]["waai_agents"]["Row"];
export type WaaiAgentConfig =
  Database["public"]["Tables"]["waai_agent_configs"]["Row"];
export type WaaiAgentQuestion =
  Database["public"]["Tables"]["waai_agent_questions"]["Row"];
export type WaaiAgentPromptVersion =
  Database["public"]["Tables"]["waai_agent_prompt_versions"]["Row"];
export type WaaiAgentEvent =
  Database["public"]["Tables"]["waai_agent_events"]["Row"];

// ── Fase 4 convenience row types ────────────────────────────────────────────
export type WaaiKnowledgeDocument =
  Database["public"]["Tables"]["waai_knowledge_documents"]["Row"];
export type WaaiKnowledgeChunk =
  Database["public"]["Tables"]["waai_knowledge_chunks"]["Row"];
export type WaaiAgentKnowledgeSource =
  Database["public"]["Tables"]["waai_agent_knowledge_sources"]["Row"];
export type WaaiKnowledgeEvent =
  Database["public"]["Tables"]["waai_knowledge_events"]["Row"];

// ── Fase 3 convenience row types ────────────────────────────────────────────
export type WaaiConversation =
  Database["public"]["Tables"]["waai_conversations"]["Row"];
export type WaaiMessage =
  Database["public"]["Tables"]["waai_messages"]["Row"];
export type WaaiAgentRun =
  Database["public"]["Tables"]["waai_agent_runs"]["Row"];
export type WaaiSandboxSession =
  Database["public"]["Tables"]["waai_sandbox_sessions"]["Row"];

// ── Fase 5 convenience row types ────────────────────────────────────────────
export type WaaiWhatsappConnection =
  Database["public"]["Tables"]["waai_whatsapp_connections"]["Row"];
export type WaaiWhatsappWebhookEvent =
  Database["public"]["Tables"]["waai_whatsapp_webhook_events"]["Row"];
export type WaaiWhatsappMessage =
  Database["public"]["Tables"]["waai_whatsapp_messages"]["Row"];
export type WaaiWhatsappConnectionEvent =
  Database["public"]["Tables"]["waai_whatsapp_connection_events"]["Row"];

// ── Fase 6 convenience row types ────────────────────────────────────────────
export type WaaiLead =
  Database["public"]["Tables"]["waai_leads"]["Row"];
export type WaaiLeadEvent =
  Database["public"]["Tables"]["waai_lead_events"]["Row"];
export type WaaiConversationAssignment =
  Database["public"]["Tables"]["waai_conversation_assignments"]["Row"];
export type WaaiHandoff =
  Database["public"]["Tables"]["waai_handoffs"]["Row"];
export type WaaiInternalNote =
  Database["public"]["Tables"]["waai_internal_notes"]["Row"];
export type WaaiLeadDetectionRun =
  Database["public"]["Tables"]["waai_lead_detection_runs"]["Row"];

// ── Fase 8 convenience row types ────────────────────────────────────────────
export type WaaiSystemHealthEvent =
  Database["public"]["Tables"]["waai_system_health_events"]["Row"];
export type WaaiAiCostSnapshot =
  Database["public"]["Tables"]["waai_ai_cost_snapshots"]["Row"];
export type WaaiBillingEvent =
  Database["public"]["Tables"]["waai_billing_events"]["Row"];

// ── Fase 1 convenience row types ────────────────────────────────────────────
export type WaaiProfile =
  Database["public"]["Tables"]["waai_profiles"]["Row"];
export type WaaiWorkspace =
  Database["public"]["Tables"]["waai_workspaces"]["Row"];
export type WaaiWorkspaceMember =
  Database["public"]["Tables"]["waai_workspace_members"]["Row"];
export type WaaiPlan =
  Database["public"]["Tables"]["waai_plans"]["Row"];
export type WaaiSubscription =
  Database["public"]["Tables"]["waai_subscriptions"]["Row"];
export type WaaiUsageEvent =
  Database["public"]["Tables"]["waai_usage_events"]["Row"];
export type WaaiUsageCounter =
  Database["public"]["Tables"]["waai_usage_counters"]["Row"];
export type WaaiAuditLog =
  Database["public"]["Tables"]["waai_audit_logs"]["Row"];
