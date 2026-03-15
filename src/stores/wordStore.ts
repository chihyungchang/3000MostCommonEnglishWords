import { create } from 'zustand';
import type { Word } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/types';

type WordRow = Database['public']['Tables']['words']['Row'];

interface WordIndex {
  id: string;
  word: string;
  level: string;
}

interface WordState {
  wordIndex: WordIndex[];
  wordCache: Map<string, Word>;
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

const CACHE_KEY = 'word_cache_v2';
const INDEX_CACHE_KEY = 'word_index_v1';

function loadLocalCache(): Map<string, Word> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return new Map(Object.entries(parsed));
    }
  } catch {
    // Ignore
  }
  return new Map();
}

function saveLocalCache(cache: Map<string, Word>) {
  try {
    const entries = Array.from(cache.entries()).slice(-50);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore
  }
}

function loadIndexCache(): WordIndex[] | null {
  try {
    const cached = localStorage.getItem(INDEX_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore
  }
  return null;
}

function saveIndexCache(index: WordIndex[]) {
  try {
    localStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(index));
  } catch {
    // Ignore
  }
}

function rowToWord(w: WordRow): Word {
  return {
    id: w.id,
    word: w.word,
    pos: w.pos || [],
    level: w.level,
    phonetic: w.phonetic || undefined,
    definition: w.definition || undefined,
    example: w.example || undefined,
    synonyms: w.synonyms || undefined,
    audioUrl: w.audio || undefined,
    zh: w.zh || undefined,
  };
}

// Fetch word index from Supabase (with 3s timeout)
async function fetchIndexFromSupabase(): Promise<WordIndex[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const { data, error } = await supabase
      .from('words')
      .select('id, word, level')
      .order('id')
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error || !data || data.length === 0) {
      return null;
    }

    return (data as Pick<WordRow, 'id' | 'word' | 'level'>[]).map((w) => ({
      id: w.id,
      word: w.word,
      level: w.level,
    }));
  } catch {
    return null;
  }
}

// Fetch words by IDs from Supabase (with 3s timeout)
async function fetchWordsByIds(ids: string[]): Promise<Word[] | null> {
  if (!isSupabaseConfigured || ids.length === 0) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const { data, error } = await supabase
      .from('words')
      .select('*')
      .in('id', ids)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error || !data || data.length === 0) {
      return null;
    }

    return (data as WordRow[]).map(rowToWord);
  } catch {
    return null;
  }
}

// Fetch word index from JSON file
async function fetchIndexFromJSON(): Promise<WordIndex[]> {
  const response = await fetch('/data/word-index.json');
  if (!response.ok) {
    throw new Error('Failed to load word index');
  }
  return response.json();
}

export const useWordStore = create<WordState>((set, get) => ({
  wordIndex: [],
  wordCache: loadLocalCache(),
  isLoaded: false,
  isLoading: false,
  error: null,

  loadWords: async () => {
    const state = get();
    if (state.isLoaded || state.isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // 1. Try localStorage cache first (instant)
      const cachedIndex = loadIndexCache();
      if (cachedIndex && cachedIndex.length > 0) {
        set({
          wordIndex: cachedIndex,
          isLoaded: true,
          isLoading: false,
        });
        // Refresh from Supabase in background (non-blocking)
        fetchIndexFromSupabase().then((newIndex) => {
          if (newIndex && newIndex.length > 0) {
            saveIndexCache(newIndex);
            set({ wordIndex: newIndex });
          }
        });
        return;
      }

      // 2. Try Supabase (with 3s timeout)
      const supabaseIndex = await fetchIndexFromSupabase();
      if (supabaseIndex && supabaseIndex.length > 0) {
        saveIndexCache(supabaseIndex);
        set({
          wordIndex: supabaseIndex,
          isLoaded: true,
          isLoading: false,
        });
        return;
      }

      // 3. Fallback to JSON file
      console.log('Loading word index from JSON fallback...');
      const jsonIndex = await fetchIndexFromJSON();
      saveIndexCache(jsonIndex);
      set({
        wordIndex: jsonIndex,
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load words:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        isLoaded: true, // Mark as loaded to prevent infinite retry
      });
    }
  },

  ensureWordsLoaded: async (ids: string[]) => {
    const state = get();
    const missingIds = ids.filter((id) => !state.wordCache.has(id));
    if (missingIds.length === 0) return;

    // Try Supabase first
    const supabaseWords = await fetchWordsByIds(missingIds);
    if (supabaseWords && supabaseWords.length > 0) {
      const newCache = new Map(get().wordCache);
      for (const word of supabaseWords) {
        newCache.set(word.id, word);
      }
      set({ wordCache: newCache });
      saveLocalCache(newCache);

      // Check if we got all words
      const stillMissing = missingIds.filter((id) => !newCache.has(id));
      if (stillMissing.length === 0) return;
    }

    // Fallback to JSON files for missing words
    const levelsNeeded = new Set<string>();
    const currentMissing = missingIds.filter((id) => !get().wordCache.has(id));
    for (const id of currentMissing) {
      levelsNeeded.add(id.split('_')[0]);
    }

    for (const level of levelsNeeded) {
      try {
        const response = await fetch(`/data/${level}.json`);
        if (!response.ok) continue;

        const rawWords = await response.json();
        const newCache = new Map(get().wordCache);

        for (let i = 0; i < rawWords.length; i++) {
          const raw = rawWords[i];
          const id = `${level}_${i}`;
          if (currentMissing.includes(id)) {
            newCache.set(id, {
              id,
              word: raw.word,
              pos: raw.pos || [],
              level: raw.level,
              phonetic: raw.phonetic,
              definition: raw.definition,
              example: raw.example,
              synonyms: raw.synonyms,
              audioUrl: raw.audio,
              zh: raw.zh,
            });
          }
        }

        set({ wordCache: newCache });
        saveLocalCache(newCache);
      } catch {
        // Continue
      }
    }
  },

  getWord: (id: string) => get().wordCache.get(id),

  getWordIds: () => get().wordIndex.map((w) => w.id),

  getWordIdsByLevel: (level: string) =>
    get().wordIndex.filter((w) => w.level === level).map((w) => w.id),

  getWordsByLevel: (level: string) => {
    const state = get();
    return state.wordIndex
      .filter((w) => w.level === level)
      .map((w) => state.wordCache.get(w.id))
      .filter((w): w is Word => w !== undefined);
  },

  getTotalWordCount: () => get().wordIndex.length,

  getWordCountByLevel: (level: string) =>
    get().wordIndex.filter((w) => w.level === level).length,
}));
