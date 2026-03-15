import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, Sparkles, BookOpen, Quote, History, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Word, DictMeaning } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { ClickableText } from './ClickableText';
import { dictionaryService } from '../services/dictionaryService';

// Map app POS tags to dictionary API POS
const POS_MAP: Record<string, string[]> = {
  n: ['noun'],
  v: ['verb'],
  adj: ['adjective'],
  adv: ['adverb'],
  prep: ['preposition'],
  conj: ['conjunction'],
  pron: ['pronoun'],
  det: ['determiner'],
  interj: ['interjection', 'exclamation'],
  num: ['numeral'],
};

interface WordCardProps {
  word: Word;
  showAnswer: boolean;
  onFlip: () => void;
  onPractice?: () => void;
  size?: 'normal' | 'large';
}

export function WordCard({ word, showAnswer, onFlip, onPractice, size = 'normal' }: WordCardProps) {
  const { t } = useTranslation();
  const { speak, speakingId, stop } = useSpeech();
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [meanings, setMeanings] = useState<DictMeaning[]>([]);
  const [expandedMeanings, setExpandedMeanings] = useState<Set<number>>(new Set([0])); // First meaning expanded by default

  const isLarge = size === 'large';
  const isWordSpeaking = audioPlaying || speakingId === 'word';
  const isExampleSpeaking = speakingId === 'example';

  // Get target POS set from word's pos array
  const targetPosSet = useMemo(() => {
    const set = new Set<string>();
    for (const pos of word.pos) {
      const mapped = POS_MAP[pos];
      if (mapped) {
        mapped.forEach((p) => set.add(p));
      }
    }
    return set;
  }, [word.pos]);

  // Load and sort meanings from dictionary service
  useEffect(() => {
    let isMounted = true;

    const loadMeanings = async () => {
      let rawMeanings: DictMeaning[] = [];

      if (word.meanings && word.meanings.length > 0) {
        rawMeanings = word.meanings;
      } else {
        // Wait for dictionary to load if not ready
        if (!dictionaryService.isLoaded()) {
          await dictionaryService.load();
        }
        rawMeanings = dictionaryService.getMeanings(word.id);
      }

      if (!isMounted) return;

      // Sort meanings: matching POS first, then others
      const sorted = [...rawMeanings].sort((a, b) => {
        const aMatches = targetPosSet.has(a.partOfSpeech);
        const bMatches = targetPosSet.has(b.partOfSpeech);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });

      setMeanings(sorted);
    };

    loadMeanings();
    // Reset expanded state when word changes
    setExpandedMeanings(new Set([0]));

    return () => {
      isMounted = false;
    };
  }, [word.id, word.meanings, targetPosSet]);

  const toggleMeaning = (index: number) => {
    const newExpanded = new Set(expandedMeanings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMeanings(newExpanded);
  };

  const handleSpeak = async () => {
    stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
    }

    if (word.audioUrl) {
      try {
        const audio = new Audio(word.audioUrl);
        audioRef.current = audio;
        audio.onplay = () => setAudioPlaying(true);
        audio.onended = () => setAudioPlaying(false);
        audio.onerror = () => {
          setAudioPlaying(false);
          speak(word.word, 'word');
        };
        await audio.play();
      } catch {
        setAudioPlaying(false);
        speak(word.word, 'word');
      }
    } else {
      speak(word.word, 'word');
    }
  };

  const handleSpeakExample = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
    }
    speak(word.example!, 'example');
  };

  const levelConfig: Record<string, { text: string; border: string }> = {
    A1: { text: 'text-green-600 dark:text-green-400', border: 'border-green-500 dark:border-green-500' },
    A2: { text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500 dark:border-emerald-500' },
    B1: { text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500 dark:border-yellow-500' },
    B2: { text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500 dark:border-orange-500' },
    C1: { text: 'text-red-600 dark:text-red-400', border: 'border-red-500 dark:border-red-500' },
    C2: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500 dark:border-purple-500' },
  };

  const levelStyle = levelConfig[word.level] || { text: 'text-theme-primary', border: 'border-theme' };

  const handleClick = () => {
    // Only allow flip if answer is not shown yet
    if (!showAnswer) {
      onFlip();
      handleSpeak(); // Auto-play pronunciation when revealing answer
    }
  };

  return (
    <div
      className={`w-full ${!showAnswer ? 'cursor-pointer' : ''} ${isLarge ? '' : 'max-w-lg mx-auto'}`}
      onClick={handleClick}
    >
      <div className={`clay-card transition-all duration-300 ${isLarge ? 'p-8' : 'p-6'}`}>
        {/* Header */}
        <div className={`flex items-start justify-between ${isLarge ? 'mb-6' : 'mb-4'}`}>
          <div className="flex items-center gap-4 flex-1">
            <h2 className={`font-bold text-theme-primary ${isLarge ? 'text-5xl' : 'text-3xl'}`}>
              {word.word}
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSpeak();
              }}
              className={`clay-btn flex items-center justify-center transition-all ${
                isWordSpeaking
                  ? 'clay-btn-primary'
                  : ''
              } ${isLarge ? 'w-12 h-12' : 'w-10 h-10'}`}
              title={t('card.speakWord')}
            >
              <Volume2 className={isLarge ? 'h-6 w-6' : 'h-5 w-5'} />
            </button>
          </div>
          <span
            className={`rounded-full font-bold border-2 ${levelStyle.text} ${levelStyle.border} ${
              isLarge ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'
            }`}
          >
            {word.level}
          </span>
        </div>

        {/* Phonetic */}
        {word.phonetic && (
          <p className={`text-theme-secondary font-medium ${isLarge ? 'text-xl mb-6' : 'text-lg mb-4'}`}>
            {word.phonetic}
          </p>
        )}

        {/* POS tags */}
        <div className={`flex flex-wrap gap-2 ${isLarge ? 'mb-6' : 'mb-4'}`}>
          {word.pos.map((p) => (
            <span
              key={p}
              className={`clay-badge bg-info-light text-info border-2 border-info/30 ${isLarge ? 'px-4 py-2 text-base' : ''}`}
            >
              {t(`pos.${p}`, p)}
            </span>
          ))}
        </div>

        {/* Collapsed hint */}
        {!showAnswer && (
          <div className={`text-center ${isLarge ? 'py-10' : 'py-6'}`}>
            <div className="inline-flex items-center gap-2 text-theme-tertiary">
              <Sparkles className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
              <span className={`font-medium ${isLarge ? 'text-base' : 'text-sm'}`}>
                {isLarge ? t('card.tapToRevealDesktop') : t('card.tapToReveal')}
              </span>
            </div>
          </div>
        )}

        {/* Answer content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            showAnswer ? 'max-h-150 opacity-100 overflow-y-auto' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`border-t-3 border-theme pt-6 ${isLarge ? 'space-y-6' : 'space-y-4'}`}>
            {/* Chinese Translation */}
            {word.zh && (
              <div className="clay-card p-4 bg-accent-light/30">
                <p className={`text-accent font-bold ${isLarge ? 'text-2xl' : 'text-xl'}`}>
                  {word.zh}
                </p>
              </div>
            )}

            {/* Meanings from dictionary */}
            {meanings.length > 0 ? (
              <div className={`${isLarge ? 'space-y-4' : 'space-y-3'}`}>
                {meanings.map((meaning, idx) => (
                  <div key={idx} className="clay-card p-4 bg-theme-tertiary/50">
                    {/* POS Header - Clickable to expand/collapse */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMeaning(idx);
                      }}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className={`text-accent ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`} />
                        <span className={`clay-badge bg-info-light text-info border-2 border-info/30 ${isLarge ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}>
                          {meaning.partOfSpeech}
                        </span>
                        <span className={`text-theme-tertiary ${isLarge ? 'text-sm' : 'text-xs'}`}>
                          ({meaning.definitions.length} {meaning.definitions.length === 1 ? 'definition' : 'definitions'})
                        </span>
                      </div>
                      {expandedMeanings.has(idx) ? (
                        <ChevronUp className={`text-theme-tertiary ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`} />
                      ) : (
                        <ChevronDown className={`text-theme-tertiary ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`} />
                      )}
                    </button>

                    {/* Definitions - Expanded content */}
                    {expandedMeanings.has(idx) && (
                      <div className={`mt-3 ${isLarge ? 'space-y-3' : 'space-y-2'}`}>
                        {meaning.definitions.slice(0, 3).map((def, defIdx) => (
                          <div key={defIdx} className={`pl-4 border-l-2 border-accent/30 ${isLarge ? 'py-2' : 'py-1'}`}>
                            <ClickableText
                              text={`${defIdx + 1}. ${def.definition}`}
                              className={`text-theme-primary ${isLarge ? 'text-base' : 'text-sm'}`}
                              highlightWord={word.word}
                            />
                            {def.example && (
                              <div className={`mt-2 flex items-start gap-2`}>
                                <Quote className={`text-accent shrink-0 ${isLarge ? 'w-4 h-4 mt-1' : 'w-3 h-3 mt-0.5'}`} />
                                <p className={`text-theme-secondary italic ${isLarge ? 'text-sm' : 'text-xs'}`}>
                                  "<ClickableText text={def.example} highlightWord={word.word} />"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                        {meaning.definitions.length > 3 && (
                          <p className={`text-theme-tertiary pl-4 ${isLarge ? 'text-sm' : 'text-xs'}`}>
                            +{meaning.definitions.length - 3} more definitions
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback to old definition display if no meanings */
              word.definition && (
                <div className="clay-card p-4 bg-theme-tertiary/50">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className={`text-accent ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    <p className={`text-theme-secondary font-semibold ${isLarge ? 'text-base' : 'text-sm'}`}>
                      {t('card.definition')}
                    </p>
                  </div>
                  <ClickableText
                    text={word.definition}
                    className={`text-theme-primary font-medium ${isLarge ? 'text-xl' : 'text-base'}`}
                    highlightWord={word.word}
                  />
                </div>
              )
            )}

            {/* Example - Only show if no meanings with examples */}
            {word.example && meanings.length === 0 && (
              <div className="clay-card p-4 bg-accent-light/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Quote className={`text-accent ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    <p className={`text-theme-secondary font-semibold ${isLarge ? 'text-base' : 'text-sm'}`}>
                      {t('card.example')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakExample();
                    }}
                    className={`clay-btn flex items-center justify-center ${
                      isExampleSpeaking ? 'clay-btn-primary' : ''
                    } ${isLarge ? 'w-10 h-10' : 'w-8 h-8'}`}
                    title={t('card.speakExample')}
                  >
                    <Volume2 className={isLarge ? 'h-5 w-5' : 'h-4 w-4'} />
                  </button>
                </div>
                <p className={`text-theme-primary italic font-medium ${isLarge ? 'text-lg' : 'text-base'}`}>
                  "<ClickableText text={word.example} highlightWord={word.word} />"
                </p>
              </div>
            )}

            {/* Etymology */}
            {word.etymology && (
              <div className="flex items-start gap-3">
                <div className={`clay-btn flex items-center justify-center shrink-0 ${isLarge ? 'w-10 h-10' : 'w-8 h-8'}`}>
                  <History className={`text-theme-secondary ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`} />
                </div>
                <div>
                  <p className={`text-theme-secondary font-semibold mb-1 ${isLarge ? 'text-base' : 'text-sm'}`}>
                    {t('card.etymology')}
                  </p>
                  <p className={`text-theme-secondary ${isLarge ? 'text-base' : 'text-sm'}`}>
                    {word.etymology}
                  </p>
                </div>
              </div>
            )}

            {/* Synonyms */}
            {word.synonyms && word.synonyms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className={`text-accent ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  <p className={`text-theme-secondary font-semibold ${isLarge ? 'text-base' : 'text-sm'}`}>
                    {t('card.synonyms')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {word.synonyms.map((s) => (
                    <span
                      key={s}
                      className={`clay-badge ${isLarge ? 'px-4 py-2' : ''}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Practice Button */}
            {onPractice && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPractice();
                }}
                className={`w-full clay-btn bg-linear-to-r from-purple-500 to-blue-500 text-white border-purple-600 font-semibold flex items-center justify-center gap-2 ${
                  isLarge ? 'py-4 text-lg' : 'py-3'
                }`}
              >
                <Sparkles className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
                {t('card.aiPractice')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
