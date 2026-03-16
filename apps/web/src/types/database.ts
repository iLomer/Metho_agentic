/**
 * Database type definitions for Supabase.
 *
 * Manually created to match the database schema.
 * Regenerate with `supabase gen types typescript` when the CLI is connected.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cli_device_codes: {
        Row: {
          id: string;
          device_code: string;
          user_code: string;
          user_id: string | null;
          expires_at: string;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_code: string;
          user_code: string;
          user_id?: string | null;
          expires_at: string;
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_code?: string;
          user_code?: string;
          user_id?: string | null;
          expires_at?: string;
          approved?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cli_device_codes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cli_tokens: {
        Row: {
          id: string;
          user_id: string;
          token_hash: string;
          label: string;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          label?: string;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          token_hash?: string;
          label?: string;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cli_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      github_connections: {
        Row: {
          id: string;
          user_id: string;
          github_user_id: number;
          github_username: string;
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          scopes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          github_user_id: number;
          github_username: string;
          access_token: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          github_user_id?: number;
          github_username?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "github_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: string;
          stack: string[];
          ai_tools: string[];
          connected_services: ConnectedService[];
          urls: ProjectUrls;
          monthly_cost: number;
          notes: string | null;
          is_public: boolean;
          slug: string | null;
          github_repo_full_name: string | null;
          has_meto_methodology: boolean;
          last_health_score: number | null;
          last_health_check_at: string | null;
          board_summary: BoardSummary;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          status?: string;
          stack?: string[];
          ai_tools?: string[];
          connected_services?: ConnectedService[];
          urls?: ProjectUrls;
          monthly_cost?: number;
          notes?: string | null;
          is_public?: boolean;
          slug?: string | null;
          github_repo_full_name?: string | null;
          has_meto_methodology?: boolean;
          last_health_score?: number | null;
          last_health_check_at?: string | null;
          board_summary?: BoardSummary;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          stack?: string[];
          ai_tools?: string[];
          connected_services?: ConnectedService[];
          urls?: ProjectUrls;
          monthly_cost?: number;
          notes?: string | null;
          is_public?: boolean;
          slug?: string | null;
          github_repo_full_name?: string | null;
          has_meto_methodology?: boolean;
          last_health_score?: number | null;
          last_health_check_at?: string | null;
          board_summary?: BoardSummary;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/**
 * Board summary stored in the projects.board_summary JSONB column.
 */
export interface BoardSummary {
  backlog: number;
  todo: number;
  "in-progress": number;
  "in-testing": number;
  done: number;
}

/**
 * A connected service entry stored in the projects.connected_services JSONB column.
 */
export interface ConnectedService {
  name: string;
  url?: string;
  monthly_cost?: number;
}

/**
 * URL entries stored in the projects.urls JSONB column.
 */
export interface ProjectUrls {
  live?: string;
  repo?: string;
  demo?: string;
  [key: string]: string | undefined;
}
