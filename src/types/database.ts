export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'user';
export type WebSearchProvider = 'tavily' | 'websearchapi' | 'none';
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'perplexity';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
        };
      };
      app_settings: {
        Row: {
          id: string;
          default_provider: AIProvider;
          openai_api_key: string | null;
          anthropic_api_key: string | null;
          gemini_api_key: string | null;
          perplexity_api_key: string | null;
          openai_model: string;
          anthropic_model: string;
          gemini_model: string;
          perplexity_model: string;
          web_search_provider: WebSearchProvider;
          tavily_api_key: string | null;
          websearchapi_key: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          default_provider?: AIProvider;
          openai_api_key?: string | null;
          anthropic_api_key?: string | null;
          gemini_api_key?: string | null;
          perplexity_api_key?: string | null;
          openai_model?: string;
          anthropic_model?: string;
          gemini_model?: string;
          perplexity_model?: string;
          web_search_provider?: WebSearchProvider;
          tavily_api_key?: string | null;
          websearchapi_key?: string | null;
          updated_by?: string | null;
        };
        Update: {
          default_provider?: AIProvider;
          openai_api_key?: string | null;
          anthropic_api_key?: string | null;
          gemini_api_key?: string | null;
          perplexity_api_key?: string | null;
          openai_model?: string;
          anthropic_model?: string;
          gemini_model?: string;
          perplexity_model?: string;
          web_search_provider?: WebSearchProvider;
          tavily_api_key?: string | null;
          websearchapi_key?: string | null;
          updated_by?: string | null;
        };
      };
      search_history: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          provider: AIProvider;
          sentiment: string | null;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          provider: AIProvider;
          sentiment?: string | null;
          data?: Json | null;
        };
        Update: {
          company_name?: string;
          provider?: AIProvider;
          sentiment?: string | null;
          data?: Json | null;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          provider: AIProvider;
          sentiment: string | null;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          provider: AIProvider;
          sentiment?: string | null;
          data?: Json | null;
        };
        Update: {
          company_name?: string;
          provider?: AIProvider;
          sentiment?: string | null;
          data?: Json | null;
        };
      };
    };
  };
}
