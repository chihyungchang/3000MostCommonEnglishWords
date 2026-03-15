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
  // Lightweight index (always loaded)
  wordIndex: WordIndex[];
  // Full word data cache
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

// Save cache to localStorage (max 50 words to keep it small)
function saveLocalCache(cache: Map<string, Word>) {
  try {
    const entries = Array.from(cache.entries()).slice(-50);
    const obj = Object.fromEntries(entries);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage errors
  }
}

// Load index from localStorage
function loadIndexCache(): WordIndex[] | null {
  try {
    const cached = localStorage.getItem(INDEX_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

// Save index to localStorage
function saveIndexCache(index: WordIndex[]) {
  try {
    localStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(index));
  } catch {
    // Ignore storage errors
  }
}

// Helper to convert WordRow to Word
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

// Fetch word index from Supabase
async function fetchIndexFromSupabase(): Promise<WordIndex[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('words')
      .select('id, word, level')
      .order('id');

    if (error || !data) return null;

    return (data as Pick<WordRow, 'id' | 'word' | 'level'>[]).map((w) => ({
      id: w.id,
      word: w.word,
      level: w.level,
    }));
  } catch {
    return null;
  }
}

// Fetch words by IDs from Supabase
async function fetchWordsByIds(ids: string[]): Promise<Word[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .in('id', ids);

    if (error || !data) return null;

    return (data as WordRow[]).map(rowToWord);
  } catch {
    return null;
  }
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
      // Try to load from localStorage cache first
      const cachedIndex = loadIndexCache();
      if (cachedIndex && cachedIndex.length > 0) {
        set({
          wordIndex: cachedIndex,
          isLoaded: true,
          isLoading: false,
        });
        // Refresh from Supabase in background
        fetchIndexFromSupabase().then((newIndex) => {
          if (newIndex && newIndex.length > 0) {
            saveIndexCache(newIndex);
            set({ wordIndex: newIndex });
          }
        });
        return;
      }

      // Load from Supabase if configured
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

      // Fallback to JSON file
      const response = await fetch('/data/word-index.json');
      if (!response.ok) {
        throw new Error('Failed to load word index');
      }
      const wordIndex: WordIndex[] = await response.json();
      saveIndexCache(wordIndex);

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

  // Ensure specific words are loaded (fetch from Supabase or JSON)
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
      return;
    }

    // Fallback to JSON files
    const levelsNeeded = new Set<string>();
    for (const id of missingIds) {
      const level = id.split('_')[0];
      levelsNeeded.add(level);
    }

    for (const level of levelsNeeded) {
      try {
        const response = await fetch(`/data/${level}.json`);
        if (response.ok) {
          const rawWords = await response.json();
          const newCache = new Map(get().wordCache);

          for (let i = 0; i < rawWords.length; i++) {
            const raw = rawWords[i];
            const id = `${level}_${i}`;
            if (missingIds.includes(id)) {
              const word: Word = {
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
              };
              newCache.set(id, word);
            }
          }

          set({ wordCache: newCache });
          saveLocalCache(newCache);
        }
      } catch {
        // Continue with other levels
      }
    }
  },

  getWord: (id: string) => {
    return get().wordCache.get(id);
  },

  getWordIds: () => {
    return get().wordIndex.map((w) => w.id);
  },

  getWordIdsByLevel: (level: string) => {
    return get().wordIndex.filter((w) => w.level === level).map((w) => w.id);
  },

  getWordsByLevel: (level: string) => {
    const state = get();
    return state.wordIndex
      .filter((w) => w.level === level)
      .map((w) => state.wordCache.get(w.id))
      .filter((w): w is Word => w !== undefined);
  },

  getTotalWordCount: () => {
    return get().wordIndex.length;
  },

  getWordCountByLevel: (level: string) => {
    return get().wordIndex.filter((w) => w.level === level).length;
  },
}));
