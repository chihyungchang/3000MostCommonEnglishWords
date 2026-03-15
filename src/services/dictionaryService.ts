/**
 * Service to load and cache dictionary data from dictionary-full.json
 */

import type { DictMeaning } from '../types';

interface DictPhonetic {
  text?: string;
  audio?: string;
}

interface FullWordData {
  id: string;
  word: string;
  pos: string[];
  level: string;
  zh: string | null;
  phonetic?: string;
  phonetics?: DictPhonetic[];
  meanings: DictMeaning[];
  sourceUrls?: string[];
  fetchedAt: string;
}

class DictionaryService {
  private data: Record<string, FullWordData> | null = null;
  private loading: Promise<void> | null = null;

  /**
   * Load dictionary data from JSON file
   */
  async load(): Promise<void> {
    if (this.data) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      try {
        const response = await fetch('/data/dictionary-full.json');
        if (!response.ok) {
          console.error('Failed to load dictionary data');
          return;
        }
        this.data = await response.json();
        console.log(`Dictionary loaded: ${Object.keys(this.data || {}).length} words`);
      } catch (error) {
        console.error('Error loading dictionary:', error);
      }
    })();

    return this.loading;
  }

  /**
   * Get dictionary data for a word by ID
   */
  getById(id: string): FullWordData | null {
    return this.data?.[id] || null;
  }

  /**
   * Get meanings for a word by ID
   */
  getMeanings(id: string): DictMeaning[] {
    return this.data?.[id]?.meanings || [];
  }

  /**
   * Get best audio URL for a word by ID
   */
  getAudioUrl(id: string): string | null {
    const entry = this.data?.[id];
    if (!entry?.phonetics) return null;

    for (const p of entry.phonetics) {
      if (p.audio && p.audio.length > 0) {
        return p.audio;
      }
    }
    return null;
  }

  /**
   * Get phonetic text for a word by ID
   */
  getPhonetic(id: string): string | null {
    return this.data?.[id]?.phonetic || null;
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.data !== null;
  }
}

// Singleton instance
export const dictionaryService = new DictionaryService();
