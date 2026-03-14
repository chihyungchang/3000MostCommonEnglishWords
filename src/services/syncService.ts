import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { useSyncStore } from '../stores/syncStore';
import { useProgressStore } from '../stores/progressStore';
import { useUserStore } from '../stores/userStore';
import { useSettingsStore } from '../stores/themeStore';
import type { WordProgress, UserStats } from '../types';
import type { Database } from '../lib/supabase/types';

type ChangeType = 'progress' | 'stats' | 'settings';

interface PendingChange {
  type: ChangeType;
  data: unknown;
  timestamp: string;
}

type WordProgressInsert = Database['public']['Tables']['word_progress']['Insert'];
type WordProgressRow = Database['public']['Tables']['word_progress']['Row'];
type UserStatsInsert = Database['public']['Tables']['user_stats']['Insert'];
type UserStatsRow = Database['public']['Tables']['user_stats']['Row'];
type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];
type UserSettingsRow = Database['public']['Tables']['user_settings']['Row'];

class SyncService {
  private changeQueue: Map<string, PendingChange> = new Map();
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 2000;
  private currentUserId: string | null = null;

  setUserId(userId: string | null) {
    this.currentUserId = userId;
    useSyncStore.getState().setUserId(userId);
  }

  /**
   * Download data from cloud and apply to local stores
   * Called on login - cloud data takes priority
   */
  async downloadFromCloud(userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const syncStore = useSyncStore.getState();
    syncStore.setSyncing(true);
    syncStore.setSyncError(null);

    try {
      // Fetch all data from cloud in parallel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progressResult = await (supabase.from('word_progress') as any).select('*').eq('user_id', userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statsResult = await (supabase.from('user_stats') as any).select('*').eq('user_id', userId).single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settingsResult = await (supabase.from('user_settings') as any).select('*').eq('user_id', userId).single();

      // Apply word progress (cloud priority)
      if (progressResult.data && progressResult.data.length > 0) {
        const cloudProgress = this.convertCloudProgressToLocal(progressResult.data as WordProgressRow[]);
        useProgressStore.getState().setProgressFromCloud(cloudProgress);
      }

      // Apply user stats (cloud priority)
      if (statsResult.data) {
        const cloudStats = this.convertCloudStatsToLocal(statsResult.data as UserStatsRow);
        useUserStore.getState().setStatsFromCloud(cloudStats);
      }

      // Apply settings (cloud priority)
      if (settingsResult.data) {
        const cloudSettings = this.convertCloudSettingsToLocal(settingsResult.data as UserSettingsRow);
        useSettingsStore.getState().setSettingsFromCloud(cloudSettings);
      }

      syncStore.setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('Failed to download from cloud:', error);
      syncStore.setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      syncStore.setSyncing(false);
    }
  }

  /**
   * Upload local data to cloud (for initial migration or when cloud is empty)
   */
  async uploadAllToCloud(userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const syncStore = useSyncStore.getState();
    syncStore.setSyncing(true);

    try {
      const progressStore = useProgressStore.getState();
      const userStore = useUserStore.getState();
      const settingsStore = useSettingsStore.getState();

      // Upload word progress
      const progressMap = progressStore.progressMap;
      if (progressMap.size > 0) {
        const progressData = this.convertLocalProgressToCloud(userId, progressMap);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('word_progress') as any)
          .upsert(progressData, { onConflict: 'user_id,word_id' });
        if (error) throw error;
      }

      // Upload user stats
      const stats = userStore.stats;
      const statsData = this.convertLocalStatsToCloud(userId, stats);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: statsError } = await (supabase.from('user_stats') as any)
        .upsert(statsData, { onConflict: 'user_id' });
      if (statsError) throw statsError;

