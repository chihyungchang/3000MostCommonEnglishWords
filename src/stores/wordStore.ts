import { create } from 'zustand';
import type { Word } from '../types';

interface RawWord {
  word: string;
  pos: string[];
  level: string;
  phonetic?: string;
  definition?: string;
  example?: string;
  synonyms?: string[];
  audio?: string;
  zh?: string;
}

interface LevelIndex {
  [level: string]: number;
}

interface WordState {
  words: Word[];
  wordMap: Map<string, Word>;
  loadedLevels: Set<string>;
  levelIndex: LevelIndex | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadWords: () => Promise<void>;
  loadLevel: (level: string) => Promise<void>;
  getWord: (id: string) => Word | undefined;
  getWordsByLevel: (level: string) => Word[];
}

// Transform raw word data to include IDs
function transformWords(rawWords: RawWord[], levelPrefix: string): Word[] {
  return rawWords.map((w, index) => ({
    id: `${levelPrefix}_${index}`,
    word: w.word,
    pos: w.pos,
    level: w.level,
    phonetic: w.phonetic,
    definition: w.definition,
    example: w.example,
    synonyms: w.synonyms,
    audioUrl: w.audio,
    zh: w.zh,
  }));
}

export const useWordStore = create<WordState>((set, get) => ({
  words: [],
  wordMap: new Map(),
  loadedLevels: new Set(),
  levelIndex: null,
  isLoaded: false,
  isLoading: false,
  error: null,

  loadLevel: async (level: string) => {
    const state = get();
    if (state.loadedLevels.has(level)) return;

    try {
      const response = await fetch(`/data/${level}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${level} words`);
      }
      const rawWords: RawWord[] = await response.json();
      const newWords = transformWords(rawWords, level);

      set((state) => {
        const updatedWords = [...state.words, ...newWords];
        const updatedMap = new Map(state.wordMap);
        newWords.forEach((w) => updatedMap.set(w.id, w));
        const updatedLevels = new Set(state.loadedLevels);
        updatedLevels.add(level);

        return {
          words: updatedWords,
          wordMap: updatedMap,
          loadedLevels: updatedLevels,
        };
      });
    } catch (error) {
      console.error(`Error loading ${level}:`, error);
    }
  },

  loadWords: async () => {
    const state = get();
    if (state.isLoaded || state.isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Load index first
      const indexResponse = await fetch('/data/index.json');
      if (!indexResponse.ok) {
        throw new Error('Failed to load word index');
      }
      const levelIndex: LevelIndex = await indexResponse.json();

      set({ levelIndex });

      // Load A1 first (most common starting level)
      await get().loadLevel('A1');

      set({
        isLoaded: true,
        isLoading: false,
      });

      // Preload other levels in background
      const otherLevels = ['A2', 'B1', 'B2'].filter((l) => l in levelIndex);
      for (const level of otherLevels) {
        // Small delay to not block the main thread
        setTimeout(() => get().loadLevel(level), 100);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  getWord: (id: string) => {
    return get().wordMap.get(id);
  },

  getWordsByLevel: (level: string) => {
    return get().words.filter((w) => w.level === level);
  },
}));
