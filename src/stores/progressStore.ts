import { create } from 'zustand';
import type { WordProgress, ResponseQuality } from '../types';
import {
  calculateNextReview,
  createInitialProgress,
  getWordsToReview,
  getNewWords,
} from '../algorithms/sm2';
import { getItem, setItem } from '../utils/storage';
import { syncService } from '../services/syncService';

const STORAGE_KEY = 'word_progress';

interface ProgressState {
  progressMap: Map<string, WordProgress>;
  isLoaded: boolean;

  // Actions
  loadProgress: () => void;
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

  loadProgress: () => {
    const saved = getItem<Record<string, WordProgress>>(STORAGE_KEY, {});
    const progressMap = new Map(Object.entries(saved));
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