      // Upload settings
      const appSettings = settingsStore.settings;
      const settingsData = this.convertLocalSettingsToCloud(userId, {
        theme: appSettings.theme,
        language: appSettings.language,
        learnOrder: appSettings.learnOrder,
        onboardingCompleted: appSettings.onboardingCompleted,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: settingsError } = await (supabase.from('user_settings') as any)
        .upsert(settingsData, { onConflict: 'user_id' });
      if (settingsError) throw settingsError;

      syncStore.setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('Failed to upload to cloud:', error);
      syncStore.setSyncError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      syncStore.setSyncing(false);
    }
  }

  /**
   * Queue a change for upload (debounced)
   */
  queueChange(type: ChangeType, key: string, data: unknown): void {
    if (!isSupabaseConfigured || !this.currentUserId) return;

    this.changeQueue.set(`${type}:${key}`, {
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = setTimeout(() => this.flushChanges(), this.DEBOUNCE_MS);
  }

  /**
   * Flush all pending changes to cloud
   */
  async flushChanges(): Promise<void> {
    if (!isSupabaseConfigured || !this.currentUserId || this.changeQueue.size === 0) return;

    const syncStore = useSyncStore.getState();
    if (!syncStore.isOnline) return;

    const changes = Array.from(this.changeQueue.entries());
    this.changeQueue.clear();

    syncStore.setSyncing(true);

    try {
      // Group changes by type
      const progressChanges: WordProgressInsert[] = [];
      let statsChange: UserStatsInsert | null = null;
      let settingsChange: UserSettingsInsert | null = null;

      for (const [key, change] of changes) {
        const [type] = key.split(':');

        if (type === 'progress') {
          const progress = change.data as WordProgress;
          progressChanges.push({
            user_id: this.currentUserId,
            word_id: progress.wordId,
            interval: Math.floor(progress.interval),
            ease_factor: progress.easeFactor,
            next_review_date: progress.nextReviewDate,
            review_count: Math.floor(progress.reviewCount),
            consecutive_correct: Math.floor(progress.consecutiveCorrect),
            last_review_date: progress.lastReviewDate || null,
            status: progress.status,
          });
        } else if (type === 'stats') {
          const stats = change.data as UserStats;
          statsChange = this.convertLocalStatsToCloud(this.currentUserId, stats);
        } else if (type === 'settings') {
          const settings = change.data as {
            theme: 'light' | 'dark' | 'eyecare';
            language: string;
            learnOrder: 'new-first' | 'review-first';
            onboardingCompleted: boolean;
          };
          settingsChange = this.convertLocalSettingsToCloud(this.currentUserId, settings);
        }
      }

      // Batch upload
      if (progressChanges.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('word_progress') as any)
          .upsert(progressChanges, { onConflict: 'user_id,word_id' });
        if (error) throw error;
      }

      if (statsChange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('user_stats') as any)
          .upsert(statsChange, { onConflict: 'user_id' });
        if (error) throw error;
      }

      if (settingsChange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('user_settings') as any)
          .upsert(settingsChange, { onConflict: 'user_id' });
        if (error) throw error;
      }

      syncStore.setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('Failed to flush changes:', error);
      syncStore.setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      syncStore.setSyncing(false);
    }
  }

  /**
   * Cancel pending changes (called on sign out)
   */
  cancelPendingChanges(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    this.changeQueue.clear();
  }

  // Data conversion helpers
  private convertCloudProgressToLocal(cloudData: WordProgressRow[]): Record<string, WordProgress> {
    const result: Record<string, WordProgress> = {};
    for (const item of cloudData) {
      result[item.word_id] = {
        wordId: item.word_id,
        interval: item.interval,
        easeFactor: item.ease_factor,
        nextReviewDate: item.next_review_date,
        reviewCount: item.review_count,
        consecutiveCorrect: item.consecutive_correct,
        lastReviewDate: item.last_review_date || undefined,
        status: item.status,
      };
    }
    return result;
  }

  private convertLocalProgressToCloud(
    userId: string,
    progressMap: Map<string, WordProgress>
  ): WordProgressInsert[] {
    const result: WordProgressInsert[] = [];
    progressMap.forEach((progress) => {
      result.push({
        user_id: userId,
        word_id: progress.wordId,
        interval: Math.floor(progress.interval),
        ease_factor: progress.easeFactor,
        next_review_date: progress.nextReviewDate,
        review_count: Math.floor(progress.reviewCount),
        consecutive_correct: Math.floor(progress.consecutiveCorrect),
        last_review_date: progress.lastReviewDate || null,
        status: progress.status,
      });
    });
    return result;
  }

  private convertCloudStatsToLocal(cloudStats: UserStatsRow): UserStats {
    return {
      streak: cloudStats.streak,
      longestStreak: cloudStats.longest_streak,
      totalWords: cloudStats.total_words,
      masteredWords: cloudStats.mastered_words,
      todayLearned: cloudStats.today_learned,
      todayReviewed: cloudStats.today_reviewed,
      lastActiveDate: cloudStats.last_active_date || '',
      xp: cloudStats.xp,
      level: cloudStats.level,
      achievements: cloudStats.achievements || [],
      dailyGoal: cloudStats.daily_goal,
    };
  }

  private convertLocalStatsToCloud(userId: string, stats: UserStats): UserStatsInsert {
    return {
      user_id: userId,
      streak: Math.floor(stats.streak),
      longest_streak: Math.floor(stats.longestStreak),
      total_words: Math.floor(stats.totalWords),
      mastered_words: Math.floor(stats.masteredWords),
      today_learned: Math.floor(stats.todayLearned),
      today_reviewed: Math.floor(stats.todayReviewed),
      last_active_date: stats.lastActiveDate || null,
      xp: Math.floor(stats.xp),
      level: Math.floor(stats.level),
      achievements: stats.achievements,
      daily_goal: Math.floor(stats.dailyGoal),
    };
  }

  private convertCloudSettingsToLocal(cloudSettings: UserSettingsRow): {
    theme: 'light' | 'dark' | 'eyecare';
    language: string;
    learnOrder: 'new-first' | 'review-first';
    onboardingCompleted: boolean;
  } {
    return {
      theme: cloudSettings.theme,
      language: cloudSettings.language,
      learnOrder: cloudSettings.learn_order,
      onboardingCompleted: cloudSettings.onboarding_completed,
    };
  }

  private convertLocalSettingsToCloud(
    userId: string,
    settings: {
      theme: 'light' | 'dark' | 'eyecare';
      language: string;
      learnOrder: 'new-first' | 'review-first';
      onboardingCompleted: boolean;
    }
  ): UserSettingsInsert {
    return {
      user_id: userId,
      theme: settings.theme,
      language: settings.language,
      learn_order: settings.learnOrder,
      onboarding_completed: settings.onboardingCompleted,
    };
  }
}

export const syncService = new SyncService();
