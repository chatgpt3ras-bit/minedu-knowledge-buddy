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
      chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          id: string
          token_count: number
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          id?: string
          token_count: number
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          autor: string | null
          created_at: string
          created_by: string
          extra_metadata: Json | null
          fecha_doc: string
          hash: string
          id: string
          proceso: Database["public"]["Enums"]["tipo_proceso"]
          ruta_storage: string
          tipo: Database["public"]["Enums"]["tipo_documento"]
          titulo: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          created_by: string
          extra_metadata?: Json | null
          fecha_doc: string
          hash: string
          id?: string
          proceso: Database["public"]["Enums"]["tipo_proceso"]
          ruta_storage: string
          tipo: Database["public"]["Enums"]["tipo_documento"]
          titulo: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          created_by?: string
          extra_metadata?: Json | null
          fecha_doc?: string
          hash?: string
          id?: string
          proceso?: Database["public"]["Enums"]["tipo_proceso"]
          ruta_storage?: string
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          id: string
          model: string
          vector: string
        }
        Insert: {
          chunk_id: string
          created_at?: string
          id?: string
          model?: string
          vector: string
        }
        Update: {
          chunk_id?: string
          created_at?: string
          id?: string
          model?: string
          vector?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: true
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comentario: string | null
          created_at: string
          id: string
          query_id: string
          rating: number
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          id?: string
          query_id: string
          rating: number
        }
        Update: {
          comentario?: string | null
          created_at?: string
          id?: string
          query_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis_daily: {
        Row: {
          avg_latency_ms: number
          consultas: number
          created_at: string
          docs_nuevos: number
          fecha: string
          precision_at_k_avg: number
          reuse_rate: number
        }
        Insert: {
          avg_latency_ms?: number
          consultas?: number
          created_at?: string
          docs_nuevos?: number
          fecha: string
          precision_at_k_avg?: number
          reuse_rate?: number
        }
        Update: {
          avg_latency_ms?: number
          consultas?: number
          created_at?: string
          docs_nuevos?: number
          fecha?: string
          precision_at_k_avg?: number
          reuse_rate?: number
        }
        Relationships: []
      }
      queries: {
        Row: {
          clicked_source_ids: string[] | null
          created_at: string
          id: string
          latency_ms: number | null
          precision_at_k: number | null
          pregunta: string
          respuesta: string | null
          top_k: number | null
          user_id: string
        }
        Insert: {
          clicked_source_ids?: string[] | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          precision_at_k?: number | null
          pregunta: string
          respuesta?: string | null
          top_k?: number | null
          user_id: string
        }
        Update: {
          clicked_source_ids?: string[] | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          precision_at_k?: number | null
          pregunta?: string
          respuesta?: string | null
          top_k?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      query_sources: {
        Row: {
          chunk_id: string
          created_at: string
          document_id: string
          id: string
          query_id: string
          rank: number
          score: number
        }
        Insert: {
          chunk_id: string
          created_at?: string
          document_id: string
          id?: string
          query_id: string
          rank: number
          score: number
        }
        Update: {
          chunk_id?: string
          created_at?: string
          document_id?: string
          id?: string
          query_id?: string
          rank?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "query_sources_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_sources_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_sources_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomias: {
        Row: {
          created_at: string
          id: string
          nombre: string
          valores: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          valores: string[]
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          valores?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_daily_kpis: {
        Args: { target_date?: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "analista"
      tipo_documento:
        | "resolucion"
        | "oficio"
        | "manual"
        | "memorando"
        | "reporte"
      tipo_proceso: "asignacion" | "evaluacion" | "capacitacion"
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
      app_role: ["admin", "analista"],
      tipo_documento: [
        "resolucion",
        "oficio",
        "manual",
        "memorando",
        "reporte",
      ],
      tipo_proceso: ["asignacion", "evaluacion", "capacitacion"],
    },
  },
} as const
