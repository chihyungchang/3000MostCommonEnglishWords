// Word data structure
export interface Word {
  id: string;
  word: string;
  zh?: string; // Chinese translation
  phonetic?: string;
  pos: string[];
  level: string; // CEFR level: A1, A2, B1, B2, C1, C2
  definition?: string;
  example?: string;
  etymology?: string;
  synonyms?: string[];
  imageUrl?: string;
  audioUrl?: string; // Audio pronunciation URL
}

// Learning progress for each word
export interface WordProgress {
  wordId: string;
  interval: number; // Days until next review
  easeFactor: number; // Difficulty factor (default 2.5)
  nextReviewDate: string; // ISO date string
  reviewCount: number;
  consecutiveCorrect: number;
  lastReviewDate?: string;
  status: 'new' | 'learning' | 'reviewing' | 'mastered';
}

// User response quality
export type ResponseQuality = 'forgot' | 'hard' | 'good' | 'easy';

// User statistics
export interface UserStats {
  streak: number;
  longestStreak: number;
  totalWords: number;
  masteredWords: number;
  todayLearned: number;
  todayReviewed: number;
  lastActiveDate: string;
  xp: number;
  level: number;
  achievements: string[];
  dailyGoal: number;
}

// Achievement definition
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
}

// Daily task
export interface DailyTask {
  id: string;
  name: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
}

// Study session
export interface StudySession {
  type: 'learn' | 'review';
  words: Word[];
  currentIndex: number;
  startTime: string;
  results: {
    wordId: string;
    quality: ResponseQuality;
    timeSpent: number;
  }[];
}
