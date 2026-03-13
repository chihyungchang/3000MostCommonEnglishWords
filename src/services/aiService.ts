/**
 * AI Service - Cloudflare Workers AI integration
 * Provides TTS pronunciation and AI chat
 */

const WORKER_URL = import.meta.env.VITE_AI_WORKER_URL || '';

interface TTSResponse {
  audio: string;
}

export interface WordLookupResult {
  word?: string;
  phonetic?: string;
  pos?: string[];
  definition?: string;
  example?: string;
  isPhrase?: boolean;
  error?: string;
  cached?: boolean;
}

class AIService {
  private audioCache: Map<string, string> = new Map();

  isConfigured(): boolean {
    return !!WORKER_URL;
  }

  async pronounce(text: string, lang: string = 'en'): Promise<string | null> {
    if (!this.isConfigured()) {
      console.warn('AI Worker URL not configured');
      return null;
    }

    const cacheKey = `${text}_${lang}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${WORKER_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const data: TTSResponse = await response.json();
      this.audioCache.set(cacheKey, data.audio);
      return data.audio;
    } catch (error) {
      console.error('TTS Error:', error);
      return null;
    }
  }

  async playPronunciation(text: string, lang: string = 'en'): Promise<boolean> {
    const audioBase64 = await this.pronounce(text, lang);
    if (!audioBase64) return false;

    try {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      await audio.play();
      return true;
    } catch (error) {
      console.error('Audio playback error:', error);
      return false;
    }
  }

  async lookup(word: string, context?: string, targetLang: string = 'zh'): Promise<WordLookupResult> {
    if (!this.isConfigured()) {
      throw new Error('AI service not configured');
    }

    try {
      const response = await fetch(`${WORKER_URL}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, context, targetLang }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Lookup request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Lookup Error:', error);
      throw error;
    }
  }

  async chat(message: string, context: string, targetLang: string = 'zh'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AI service not configured');
    }

    try {
      const response = await fetch(`${WORKER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, targetLang }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Chat request failed: ${response.status}`);
      }

      return data.reply || '';
    } catch (error) {
      console.error('Chat Error:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.audioCache.clear();
  }
}

export const aiService = new AIService();
