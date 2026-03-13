import { useState, useCallback } from 'react';
import { aiService, type WordAnalysis } from '../services/aiService';

interface UseAIReturn {
  // TTS
  playPronunciation: (text: string) => Promise<void>;
  isPlaying: boolean;

  // Analysis
  analyzeWord: (word: string, definition: string, example?: string) => Promise<void>;
  analysis: WordAnalysis | null;
  isAnalyzing: boolean;

  // Status
  isConfigured: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAI(targetLang: string = 'zh'): UseAIReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WordAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = aiService.isConfigured();

  const playPronunciation = useCallback(async (text: string) => {
    if (!isConfigured) {
      setError('AI service not configured');
      return;
    }

    setIsPlaying(true);
    setError(null);

    try {
      const success = await aiService.playPronunciation(text);
      if (!success) {
        setError('Failed to play pronunciation');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsPlaying(false);
    }
  }, [isConfigured]);

  const analyzeWord = useCallback(async (word: string, definition: string, example?: string) => {
    if (!isConfigured) {
      setError('AI service not configured');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await aiService.analyzeWord(word, definition, example, targetLang);
      if (result) {
        setAnalysis(result);
      } else {
        setError('Failed to analyze word');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isConfigured, targetLang]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    playPronunciation,
    isPlaying,
    analyzeWord,
    analysis,
    isAnalyzing,
    isConfigured,
    error,
    clearError,
  };
}
