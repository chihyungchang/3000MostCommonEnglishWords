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
  cacheVersion: number; // Increments when cache updates, triggers re-renders
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadingIds: Set<string>; // Track which words are currently being loaded

  loadWords: () => Promise<void>;
  getWord: (id: string) => Word | undefined;
  getWordsByLevel: (level: string) => Word[];
  getWordIds: () => string[];
  getWordIdsByLevel: (level: string) => string[];
  ensureWordsLoaded: (ids: string[]) => Promise<Word[]>;
  getTotalWordCount: () => number;
  getWordCountByLevel: (level: string) => number;
  isWordLoading: (id: string) => boolean;
}

const CACHE_KEY = 'word_cache_v3'; // v3: includes meanings from Supabase
const INDEX_CACHE_KEY = 'word_index_v3'; // v3: full 3000 words

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

// Session words that should be prioritized in localStorage cache
let sessionWordIds: Set<string> = new Set();

export function setSessionWords(ids: string[]) {
  sessionWordIds = new Set(ids);
}

function saveLocalCache(cache: Map<string, Word>) {
  try {
    // Priority: session words + recent words, up to 300 total
    const sessionEntries: [string, Word][] = [];
    const otherEntries: [string, Word][] = [];

    for (const [id, word] of cache.entries()) {
      if (sessionWordIds.has(id)) {
        sessionEntries.push([id, word]);
      } else {
        otherEntries.push([id, word]);
      }
    }

    // Keep all session words + fill remaining space with recent words
    const maxOther = Math.max(0, 300 - sessionEntries.length);
    const entries = [...sessionEntries, ...otherEntries.slice(-maxOther)];

    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore - localStorage might be full
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

// Sort word IDs numerically (A1_0, A1_1, ..., A1_10, not A1_0, A1_1, A1_10, A1_2)
function sortWordIndex(items: WordIndex[]): WordIndex[] {
  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return [...items].sort((a, b) => {
    const [levelA, numA] = a.id.split('_');
    const [levelB, numB] = b.id.split('_');
    const levelDiff = levelOrder.indexOf(levelA) - levelOrder.indexOf(levelB);
    if (levelDiff !== 0) return levelDiff;
    return parseInt(numA, 10) - parseInt(numB, 10);
  });
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
    meanings: (w.meanings as Word['meanings']) || undefined,
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

    const items = (data as Pick<WordRow, 'id' | 'word' | 'level'>[]).map((w) => ({
      id: w.id,
      word: w.word,
      level: w.level,
    }));

    // Sort numerically (A1_0, A1_1, A1_2, ..., A1_10, not A1_0, A1_1, A1_10, A1_2)
    return sortWordIndex(items);
  } catch {
    return null;
  }
}

// Fetch words by IDs from Supabase (with 5s timeout)
async function fetchWordsByIds(ids: string[]): Promise<Word[] | null> {
  if (!isSupabaseConfigured || ids.length === 0) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
  cacheVersion: 0,
  isLoaded: false,
  isLoading: false,
  error: null,
  loadingIds: new Set<string>(),

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

  ensureWordsLoaded: async (ids: string[]): Promise<Word[]> => {
    const currentState = get();

    // Check which words are being loaded by another call
    const loadingIds = ids.filter((id) => currentState.loadingIds.has(id));

    // If some words are being loaded, wait for them
    if (loadingIds.length > 0) {
      // Poll until loading completes (max 10 seconds)
      const maxWait = 10000;
      const pollInterval = 100;
      let waited = 0;
      while (waited < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        waited += pollInterval;
        const stillLoading = loadingIds.some((id) => get().loadingIds.has(id));
        if (!stillLoading) break;
      }
    }

    // Now check which words are actually missing
    const missingIds = ids.filter((id) => {
      const cached = get().wordCache.get(id);
      return !cached;
    });

    // If all words are in cache, return them
    if (missingIds.length === 0) {
      return ids.map((id) => get().wordCache.get(id)).filter((w): w is Word => !!w);
    }

    // Mark words as loading to prevent duplicate requests
    const newLoadingIds = new Set(currentState.loadingIds);
    missingIds.forEach((id) => newLoadingIds.add(id));
    set({ loadingIds: newLoadingIds });

    try {
      // Try Supabase first (will have meanings)
      const supabaseWords = await fetchWordsByIds(missingIds);
      if (supabaseWords && supabaseWords.length > 0) {
        const latestCache = new Map(get().wordCache);
        for (const word of supabaseWords) {
          latestCache.set(word.id, word);
        }
        set({ wordCache: latestCache, cacheVersion: get().cacheVersion + 1 });
        saveLocalCache(latestCache);
      }

      // Check which words are still completely missing after Supabase
      const stillMissing = missingIds.filter((id) => !get().wordCache.has(id));

      if (stillMissing.length > 0) {
        // Fallback to JSON files for missing words
        const levelsNeeded = new Set<string>();
        for (const id of stillMissing) {
          levelsNeeded.add(id.split('_')[0]);
        }

        for (const level of levelsNeeded) {
          try {
            const response = await fetch(`/data/${level}.json`);
            if (!response.ok) {
              console.warn(`Failed to fetch /data/${level}.json: ${response.status}`);
              continue;
            }

            const rawWords = await response.json();
            const latestCache = new Map(get().wordCache);

            for (let i = 0; i < rawWords.length; i++) {
              const raw = rawWords[i];
              const id = `${level}_${i}`;
              // Only add if still missing
              if (stillMissing.includes(id) && !latestCache.has(id)) {
                const word: Word = {
                  id,
                  word: raw.word,
                  pos: raw.pos || [],
                  level: raw.level || level,
                  phonetic: raw.phonetic,
                  definition: raw.definition,
                  example: raw.example,
                  synonyms: raw.synonyms,
                  audioUrl: raw.audio,
                  zh: raw.zh,
                };
                latestCache.set(id, word);
              }
            }

            set({ wordCache: latestCache, cacheVersion: get().cacheVersion + 1 });
            saveLocalCache(latestCache);
          } catch (error) {
            console.error(`Failed to load words from ${level}.json:`, error);
          }
        }
      }
    } finally {
      // Remove from loading set
      const finalLoadingIds = new Set(get().loadingIds);
      missingIds.forEach((id) => finalLoadingIds.delete(id));
      set({ loadingIds: finalLoadingIds });
    }

    // Return all requested words
    return ids.map((id) => get().wordCache.get(id)).filter((w): w is Word => !!w);
  },

  isWordLoading: (id: string) => get().loadingIds.has(id),

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
