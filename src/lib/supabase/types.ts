export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      word_progress: {
        Row: {
          id: string;
          user_id: string;
          word_id: string;
          interval: number;
          ease_factor: number;
          next_review_date: string;
          review_count: number;
          consecutive_correct: number;
          last_review_date: string | null;
          status: 'new' | 'learning' | 'reviewing' | 'mastered';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word_id: string;
          interval?: number;
          ease_factor?: number;
          next_review_date?: string;
          review_count?: number;
          consecutive_correct?: number;
          last_review_date?: string | null;
          status?: 'new' | 'learning' | 'reviewing' | 'mastered';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          interval?: number;
          ease_factor?: number;
          next_review_date?: string;
          review_count?: number;
          consecutive_correct?: number;
          last_review_date?: string | null;
          status?: 'new' | 'learning' | 'reviewing' | 'mastered';
          updated_at?: string;
        };
      };
      user_stats: {
        Row: {
          id: string;
          user_id: string;
          streak: number;
          longest_streak: number;
          total_words: number;
          mastered_words: number;
          today_learned: number;
          today_reviewed: number;
          last_active_date: string | null;
          xp: number;
          level: number;
          achievements: string[];
          daily_goal: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          streak?: number;
          longest_streak?: number;
          total_words?: number;
          mastered_words?: number;
          today_learned?: number;
          today_reviewed?: number;
          last_active_date?: string | null;
          xp?: number;
          level?: number;
          achievements?: string[];
          daily_goal?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          streak?: number;
          longest_streak?: number;
          total_words?: number;
          mastered_words?: number;
          today_learned?: number;
          today_reviewed?: number;
          last_active_date?: string | null;
          xp?: number;
          level?: number;
          achievements?: string[];
          daily_goal?: number;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: 'light' | 'dark' | 'eyecare';
          language: string;
          learn_order: 'new-first' | 'review-first';
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: 'light' | 'dark' | 'eyecare';
          language?: string;
          learn_order?: 'new-first' | 'review-first';
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          theme?: 'light' | 'dark' | 'eyecare';
          language?: string;
          learn_order?: 'new-first' | 'review-first';
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      daily_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_date: string;
          task_id: string;
          task_name: string;
          target: number;
          current: number;
          xp_reward: number;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_date?: string;
          task_id: string;
          task_name: string;
          target: number;
          current?: number;
          xp_reward: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          current?: number;
          completed?: boolean;
          updated_at?: string;
        };
      };
      word_definitions: {
        Row: {
          id: string;
          word: string;
          target_lang: string;
          phonetic: string | null;
          pos: string[] | null;
          definition: string;
          example: string | null;
          is_phrase: boolean;
          created_at: string;
          updated_at: string;
          hit_count: number;
        };
        Insert: {
          id?: string;
          word: string;
          target_lang?: string;
          phonetic?: string | null;
          pos?: string[] | null;
          definition: string;
          example?: string | null;
          is_phrase?: boolean;
          created_at?: string;
          updated_at?: string;
          hit_count?: number;
        };
        Update: {
          phonetic?: string | null;
          pos?: string[] | null;
          definition?: string;
          example?: string | null;
          is_phrase?: boolean;
          updated_at?: string;
          hit_count?: number;
        };
      };
      words: {
        Row: {
          id: string;
          word: string;
          pos: string[];
          level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
          phonetic: string | null;
          definition: string | null;
          example: string | null;
          synonyms: string[];
          audio: string | null;
          zh: string | null;
          meanings: unknown[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          word: string;
          pos?: string[];
          level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
          phonetic?: string | null;
          definition?: string | null;
          example?: string | null;
          synonyms?: string[];
          audio?: string | null;
          zh?: string | null;
          meanings?: unknown[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          word?: string;
          pos?: string[];
          level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
          phonetic?: string | null;
          definition?: string | null;
          example?: string | null;
          synonyms?: string[];
          audio?: string | null;
          zh?: string | null;
          meanings?: unknown[] | null;
          updated_at?: string;
        };
      };
    };
  };
}
