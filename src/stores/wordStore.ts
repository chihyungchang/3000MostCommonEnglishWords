import { create } from 'zustand';
import type { Word } from '../types';

interface WordIndex {
  id: string;
  word: string;
  level: string;
}

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

interface WordState {
  // Lightweight index (always loaded)
  wordIndex: WordIndex[];
  // Full word data cache
  wordCache: Map<string, Word>;
  // Loaded level data
  levelData: Map<string, RawWord[]>;

  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  loadWords: () => Promise<void>;
  getWord: (id: string) => Word | undefined;
  getWordsByLevel: (level: string) => Word[];
  getWordIds: () => string[];
  getWordIdsByLevel: (level: string) => string[];
  ensureWordsLoaded: (ids: string[]) => Promise<void>;
  getTotalWordCount: () => number;
  getWordCountByLevel: (level: string) => number;
}

const CACHE_KEY = 'word_cache_v1';

// Load cache from localStorage
function loadLocalCache(): Map<string, Word> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return new Map(Object.entries(parsed));
    }
  } catch {
    // Ignore cache errors
  }
  return new Map();
}

// Save cache to localStorage (max 100 words)
function saveLocalCache(cache: Map<string, Word>) {
  try {
    const entries = Array.from(cache.entries()).slice(-100);
    const obj = Object.fromEntries(entries);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage errors
  }
}

export const useWordStore = create<WordState>((set, get) => ({
  wordIndex: [],
  wordCache: loadLocalCache(),
  levelData: new Map(),
  isLoaded: false,
  isLoading: false,
  error: null,

  loadWords: async () => {
    const state = get();
    if (state.isLoaded || state.isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Load lightweight index only (20KB gzipped)
      const response = await fetch('/data/word-index.json');
      if (!response.ok) {
        throw new Error('Failed to load word index');
      }
      const wordIndex: WordIndex[] = await response.json();

      set({
        wordIndex,
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Ensure specific words are loaded (fetch level data if needed)
  ensureWordsLoaded: async (ids: string[]) => {
    const state = get();
    const missingIds = ids.filter(id => !state.wordCache.has(id));

    if (missingIds.length === 0) return;

    // Find which levels we need to load
    const levelsNeeded = new Set<string>();
    for (const id of missingIds) {
      const level = id.split('_')[0];
      if (!state.levelData.has(level)) {
        levelsNeeded.add(level);
      }
    }

    // Load missing levels
    for (const level of levelsNeeded) {
      try {
        const response = await fetch(`/data/${level}.json`);
        if (response.ok) {
          const rawWords: RawWord[] = await response.json();
          set((s) => {
            const newLevelData = new Map(s.levelData);
            newLevelData.set(level, rawWords);
            return { levelData: newLevelData };
          });
        }
      } catch {
        // Continue with other levels
      }
    }

    // Now build Word objects for requested IDs
    const currentState = get();
    const newCache = new Map(currentState.wordCache);

    for (const id of missingIds) {
      const [level, indexStr] = id.split('_');
      const index = parseInt(indexStr, 10);
      const rawWords = currentState.levelData.get(level);

      if (rawWords && rawWords[index]) {
        const raw = rawWords[index];
        const word: Word = {
          id,
          word: raw.word,
          pos: raw.pos,
          level: raw.level,
          phonetic: raw.phonetic,
          definition: raw.definition,
          example: raw.example,
          synonyms: raw.synonyms,
          audioUrl: raw.audio,
          zh: raw.zh,
        };
        newCache.set(id, word);
      }
    }

    set({ wordCache: newCache });
    saveLocalCache(newCache);
  },

  getWord: (id: string) => {
    const state = get();
    return state.wordCache.get(id);
  },

  getWordIds: () => {
    return get().wordIndex.map(w => w.id);
  },

  getWordIdsByLevel: (level: string) => {
    return get().wordIndex.filter(w => w.level === level).map(w => w.id);
  },

  getWordsByLevel: (level: string) => {
    const state = get();
    return state.wordIndex
      .filter(w => w.level === level)
      .map(w => state.wordCache.get(w.id))
      .filter((w): w is Word => w !== undefined);
  },

  getTotalWordCount: () => {
    return get().wordIndex.length;
  },

  getWordCountByLevel: (level: string) => {
    return get().wordIndex.filter(w => w.level === level).length;
  },
}));
