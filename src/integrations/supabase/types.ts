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
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          id: string
          storage_path: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          storage_path: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_meetings: {
        Row: {
          course_id: string
          meeting_link: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          meeting_link?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          meeting_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_meetings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          audience: Database["public"]["Enums"]["course_audience"]
          created_at: string
          description: string
          end_date: string | null
          hourly_rate: number
          hours_per_week: number
          id: string
          price: number
          schedule_slots: Json
          seats_total: number
          session_type: Database["public"]["Enums"]["course_session_type"]
          start_date: string | null
          teacher_id: string | null
          title: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["course_audience"]
          created_at?: string
          description?: string
          end_date?: string | null
          hourly_rate?: number
          hours_per_week?: number
          id?: string
          price?: number
          schedule_slots?: Json
          seats_total?: number
          session_type?: Database["public"]["Enums"]["course_session_type"]
          start_date?: string | null
          teacher_id?: string | null
          title: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["course_audience"]
          created_at?: string
          description?: string
          end_date?: string | null
          hourly_rate?: number
          hours_per_week?: number
          id?: string
          price?: number
          schedule_slots?: Json
          seats_total?: number
          session_type?: Database["public"]["Enums"]["course_session_type"]
          start_date?: string | null
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          course_id: string
          created_at: string
          feedback: string | null
          grade: string | null
          id: string
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          feedback?: string | null
          grade?: string | null
          id?: string
          storage_path: string
          title?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          feedback?: string | null
          grade?: string | null
          id?: string
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          level: string | null
          level_notes: string | null
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          level?: string | null
          level_notes?: string | null
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          level?: string | null
          level_notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          choices: Json
          correct_index: number
          id: string
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          choices?: Json
          correct_index?: number
          id?: string
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          choices?: Json
          correct_index?: number
          id?: string
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          description: string
          id: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string
          id?: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          course_id: string
          created_at: string
          guest_civil_id: string | null
          guest_name: string | null
          guest_phone: string | null
          guest_residence: string | null
          id: string
          payment_link: string | null
          slot: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          guest_civil_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guest_residence?: string | null
          id?: string
          payment_link?: string | null
          slot?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          guest_civil_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guest_residence?: string | null
          id?: string
          payment_link?: string | null
          slot?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          bank_info: string | null
          id: boolean
          logo_url: string | null
          site_name: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          bank_info?: string | null
          id?: boolean
          logo_url?: string | null
          site_name?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          bank_info?: string | null
          id?: boolean
          logo_url?: string | null
          site_name?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      course_seats_taken: { Args: { _course_id: string }; Returns: number }
      get_email_by_phone: { Args: { _phone: string }; Returns: string }
      get_payment_info: {
        Args: never
        Returns: {
          bank_info: string
          whatsapp_number: string
        }[]
      }
      get_public_site_settings: {
        Args: never
        Returns: {
          logo_url: string
          site_name: string
        }[]
      }
      get_quiz_questions_public: {
        Args: { _quiz_id: string }
        Returns: {
          choices: Json
          id: string
          position: number
          prompt: string
        }[]
      }
      get_teachers_public: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          full_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_teachers: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          email: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      submit_quiz_attempt: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: {
          score: number
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "student" | "teacher"
      course_audience: "teachers" | "general"
      course_session_type: "private" | "group"
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
      app_role: ["admin", "student", "teacher"],
      course_audience: ["teachers", "general"],
      course_session_type: ["private", "group"],
    },
  },
} as const
