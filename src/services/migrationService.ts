import type { SupabaseClient } from '@supabase/supabase-js';
import type { WordProgress, UserStats, DailyTask } from '../types';

const STORAGE_PREFIX = 'vocab_';

const KEYS = {
  WORD_PROGRESS: 'word_progress',
  USER_STATS: 'user_stats',
  DAILY_TASKS: 'daily_tasks',
  APP_SETTINGS: 'app_settings',
  MIGRATION_COMPLETED: 'migration_completed',
};

interface MigrationData {
  wordProgress: Record<string, WordProgress>;
  userStats: UserStats | null;
  dailyTasks: DailyTask[];
  appSettings: {
    theme: string;
    language: string;
    learnOrder: string;
    onboardingCompleted: boolean;
  } | null;
}

export class MigrationService {
  static hasLocalData(): boolean {
    const progressData = localStorage.getItem(STORAGE_PREFIX + KEYS.WORD_PROGRESS);
    const statsData = localStorage.getItem(STORAGE_PREFIX + KEYS.USER_STATS);
    return !!(progressData || statsData);
  }

  static isMigrationCompleted(userId: string): boolean {
    const key = `${STORAGE_PREFIX}${KEYS.MIGRATION_COMPLETED}_${userId}`;
    return localStorage.getItem(key) === 'true';
  }

  static readLocalData(): MigrationData {
    const getItem = <T>(key: string, defaultValue: T): T => {
      try {
        const item = localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    };

    return {
      wordProgress: getItem<Record<string, WordProgress>>(KEYS.WORD_PROGRESS, {}),
      userStats: getItem<UserStats | null>(KEYS.USER_STATS, null),
      dailyTasks: getItem<DailyTask[]>(KEYS.DAILY_TASKS, []),
      appSettings: getItem(KEYS.APP_SETTINGS, null),
    };
  }

  static async migrate(
    supabase: SupabaseClient,
    userId: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<{ success: boolean; migratedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      const localData = this.readLocalData();
      const progressEntries = Object.entries(localData.wordProgress);
      const totalItems = progressEntries.length + 2;

      onProgress?.(0, '正在迁移单词进度...');

      // 批量插入单词进度
      const wordProgressData = progressEntries.map(([wordId, progress]) => ({
        user_id: userId,
        word_id: wordId,
        interval: progress.interval,
        ease_factor: progress.easeFactor,
        next_review_date: progress.nextReviewDate,
        review_count: progress.reviewCount,
        consecutive_correct: progress.consecutiveCorrect,
        last_review_date: progress.lastReviewDate || null,
        status: progress.status,
      }));

      if (wordProgressData.length > 0) {
        const { error } = await supabase
          .from('word_progress')
          .upsert(wordProgressData, { onConflict: 'user_id,word_id' });

        if (error) {
          errors.push(`Failed to migrate word progress: ${error.message}`);
        } else {
          migratedCount += wordProgressData.length;
        }
      }

      onProgress?.(((progressEntries.length + 1) / totalItems) * 100, '正在迁移用户统计...');

      // 迁移用户统计
      if (localData.userStats) {
        const stats = localData.userStats;
        const { error } = await supabase.from('user_stats').upsert(
          {
            user_id: userId,
            streak: stats.streak,
            longest_streak: stats.longestStreak,
            total_words: stats.totalWords,
            mastered_words: stats.masteredWords,
            today_learned: stats.todayLearned,
            today_reviewed: stats.todayReviewed,
            last_active_date: stats.lastActiveDate || null,
            xp: stats.xp,
            level: stats.level,
            achievements: stats.achievements,
            daily_goal: stats.dailyGoal,
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          errors.push(`Failed to migrate user stats: ${error.message}`);
        } else {
          migratedCount++;
        }
      }

      onProgress?.(((progressEntries.length + 2) / totalItems) * 100, '正在迁移用户设置...');

      // 迁移用户设置
      if (localData.appSettings) {
        const settings = localData.appSettings;
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: userId,
            theme: settings.theme,
            language: settings.language,
            learn_order: settings.learnOrder,
            onboarding_completed: settings.onboardingCompleted,
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          errors.push(`Failed to migrate settings: ${error.message}`);
        } else {
          migratedCount++;
        }
      }

      if (errors.length === 0) {
        localStorage.setItem(`${STORAGE_PREFIX}${KEYS.MIGRATION_COMPLETED}_${userId}`, 'true');
      }

      onProgress?.(100, '迁移完成');

      return {
        success: errors.length === 0,
        migratedCount,
        errors,
      };
    } catch (err) {
      errors.push(`Migration failed: ${err}`);
      return { success: false, migratedCount, errors };
    }
  }

  static clearLocalData(): void {
    const keysToRemove = [
      KEYS.WORD_PROGRESS,
      KEYS.USER_STATS,
      KEYS.DAILY_TASKS,
      KEYS.APP_SETTINGS,
      'tasks_date',
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(STORAGE_PREFIX + key);
    });
  }
}
