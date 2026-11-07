export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          role: Database['public']['Enums']['user_role'];
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          role?: Database['public']['Enums']['user_role'];
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
        };
        Relationships: [];
      };
      sites: {
        Row: {
          address: string;
          created_at: string;
          created_by: string;
          id: string;
          name: string;
        };
        Insert: {
          address: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          name: string;
        };
        Update: {
          address?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sites_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_status_history: {
        Row: {
          changed_by: string;
          comment: string | null;
          created_at: string;
          from_status: Database['public']['Enums']['task_status'] | null;
          id: number;
          task_id: string;
          to_status: Database['public']['Enums']['task_status'];
        };
        Insert: {
          changed_by: string;
          comment?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['task_status'] | null;
          id?: never;
          task_id: string;
          to_status: Database['public']['Enums']['task_status'];
        };
        Update: {
          changed_by?: string;
          comment?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['task_status'] | null;
          id?: never;
          task_id?: string;
          to_status?: Database['public']['Enums']['task_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'task_status_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_status_history_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          site_id: string;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee_id: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          site_id: string;
          status?: Database['public']['Enums']['task_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          site_id?: string;
          status?: Database['public']['Enums']['task_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: false;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      change_task_status: {
        Args: {
          p_comment?: string | null;
          p_task_id: string;
          p_to: Database['public']['Enums']['task_status'];
        };
        Returns: {
          assignee_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          site_id: string;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'tasks';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      task_status: 'new' | 'in_progress' | 'review' | 'accepted' | 'rework';
      user_role: 'manager' | 'executor';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

export const Constants = {
  public: {
    Enums: {
      task_status: ['new', 'in_progress', 'review', 'accepted', 'rework'],
      user_role: ['manager', 'executor'],
    },
  },
} as const;
