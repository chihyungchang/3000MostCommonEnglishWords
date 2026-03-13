/**
 * AI Service - Cloudflare Workers AI integration
 * Provides TTS pronunciation and AI word analysis
 */

// Worker API URL - will be replaced with actual deployed URL
const WORKER_URL = import.meta.env.VITE_AI_WORKER_URL || '';

export interface WordAnalysis {
  etymology?: string;
  memory_tip?: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  example_sentences?: string[];
  usage_notes?: string;
  raw?: string;
}

export interface TTSResponse {
  audio: string; // base64 encoded audio
}

export interface AnalysisResponse {
  analysis: WordAnalysis;
}

class AIService {
  private audioCache: Map<string, string> = new Map();
  private analysisCache: Map<string, WordAnalysis> = new Map();

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    return !!WORKER_URL;
  }

  /**
   * Generate pronunciation audio for text
   */
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

  /**
   * Play pronunciation audio
   */
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

  /**
   * Get AI analysis for a word
   */
  async analyzeWord(
    word: string,
    definition: string,
    example?: string,
    targetLang: string = 'zh'
  ): Promise<WordAnalysis | null> {
    if (!this.isConfigured()) {
      console.warn('AI Worker URL not configured');
      return null;
    }

    const cacheKey = `${word}_${targetLang}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, definition, example, targetLang }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.details || `Analysis request failed: ${response.status}`;
        throw new Error(errorMsg);
      }

      this.analysisCache.set(cacheKey, data.analysis);
      return data.analysis;
    } catch (error) {
      console.error('Analysis Error:', error);
      throw error;
    }
  }

  /**
   * Send a chat message about a word
   */
  async chat(
    message: string,
    context: string,
    targetLang: string = 'zh'
  ): Promise<string> {
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

  /**
   * Clear caches
   */
  clearCache(): void {
    this.audioCache.clear();
    this.analysisCache.clear();
  }
}

export const aiService = new AIService();
