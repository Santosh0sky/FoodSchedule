import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn("Supabase not configured - running in local mode")
  console.log("To enable cross-platform sync, set these environment variables:")
  console.log("- NEXT_PUBLIC_SUPABASE_URL")
  console.log("- NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null

export type Database = {
  public: {
    Tables: {
      meals: {
        Row: {
          id: string
          date: string
          time: string
          food: string
          user_id: string | null
          device_id: string | null
          created_at: string
          updated_at: string
          synced_at: string | null
        }
        Insert: {
          id?: string
          date: string
          time: string
          food: string
          user_id?: string | null
          device_id?: string | null
          created_at?: string
          updated_at?: string
          synced_at?: string | null
        }
        Update: {
          id?: string
          date?: string
          time?: string
          food?: string
          user_id?: string | null
          device_id?: string | null
          created_at?: string
          updated_at?: string
          synced_at?: string | null
        }
      }
      sync_codes: {
        Row: {
          id: string
          code: string
          device_name: string
          created_at: string
          expires_at: string
          used: boolean
        }
        Insert: {
          id?: string
          code: string
          device_name: string
          created_at?: string
          expires_at: string
          used?: boolean
        }
        Update: {
          id?: string
          code?: string
          device_name?: string
          created_at?: string
          expires_at?: string
          used?: boolean
        }
      }
    }
  }
}
