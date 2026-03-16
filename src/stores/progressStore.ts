import { create } from 'zustand';
import type { WordProgress, ResponseQuality } from '../types';
import {
  calculateNextReview,
  createInitialProgress,
  getWordsToReview,
  getNewWords,
} from '../algorithms/sm2';
import { getItem, setItem, removeItem } from '../utils/storage';
import { syncService } from '../services/syncService';

const STORAGE_KEY = 'word_progress';
const MIGRATION_KEY = 'progress_migration_v1';

// Fix status bug: words with reviewCount > 0 should have 'reviewing' status
function fixProgressStatus(progress: WordProgress): WordProgress {
  if (progress.reviewCount > 0 && progress.status === 'learning') {
    return { ...progress, status: 'reviewing' };
  }
  return progress;
}

// Migrate old word_X format to new LEVEL_INDEX format
async function migrateOldProgress(
  oldProgress: Record<string, WordProgress>
): Promise<Record<string, WordProgress>> {
  // Check if any keys use old format (word_X instead of A1_X)
  const oldFormatKeys = Object.keys(oldProgress).filter(key => key.startsWith('word_'));
  if (oldFormatKeys.length === 0) {
    // Still fix status bug for new format entries
    const fixedProgress: Record<string, WordProgress> = {};
    for (const [id, progress] of Object.entries(oldProgress)) {
      fixedProgress[id] = fixProgressStatus(progress);
    }
    return fixedProgress;
  }

  console.log('[Progress] Migrating old format:', oldFormatKeys.length, 'entries');

  try {
    // Fetch word index to build mapping
    const response = await fetch('/data/word-index.json');
    if (!response.ok) {
      console.error('[Progress] Failed to fetch word index for migration');
      return oldProgress;
    }

    const wordIndex: { id: string; word: string; level: string }[] = await response.json();

    // Build mapping: sequential index -> new ID
    // Old format was word_0, word_1, ... which mapped to sequential position
    const newProgress: Record<string, WordProgress> = {};

    for (const [oldId, progress] of Object.entries(oldProgress)) {
      if (oldId.startsWith('word_')) {
        const index = parseInt(oldId.replace('word_', ''), 10);
        if (index >= 0 && index < wordIndex.length) {
          const newId = wordIndex[index].id;
          // Fix status bug during migration
          const fixedProgress = fixProgressStatus({ ...progress, wordId: newId });
          newProgress[newId] = fixedProgress;
          console.log(`[Progress] Migrated ${oldId} -> ${newId}`);
        }
      } else {
        // Keep new format entries as-is, but fix status bug
        newProgress[oldId] = fixProgressStatus(progress);
      }
    }

    console.log('[Progress] Migration complete:', Object.keys(newProgress).length, 'entries');
    return newProgress;
  } catch (error) {
    console.error('[Progress] Migration failed:', error);
    return oldProgress;
  }
}

interface ProgressState {
  progressMap: Map<string, WordProgress>;
  isLoaded: boolean;

  // Actions
  loadProgress: () => Promise<void>;
  saveProgress: () => void;
  getProgress: (wordId: string) => WordProgress | undefined;
  updateProgress: (wordId: string, quality: ResponseQuality) => void;
  startLearning: (wordId: string) => void;

  // Cloud sync actions
  setProgressFromCloud: (data: Record<string, WordProgress>) => void;

  // Queries
  getWordsToReview: (limit?: number) => string[];
  getNewWords: (allWordIds: string[], limit?: number) => string[];
  getStats: () => {
    total: number;
    mastered: number;
    learning: number;
    reviewing: number;
  };
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progressMap: new Map(),
  isLoaded: false,

  loadProgress: async () => {
    let saved = getItem<Record<string, WordProgress>>(STORAGE_KEY, {});

    // If progress is empty but migration flag is set, reset the flag
    // (this can happen if user clears localStorage but flag persists)
    const alreadyMigrated = localStorage.getItem(MIGRATION_KEY) === 'done';
    if (Object.keys(saved).length === 0 && alreadyMigrated) {
      console.log('[Progress] Resetting migration flag (progress is empty)');
      localStorage.removeItem(MIGRATION_KEY);
    }

    // Check if migration is needed (old word_X format)
    const needsMigration = Object.keys(saved).some(key => key.startsWith('word_'));

    if (needsMigration) {
      console.log('[Progress] Starting migration from old format...');
      saved = await migrateOldProgress(saved);
      // Save migrated data
      setItem(STORAGE_KEY, saved);
      localStorage.setItem(MIGRATION_KEY, 'done');
    }

    const progressMap = new Map(Object.entries(saved));
    // Debug logging
    const reviewingCount = Array.from(progressMap.values()).filter(p => p.status === 'reviewing').length;
    const learningCount = Array.from(progressMap.values()).filter(p => p.status === 'learning').length;
    console.log('[Progress] Loaded:', {
      totalEntries: progressMap.size,
      reviewing: reviewingCount,
      learning: learningCount,
      firstFew: Array.from(progressMap.keys()).slice(0, 5),
    });
    set({ progressMap, isLoaded: true });
  },

  saveProgress: () => {
    const { progressMap } = get();
    const obj = Object.fromEntries(progressMap);
    setItem(STORAGE_KEY, obj);
  },

  getProgress: (wordId: string) => {
    return get().progressMap.get(wordId);
  },

  updateProgress: (wordId: string, quality: ResponseQuality) => {
    const { progressMap, saveProgress } = get();
    let progress = progressMap.get(wordId);

    if (!progress) {
      progress = createInitialProgress(wordId);
    }

    const updates = calculateNextReview(progress, quality);
    const newProgress = { ...progress, ...updates };

    progressMap.set(wordId, newProgress);
    set({ progressMap: new Map(progressMap) });
    saveProgress();

    // Sync to cloud
    syncService.queueChange('progress', wordId, newProgress);
  },

  startLearning: (wordId: string) => {
    const { progressMap, saveProgress } = get();

    if (!progressMap.has(wordId)) {
      const progress = createInitialProgress(wordId);
      progress.status = 'learning';
      progressMap.set(wordId, progress);
      set({ progressMap: new Map(progressMap) });
      saveProgress();

      // Sync to cloud
      syncService.queueChange('progress', wordId, progress);
    }
  },

  setProgressFromCloud: (data: Record<string, WordProgress>) => {
    const progressMap = new Map(Object.entries(data));
    set({ progressMap, isLoaded: true });
    // Save to localStorage for offline access
    const obj = Object.fromEntries(progressMap);
    setItem(STORAGE_KEY, obj);
    // Clear learn session so it will be re-created with cloud data
    removeItem('learn_session');
  },

  getWordsToReview: (limit = 50) => {
    return getWordsToReview(get().progressMap, limit);
  },

  getNewWords: (allWordIds: string[], limit = 20) => {
    return getNewWords(allWordIds, get().progressMap, limit);
  },

  getStats: () => {
    const { progressMap } = get();
    let mastered = 0;
    let learning = 0;
    let reviewing = 0;
    let studied = 0; // Words that have been actually studied (reviewCount > 0)

    progressMap.forEach((progress) => {
      // Only count words that have been reviewed at least once
      if (progress.reviewCount > 0) {
        studied++;
      }

      switch (progress.status) {
        case 'mastered':
          mastered++;
          break;
        case 'learning':
          // Only count as learning if actually studied
          if (progress.reviewCount > 0) {
            learning++;
          }
          break;
        case 'reviewing':
          reviewing++;
          break;
      }
    });

    return {
      total: studied, // Changed from progressMap.size to only count studied words
      mastered,
      learning,
      reviewing,
    };
  },
}));
