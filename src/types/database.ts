export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'student' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'student' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'student' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          is_published?: boolean
          created_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          bunny_video_id: string
          bunny_thumbnail: string | null
          duration_seconds: number | null
          order_index: number
          require_signed_url: boolean
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          bunny_video_id: string
          bunny_thumbnail?: string | null
          duration_seconds?: number | null
          order_index?: number
          require_signed_url?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          bunny_video_id?: string
          bunny_thumbnail?: string | null
          duration_seconds?: number | null
          order_index?: number
          require_signed_url?: boolean
          created_at?: string
        }
      }
      enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          enrolled_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          enrolled_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          enrolled_at?: string
          expires_at?: string | null
        }
      }
      watch_history: {
        Row: {
          id: string
          user_id: string
          video_id: string
          progress_seconds: number
          is_completed: boolean
          last_watched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          progress_seconds?: number
          is_completed?: boolean
          last_watched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          progress_seconds?: number
          is_completed?: boolean
          last_watched_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type Enrollment = Database['public']['Tables']['enrollments']['Row']
export type WatchHistory = Database['public']['Tables']['watch_history']['Row']
