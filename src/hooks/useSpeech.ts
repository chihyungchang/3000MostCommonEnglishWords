import { useCallback, useState, useRef } from 'react';
import { aiService } from '../services/aiService';

interface UseSpeechReturn {
  speak: (text: string, id?: string) => void;
  speaking: boolean;
  speakingId: string | null;
  supported: boolean;
  stop: () => void;
}

export function useSpeech(): UseSpeechReturn {
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Worker TTS is always supported if configured
  const supported = aiService.isConfigured();

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    async (text: string, id?: string) => {
      if (!supported || !text) return;

      // Stop any ongoing audio
      stop();

      setSpeaking(true);
      setSpeakingId(id || 'default');

      try {
        const audioBase64 = await aiService.pronounce(text, 'en');
        if (!audioBase64) {
          throw new Error('Failed to get audio');
        }

        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;

        audio.onended = () => {
          setSpeaking(false);
          setSpeakingId(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setSpeaking(false);
          setSpeakingId(null);
          audioRef.current = null;
        };

        await audio.play();
      } catch (error) {
        console.error('TTS Error:', error);
        setSpeaking(false);
        setSpeakingId(null);
      }
    },
    [supported, stop]
  );

  return { speak, speaking, speakingId, supported, stop };
}
