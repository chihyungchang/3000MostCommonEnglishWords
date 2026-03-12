import { create } from 'zustand';
import type { Word } from '../types';
import wordsData from '../data/words.json';

interface WordState {
  words: Word[];
  wordMap: Map<string, Word>;
  isLoaded: boolean;
  loadWords: () => void;
  getWord: (id: string) => Word | undefined;
  getWordsByLevel: (level: string) => Word[];
}

// Transform raw word data to include IDs
function transformWords(rawWords: typeof wordsData): Word[] {
  return rawWords.map((w, index) => ({
    id: `word_${index}`,
    word: w.word,
    pos: w.pos,
    level: w.level,
    phonetic: (w as Record<string, unknown>).phonetic as string | undefined,
    definition: (w as Record<string, unknown>).definition as string | undefined,
    example: (w as Record<string, unknown>).example as string | undefined,
    synonyms: (w as Record<string, unknown>).synonyms as string[] | undefined,
    audioUrl: (w as Record<string, unknown>).audio as string | undefined,
  }));
}

export const useWordStore = create<WordState>((set, get) => ({
  words: [],
  wordMap: new Map(),
  isLoaded: false,

  loadWords: () => {
    const words = transformWords(wordsData);
    const wordMap = new Map(words.map((w) => [w.id, w]));

    set({
      words,
      wordMap,
      isLoaded: true,
    });
  },

  getWord: (id: string) => {
    return get().wordMap.get(id);
  },

  getWordsByLevel: (level: string) => {
    return get().words.filter((w) => w.level === level);
  },
}));
