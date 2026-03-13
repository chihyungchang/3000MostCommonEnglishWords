import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Volume2, Loader2, BookOpen, Quote, Link2 } from 'lucide-react';
import { aiService } from '../services/aiService';
import { useSettingsStore } from '../stores/themeStore';

interface WordInfo {
  word: string;
  phonetic?: string;
  pos?: string[];
  definition?: string;
  example?: string;
  contextMeaning?: string;
  isPhrase?: boolean;
  phraseWords?: string[];
}

interface WordPopupProps {
  word: string;
  context: string; // The sentence containing the word
  position: { x: number; y: number };
  onClose: () => void;
}

export function WordPopup({ word, context, position, onClose }: WordPopupProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettingsStore();
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate position once on mount - use fixed popup size estimate to avoid jumping
  const [adjustedPosition] = useState(() => {
    const POPUP_WIDTH = 320;
    const POPUP_HEIGHT = 300; // Estimated max height
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + POPUP_WIDTH > viewport.width - 20) {
      x = viewport.width - POPUP_WIDTH - 20;
    }
    if (x < 20) x = 20;

    // Adjust vertical position - show above if not enough space below
    if (y + POPUP_HEIGHT > viewport.height - 20) {
      y = Math.max(20, position.y - POPUP_HEIGHT - 10);
    }

    return { x, y };
  });

  // Additional adjustment after render if needed (only once)
  const hasAdjusted = useRef(false);
  useLayoutEffect(() => {
    if (popupRef.current && !hasAdjusted.current) {
      hasAdjusted.current = true;
      const rect = popupRef.current.getBoundingClientRect();

      // Only adjust if popup is actually out of viewport
      if (rect.bottom > window.innerHeight - 10 || rect.right > window.innerWidth - 10) {
        popupRef.current.style.transition = 'none';
        if (rect.right > window.innerWidth - 10) {
          popupRef.current.style.left = `${window.innerWidth - rect.width - 20}px`;
        }
        if (rect.bottom > window.innerHeight - 10) {
          popupRef.current.style.top = `${Math.max(20, position.y - rect.height - 10)}px`;
        }
      }
    }
  }, [position.y]);

  // Fetch word info
  useEffect(() => {
    const fetchWordInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const targetLang = settings.language || i18n.language || 'zh';
        const result = await aiService.lookup(word, context, targetLang);

        setInfo({
          word,
          phonetic: result.phonetic,
          pos: Array.isArray(result.pos) ? result.pos : (result.pos ? [result.pos] : undefined),
          definition: result.definition,
          example: result.example,
          contextMeaning: result.contextMeaning,
          isPhrase: result.isPhrase,
        });
      } catch (err) {
        setError(t('wordPopup.error', 'Failed to load word info'));
        console.error('Word lookup error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWordInfo();
  }, [word, context, settings.language, i18n.language, t]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSpeak = async () => {
    if (speaking) {
      audioRef.current?.pause();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    try {
      const audioBase64 = await aiService.pronounce(word, 'en');
      if (audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      }
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 clay-card p-4 w-80 max-w-[calc(100vw-40px)] shadow-xl animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-theme-primary">{word}</h3>
          <button
            onClick={handleSpeak}
            className={`clay-btn w-8 h-8 flex items-center justify-center ${speaking ? 'clay-btn-primary' : ''}`}
            title={t('wordPopup.speak', 'Pronounce')}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="clay-btn w-7 h-7 flex items-center justify-center text-theme-tertiary hover:text-theme-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm py-4">{error}</p>
      ) : info ? (
        <div className="space-y-3">
          {/* Phonetic & POS */}
          <div className="flex items-center gap-2 flex-wrap">
            {info.phonetic && (
              <span className="text-theme-secondary text-sm">{info.phonetic}</span>
            )}
            {info.pos?.map((p) => (
              <span key={p} className="clay-badge text-xs bg-info-light text-info">
                {t(`pos.${p}`, p)}
              </span>
            ))}
            {info.isPhrase && (
              <span className="clay-badge text-xs bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                {t('wordPopup.phrase', 'Phrase')}
              </span>
            )}
          </div>

          {/* Definition */}
          {info.definition && (
            <div className="clay-card p-3 bg-theme-tertiary/50">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-theme-secondary">
                  {t('wordPopup.definition', 'Definition')}
                </span>
              </div>
              <p className="text-sm text-theme-primary">{info.definition}</p>
            </div>
          )}

          {/* Context Meaning */}
          {info.contextMeaning && info.contextMeaning !== info.definition && (
            <div className="clay-card p-3 bg-yellow-50/50 dark:bg-yellow-900/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Link2 className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-xs font-semibold text-theme-secondary">
                  {t('wordPopup.contextMeaning', 'In this context')}
                </span>
              </div>
              <p className="text-sm text-theme-primary">{info.contextMeaning}</p>
            </div>
          )}

          {/* Example */}
          {info.example && (
            <div className="clay-card p-3 bg-accent-light/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Quote className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-theme-secondary">
                  {t('wordPopup.example', 'Example')}
                </span>
              </div>
              <p className="text-sm text-theme-primary italic">"{info.example}"</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
