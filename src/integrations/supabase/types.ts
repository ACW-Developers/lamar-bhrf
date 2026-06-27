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
      admissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          insurance_info: string | null
          intake_date: string
          intake_form: Json
          notes: string | null
          presenting_problem: string | null
          referral_source: string | null
          resident_id: string
          status: Database["public"]["Enums"]["admission_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_info?: string | null
          intake_date?: string
          intake_form?: Json
          notes?: string | null
          presenting_problem?: string | null
          referral_source?: string | null
          resident_id: string
          status?: Database["public"]["Enums"]["admission_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_info?: string | null
          intake_date?: string
          intake_form?: Json
          notes?: string | null
          presenting_problem?: string | null
          referral_source?: string | null
          resident_id?: string
          status?: Database["public"]["Enums"]["admission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_date: string
          assessment_type: string
          created_at: string
          created_by: string | null
          findings: string | null
          id: string
          intake_data: Json
          recommendations: string | null
          resident_id: string
          risk_level: string | null
          signed_at: string | null
          signed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_date?: string
          assessment_type: string
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          intake_data?: Json
          recommendations?: string | null
          resident_id: string
          risk_level?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_date?: string
          assessment_type?: string
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          intake_data?: Json
          recommendations?: string | null
          resident_id?: string
          risk_level?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          changes: Json | null
          created_at: string
          id: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      daily_observations: {
        Row: {
          adl_support: string | null
          behavior: string | null
          created_at: string
          id: string
          mood: string | null
          notes: string | null
          observation_date: string
          participation: string | null
          recorded_by: string | null
          resident_id: string
          wellness_check: boolean | null
        }
        Insert: {
          adl_support?: string | null
          behavior?: string | null
          created_at?: string
          id?: string
          mood?: string | null
          notes?: string | null
          observation_date?: string
          participation?: string | null
          recorded_by?: string | null
          resident_id: string
          wellness_check?: boolean | null
        }
        Update: {
          adl_support?: string | null
          behavior?: string | null
          created_at?: string
          id?: string
          mood?: string | null
          notes?: string | null
          observation_date?: string
          participation?: string | null
          recorded_by?: string | null
          resident_id?: string
          wellness_check?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_observations_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_observations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      discharges: {
        Row: {
          actual_date: string | null
          aftercare_plan: string | null
          created_at: string
          created_by: string | null
          destination: string | null
          discharge_type: string | null
          follow_up_completed: boolean
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          planned_date: string | null
          resident_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          aftercare_plan?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          discharge_type?: string | null
          follow_up_completed?: boolean
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          planned_date?: string | null
          resident_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          aftercare_plan?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          discharge_type?: string | null
          follow_up_completed?: boolean
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          planned_date?: string | null
          resident_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discharges_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      family_contacts: {
        Row: {
          can_visit: boolean
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_emergency: boolean
          name: string
          notes: string | null
          phone: string | null
          relationship: string | null
          resident_id: string
          updated_at: string
        }
        Insert: {
          can_visit?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_emergency?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          resident_id: string
          updated_at?: string
        }
        Update: {
          can_visit?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_emergency?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          resident_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_contacts_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      group_attendance: {
        Row: {
          attended: boolean | null
          group_session_id: string
          id: string
          notes: string | null
          participation_level: string | null
          resident_id: string
        }
        Insert: {
          attended?: boolean | null
          group_session_id: string
          id?: string
          notes?: string | null
          participation_level?: string | null
          resident_id: string
        }
        Update: {
          attended?: boolean | null
          group_session_id?: string
          id?: string
          notes?: string | null
          participation_level?: string | null
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_attendance_group_session_id_fkey"
            columns: ["group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_attendance_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          created_at: string
          facilitator_id: string | null
          id: string
          location: string | null
          notes: string | null
          session_date: string
          topic: string
        }
        Insert: {
          created_at?: string
          facilitator_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          session_date?: string
          topic: string
        }
        Update: {
          created_at?: string
          facilitator_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          session_date?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_facilitator_id_fkey"
            columns: ["facilitator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          actions_taken: string | null
          created_at: string
          description: string
          id: string
          incident_date: string
          incident_type: string
          reported_by: string | null
          resident_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          updated_at: string
        }
        Insert: {
          actions_taken?: string | null
          created_at?: string
          description: string
          id?: string
          incident_date?: string
          incident_type: string
          reported_by?: string | null
          resident_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          updated_at?: string
        }
        Update: {
          actions_taken?: string | null
          created_at?: string
          description?: string
          id?: string
          incident_date?: string
          incident_type?: string
          reported_by?: string | null
          resident_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          administered_at: string | null
          created_at: string
          dosage: string | null
          id: string
          medication_name: string
          notes: string | null
          recorded_by: string | null
          refusal_reason: string | null
          resident_id: string
          scheduled_time: string | null
          status: string
        }
        Insert: {
          administered_at?: string | null
          created_at?: string
          dosage?: string | null
          id?: string
          medication_name: string
          notes?: string | null
          recorded_by?: string | null
          refusal_reason?: string | null
          resident_id: string
          scheduled_time?: string | null
          status?: string
        }
        Update: {
          administered_at?: string | null
          created_at?: string
          dosage?: string | null
          id?: string
          medication_name?: string
          notes?: string | null
          recorded_by?: string | null
          refusal_reason?: string | null
          resident_id?: string
          scheduled_time?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          on_duty: boolean | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          on_duty?: boolean | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          on_duty?: boolean | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progress_notes: {
        Row: {
          author_id: string | null
          author_role: Database["public"]["Enums"]["app_role"] | null
          content: string
          created_at: string
          id: string
          note_type: string
          resident_id: string
          signed_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_role?: Database["public"]["Enums"]["app_role"] | null
          content: string
          created_at?: string
          id?: string
          note_type: string
          resident_id: string
          signed_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_role?: Database["public"]["Enums"]["app_role"] | null
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          resident_id?: string
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_notes_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_documents: {
        Row: {
          category: string | null
          created_at: string
          id: string
          mime_type: string | null
          name: string
          resident_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          resident_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          resident_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resident_documents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          address: string | null
          admission_date: string | null
          assigned_bhp: string | null
          assigned_bht: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          discharge_date: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          mrn: string
          notes: string | null
          phone: string | null
          primary_diagnosis: string | null
          room_number: string | null
          status: Database["public"]["Enums"]["resident_status"]
          substance_history: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          assigned_bhp?: string | null
          assigned_bht?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          discharge_date?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          mrn?: string
          notes?: string | null
          phone?: string | null
          primary_diagnosis?: string | null
          room_number?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          substance_history?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          assigned_bhp?: string | null
          assigned_bht?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          discharge_date?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          mrn?: string
          notes?: string | null
          phone?: string | null
          primary_diagnosis?: string | null
          room_number?: string | null
          status?: Database["public"]["Enums"]["resident_status"]
          substance_history?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_assigned_bhp_fkey"
            columns: ["assigned_bhp"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_assigned_bht_fkey"
            columns: ["assigned_bht"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          handoff_notes: string | null
          id: string
          notes: string | null
          shift_date: string
          shift_role: string | null
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          handoff_notes?: string | null
          id?: string
          notes?: string | null
          shift_date: string
          shift_role?: string | null
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          handoff_notes?: string | null
          id?: string
          notes?: string | null
          shift_date?: string
          shift_role?: string | null
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supervision_logs: {
        Row: {
          action_items: string | null
          created_at: string
          feedback: string | null
          id: string
          session_date: string
          signed_off_at: string | null
          supervisee_id: string | null
          supervisor_id: string | null
          topics_discussed: string | null
        }
        Insert: {
          action_items?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          session_date?: string
          signed_off_at?: string | null
          supervisee_id?: string | null
          supervisor_id?: string | null
          topics_discussed?: string | null
        }
        Update: {
          action_items?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          session_date?: string
          signed_off_at?: string | null
          supervisee_id?: string | null
          supervisor_id?: string | null
          topics_discussed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervision_logs_supervisee_id_fkey"
            columns: ["supervisee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervision_logs_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      therapy_sessions: {
        Row: {
          clinical_notes: string | null
          created_at: string
          duration_minutes: number | null
          follow_up_plan: string | null
          id: string
          objectives_addressed: string | null
          recommendations: string | null
          resident_id: string
          session_date: string
          therapist_id: string | null
        }
        Insert: {
          clinical_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          follow_up_plan?: string | null
          id?: string
          objectives_addressed?: string | null
          recommendations?: string | null
          resident_id: string
          session_date?: string
          therapist_id?: string | null
        }
        Update: {
          clinical_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          follow_up_plan?: string | null
          id?: string
          objectives_addressed?: string | null
          recommendations?: string | null
          resident_id?: string
          session_date?: string
          therapist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapy_sessions_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transportation_logs: {
        Row: {
          appointment_type: string | null
          created_at: string
          departure_time: string | null
          destination: string | null
          driver_id: string | null
          id: string
          notes: string | null
          outcome: string | null
          resident_id: string
          return_time: string | null
          vehicle: string | null
        }
        Insert: {
          appointment_type?: string | null
          created_at?: string
          departure_time?: string | null
          destination?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          resident_id: string
          return_time?: string | null
          vehicle?: string | null
        }
        Update: {
          appointment_type?: string | null
          created_at?: string
          departure_time?: string | null
          destination?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          resident_id?: string
          return_time?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transportation_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transportation_logs_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_goals: {
        Row: {
          achieved: boolean | null
          created_at: string
          goal: string
          id: string
          intervention: string | null
          objective: string | null
          progress_percent: number | null
          target_date: string | null
          treatment_plan_id: string
        }
        Insert: {
          achieved?: boolean | null
          created_at?: string
          goal: string
          id?: string
          intervention?: string | null
          objective?: string | null
          progress_percent?: number | null
          target_date?: string | null
          treatment_plan_id: string
        }
        Update: {
          achieved?: boolean | null
          created_at?: string
          goal?: string
          id?: string
          intervention?: string | null
          objective?: string | null
          progress_percent?: number | null
          target_date?: string | null
          treatment_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_goals_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          id: string
          plan_date: string
          problem_summary: string | null
          resident_id: string
          review_date: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          plan_date?: string
          problem_summary?: string | null
          resident_id: string
          review_date?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          plan_date?: string
          problem_summary?: string | null
          resident_id?: string
          review_date?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
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
      visitor_logs: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          logged_by: string | null
          notes: string | null
          relationship: string | null
          resident_id: string
          visitor_name: string
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          relationship?: string | null
          resident_id: string
          visitor_name: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          relationship?: string | null
          resident_id?: string
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_logs_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      admission_status: "pending" | "approved" | "rejected" | "completed"
      app_role: "administrator" | "bhp" | "bht" | "bhpp"
      approval_status: "draft" | "pending_review" | "approved" | "rejected"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_status: "reported" | "investigating" | "resolved" | "closed"
      resident_status:
        | "active"
        | "discharged"
        | "on_leave"
        | "pending_admission"
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
      admission_status: ["pending", "approved", "rejected", "completed"],
      app_role: ["administrator", "bhp", "bht", "bhpp"],
      approval_status: ["draft", "pending_review", "approved", "rejected"],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_status: ["reported", "investigating", "resolved", "closed"],
      resident_status: [
        "active",
        "discharged",
        "on_leave",
        "pending_admission",
      ],
    },
  },
} as const
