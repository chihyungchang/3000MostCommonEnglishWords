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

interface WordState {
  words: Word[];
  wordMap: Map<string, Word>;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadWords: () => Promise<void>;
  getWord: (id: string) => Word | undefined;
  getWordsByLevel: (level: string) => Word[];
}

// Transform raw word data to include IDs
function transformWords(rawWords: RawWord[]): Word[] {
  return rawWords.map((w, index) => ({
    id: `word_${index}`,
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
  isLoaded: false,
  isLoading: false,
  error: null,

  loadWords: async () => {
    // Prevent duplicate loading
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/data/words.json');
      if (!response.ok) {
        throw new Error('Failed to load words');
      }
      const rawWords: RawWord[] = await response.json();
      const words = transformWords(rawWords);
      const wordMap = new Map(words.map((w) => [w.id, w]));

      set({
        words,
        wordMap,
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

  getWord: (id: string) => {
    return get().wordMap.get(id);
  },

  getWordsByLevel: (level: string) => {
    return get().words.filter((w) => w.level === level);
  },
}));
