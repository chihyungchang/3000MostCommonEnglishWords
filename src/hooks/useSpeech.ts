import { useCallback, useState, useEffect, useRef } from 'react';

interface UseSpeechReturn {
  speak: (text: string, id?: string) => void;
  speaking: boolean;
  speakingId: string | null; // Which content is currently speaking
  supported: boolean;
  stop: () => void;
}

export function useSpeech(): UseSpeechReturn {
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices - they may load asynchronously
  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setSpeakingId(null);
    }
  }, [supported]);

  const speak = useCallback(
    (text: string, id?: string) => {
      if (!supported || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      

      // Try to find a good English voice - prefer female voices for clarity
      if (voices.length > 0) {
        // Priority: US English female > US English > GB English > any English
        const preferredVoice =
          voices.find((v) => v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
          voices.find((v) => v.lang === 'en-US' && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Victoria'))) ||
          voices.find((v) => v.lang === 'en-US') ||
          voices.find((v) => v.lang === 'en-GB') ||
          voices.find((v) => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => {
        setSpeaking(true);
        setSpeakingId(id || 'default');
      };
      utterance.onend = () => {
        setSpeaking(false);
        setSpeakingId(null);
      };
      utterance.onerror = () => {
        setSpeaking(false);
        setSpeakingId(null);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, voices]
  );

  return { speak, speaking, speakingId, supported, stop };
}
