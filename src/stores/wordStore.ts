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

const CACHE_KEY = 'word_cache_v5'; // v5: validate cache has full word count
const INDEX_CACHE_KEY = 'word_index_v5'; // v5: validate cache has full word count
const EXPECTED_MIN_WORD_COUNT = 2900; // Minimum expected words (actual: 2951)

// Clear old cache versions on module load
function clearOldCaches() {
  const oldKeys = ['word_cache_v3', 'word_cache_v4', 'word_index_v3', 'word_index_v4'];
  oldKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`[WordStore] Clearing old cache: ${key}`);
      localStorage.removeItem(key);
    }
  });
}
clearOldCaches();

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
      const parsed = JSON.parse(cached);
      console.log(`[WordStore] Found cached index (${INDEX_CACHE_KEY}): ${parsed.length} words`);
      return parsed;
    }
    console.log(`[WordStore] No cached index found for key: ${INDEX_CACHE_KEY}`);
  } catch (e) {
    console.error('[WordStore] Failed to load index cache:', e);
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
      // Strategy: Always load from JSON first (fast and reliable), then try Supabase in background
      // This avoids cache corruption issues

      // 1. Check cache for instant load (but verify it has enough words)
      const cachedIndex = loadIndexCache();
      const cacheValid = cachedIndex && cachedIndex.length >= EXPECTED_MIN_WORD_COUNT;

      if (cacheValid) {
        console.log(`[WordStore] Using cached index: ${cachedIndex.length} words`);
        set({
          wordIndex: cachedIndex,
          isLoaded: true,
          isLoading: false,
        });
        // Still try to refresh from Supabase in background
        fetchIndexFromSupabase().then((newIndex) => {
          if (newIndex && newIndex.length >= EXPECTED_MIN_WORD_COUNT) {
            saveIndexCache(newIndex);
            set({ wordIndex: newIndex });
          }
        });
        return;
      }

      // 2. Cache invalid - load from JSON directly (reliable, ~100KB)
      if (cachedIndex) {
        console.log(`[WordStore] Cache invalid (${cachedIndex.length} words), loading from JSON...`);
        // Clear bad cache
        localStorage.removeItem(INDEX_CACHE_KEY);
      } else {
        console.log('[WordStore] No cache, loading from JSON...');
      }

      const jsonIndex = await fetchIndexFromJSON();
      console.log(`[WordStore] Loaded ${jsonIndex.length} words from JSON`);

      if (jsonIndex.length < EXPECTED_MIN_WORD_COUNT) {
        throw new Error(`JSON has only ${jsonIndex.length} words, expected ${EXPECTED_MIN_WORD_COUNT}+`);
      }

      saveIndexCache(jsonIndex);
      set({
        wordIndex: jsonIndex,
        isLoaded: true,
        isLoading: false,
      });

      // 3. Try Supabase in background (might have newer data)
      fetchIndexFromSupabase().then((newIndex) => {
        if (newIndex && newIndex.length >= EXPECTED_MIN_WORD_COUNT) {
          saveIndexCache(newIndex);
          set({ wordIndex: newIndex });
        }
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
    console.log('[WordStore] ensureWordsLoaded called with', ids.length, 'ids:', ids.slice(0, 5));

    if (ids.length === 0) {
      console.log('[WordStore] No IDs to load');
      return [];
    }

    const currentState = get();

    // Check which words are being loaded by another call
    const loadingIds = ids.filter((id) => currentState.loadingIds.has(id));

    // If some words are being loaded, wait for them
    if (loadingIds.length > 0) {
      console.log('[WordStore] Waiting for', loadingIds.length, 'words already loading...');
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
      console.log('[WordStore] Finished waiting, waited', waited, 'ms');
    }

    // Now check which words are actually missing
    const missingIds = ids.filter((id) => {
      const cached = get().wordCache.get(id);
      return !cached;
    });

    console.log('[WordStore] Missing words:', missingIds.length, 'of', ids.length);

    // If all words are in cache, return them
    if (missingIds.length === 0) {
      console.log('[WordStore] All words in cache, returning');
      return ids.map((id) => get().wordCache.get(id)).filter((w): w is Word => !!w);
    }

    // Mark words as loading to prevent duplicate requests
    const newLoadingIds = new Set(currentState.loadingIds);
    missingIds.forEach((id) => newLoadingIds.add(id));
    set({ loadingIds: newLoadingIds });

    try {
      console.log('[WordStore] Fetching from Supabase...');
      // Try Supabase first (will have meanings)
      const supabaseWords = await fetchWordsByIds(missingIds);
      console.log('[WordStore] Supabase returned:', supabaseWords?.length || 0, 'words');
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
      console.log('[WordStore] Still missing after Supabase:', stillMissing.length);

      if (stillMissing.length > 0) {
        // Fallback to JSON files for missing words
        const levelsNeeded = new Set<string>();
        for (const id of stillMissing) {
          const level = id.split('_')[0];
          if (level) levelsNeeded.add(level);
        }
        console.log('[WordStore] Levels needed:', Array.from(levelsNeeded));

        for (const level of levelsNeeded) {
          try {
            console.log(`[WordStore] Fetching /data/${level}.json...`);
            const response = await fetch(`/data/${level}.json`);
            if (!response.ok) {
              console.warn(`[WordStore] Failed to fetch /data/${level}.json: ${response.status}`);
              continue;
            }
            console.log(`[WordStore] Got ${level}.json, parsing...`);

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
      console.log('[WordStore] ensureWordsLoaded finished');
    }

    // Return all requested words
    const result = ids.map((id) => get().wordCache.get(id)).filter((w): w is Word => !!w);
    console.log('[WordStore] Returning', result.length, 'words of', ids.length, 'requested');
    return result;
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
