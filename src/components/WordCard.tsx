import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, Sparkles, BookOpen, Quote, History, Link2 } from 'lucide-react';
import type { Word } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { ClickableText } from './ClickableText';

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

  const isLarge = size === 'large';
  const isWordSpeaking = audioPlaying || speakingId === 'word';
  const isExampleSpeaking = speakingId === 'example';

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
            showAnswer ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`border-t-3 border-theme pt-6 ${isLarge ? 'space-y-6' : 'space-y-4'}`}>
            {/* Definition */}
            {word.definition && (
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
            )}

            {/* Example */}
            {word.example && (
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
