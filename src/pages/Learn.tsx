import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, Sparkles, Target, CheckCircle2, XCircle, Keyboard } from 'lucide-react';
import { WordCard, ProgressBar, ResponseButtons } from '../components';
import { useWordStore } from '../stores/wordStore';
import { useProgressStore } from '../stores/progressStore';
import { useUserStore } from '../stores/userStore';
import { useSettingsStore } from '../stores/themeStore';
import { useDevice } from '../hooks/useDevice';
import { calculateXP } from '../algorithms/sm2';
import type { ResponseQuality } from '../types';

type LearningPhase = 'new' | 'review';

export function Learn() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDesktop } = useDevice();

  // Stores
  const { words, isLoaded: wordsLoaded, loadWords, getWord } = useWordStore();
  const {
    isLoaded: progressLoaded,
    loadProgress,
    getNewWords,
    getWordsToReview,
    updateProgress,
    startLearning,
  } = useProgressStore();
  const {
    stats,
    isLoaded: userLoaded,
    loadUser,
    addXP,
    recordLearn,
    recordReview,
    recordMastered,
  } = useUserStore();
  const { settings, isLoaded: settingsLoaded, loadSettings } = useSettingsStore();

  // Local state
  const [currentPhase, setCurrentPhase] = useState<LearningPhase>('new');
  const [studyWords, setStudyWords] = useState<string[]>([]);
  const [reviewWords, setReviewWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    newLearned: 0,
    reviewed: 0,
    correct: 0,
    wrong: 0,
    xpEarned: 0,
  });

  // Load data on mount
  useEffect(() => {
    if (!wordsLoaded) loadWords();
    if (!progressLoaded) loadProgress();
    if (!userLoaded) loadUser();
    if (!settingsLoaded) loadSettings();
  }, [wordsLoaded, progressLoaded, userLoaded, settingsLoaded, loadWords, loadProgress, loadUser, loadSettings]);

  // Initialize learning session based on settings
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (wordsLoaded && progressLoaded && settingsLoaded && !initialized && !sessionComplete) {
      const wordIds = words.map((w) => w.id);
      const newWords = getNewWords(wordIds, stats.dailyGoal);
      const dueWords = getWordsToReview(50);

      // Mark new words as learning
      newWords.forEach((id) => startLearning(id));

      // Batch state updates
      const updates = () => {
        setStudyWords(newWords);
        setReviewWords(dueWords);
        setInitialized(true);

        // Set initial phase based on settings
        if (settings.learnOrder === 'review-first' && dueWords.length > 0) {
          setCurrentPhase('review');
        } else if (newWords.length > 0) {
          setCurrentPhase('new');
        } else if (dueWords.length > 0) {
          setCurrentPhase('review');
        }
      };

      updates();
    }
  }, [wordsLoaded, progressLoaded, settingsLoaded, words, stats.dailyGoal, settings.learnOrder, getNewWords, getWordsToReview, startLearning, initialized, sessionComplete]);

  // Get current word list and word
  const currentWordList = currentPhase === 'new' ? studyWords : reviewWords;
  const currentWordId = currentWordList[currentIndex];
  const currentWord = currentWordId ? getWord(currentWordId) : undefined;

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  const handleResponse = useCallback(
    (quality: ResponseQuality) => {
      if (!currentWordId) return;

      updateProgress(currentWordId, quality);
      const xp = calculateXP(quality, currentPhase === 'review');
      addXP(xp);

      if (currentPhase === 'new') {
        recordLearn();
        setSessionStats((prev) => ({
          ...prev,
          newLearned: prev.newLearned + 1,
          xpEarned: prev.xpEarned + xp,
        }));
      } else {
        recordReview();
        if (quality === 'easy') {
          recordMastered();
        }
        setSessionStats((prev) => ({
          ...prev,
          reviewed: prev.reviewed + 1,
          correct: prev.correct + (quality !== 'forgot' ? 1 : 0),
          wrong: prev.wrong + (quality === 'forgot' ? 1 : 0),
          xpEarned: prev.xpEarned + xp,
        }));
      }

      // Move to next word
      if (currentIndex < currentWordList.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Current phase complete, switch to next phase or finish
        if (currentPhase === 'new' && reviewWords.length > 0) {
          setCurrentPhase('review');
          setCurrentIndex(0);
          setShowAnswer(false);
        } else if (currentPhase === 'review' && settings.learnOrder === 'review-first' && studyWords.length > 0) {
          setCurrentPhase('new');
          setCurrentIndex(0);
          setShowAnswer(false);
        } else {
          setSessionComplete(true);
        }
      }
    },
    [currentWordId, currentIndex, currentWordList.length, currentPhase, reviewWords.length, studyWords.length, settings.learnOrder, updateProgress, addXP, recordLearn, recordReview, recordMastered]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionComplete) return;
      if (e.code === 'Space' && !showAnswer) {
        e.preventDefault();
        setShowAnswer(true);
      } else if (showAnswer) {
        const keyMap: Record<string, ResponseQuality> = {
          '1': 'forgot',
          '2': 'hard',
          '3': 'good',
          '4': 'easy',
        };
        if (keyMap[e.key]) {
          handleResponse(keyMap[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, sessionComplete, handleResponse]);

  // Loading state
  if (!wordsLoaded || !progressLoaded || !userLoaded || !settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="clay-card p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-theme-secondary font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // No words to learn or review
  if (studyWords.length === 0 && reviewWords.length === 0 && !sessionComplete) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDesktop ? '' : 'pb-24'}`}>
        <div className="clay-card p-8 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-light flex items-center justify-center">
            <Trophy className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-theme-primary mb-2">{t('learn.noWords')}</h2>
          <p className="text-theme-secondary mb-6">{t('learn.noWordsDesc')}</p>
          <button
            onClick={() => navigate('/stats')}
            className="clay-btn clay-btn-primary px-8 py-3 font-semibold"
          >
            {t('learn.toStats')}
          </button>
        </div>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    const accuracy = sessionStats.correct + sessionStats.wrong > 0
      ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.wrong)) * 100)
      : 100;

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDesktop ? '' : 'pb-24'}`}>
        <div className="clay-card p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning-light flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-warning" />
          </div>
          <h2 className="text-2xl font-bold text-theme-primary mb-6">{t('learn.complete')}</h2>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="clay-card p-4 bg-info-light/50">
              <p className="text-3xl font-bold text-info">{sessionStats.newLearned}</p>
              <p className="text-xs text-theme-secondary mt-1">{t('learn.newWords')}</p>
            </div>
            <div className="clay-card p-4 bg-success-light/50">
              <p className="text-3xl font-bold text-success">{sessionStats.reviewed}</p>
              <p className="text-xs text-theme-secondary mt-1">{t('learn.review')}</p>
            </div>
            <div className="clay-card p-4 bg-warning-light/50">
              <p className="text-3xl font-bold text-warning">{accuracy}%</p>
              <p className="text-xs text-theme-secondary mt-1">{t('learn.accuracy')}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStudyWords([]);
                setReviewWords([]);
                setCurrentIndex(0);
                setSessionComplete(false);
                setSessionStats({ newLearned: 0, reviewed: 0, correct: 0, wrong: 0, xpEarned: 0 });
                setInitialized(false);
              }}
              className="flex-1 clay-btn py-3 font-semibold"
            >
              {t('learn.continue')}
            </button>
            <button
              onClick={() => navigate('/stats')}
              className="flex-1 clay-btn clay-btn-primary py-3 font-semibold"
            >
              {t('learn.toStats')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalWords = studyWords.length + reviewWords.length;
  const currentProgress = currentPhase === 'new'
    ? currentIndex + 1
    : studyWords.length + currentIndex + 1;

  // Desktop Layout
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-theme-primary p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold text-theme-primary">{t('learn.title')}</h1>
              <span className={`clay-badge ${
                currentPhase === 'new'
                  ? 'bg-info-light text-info border-2 border-info/30'
                  : 'bg-success-light text-success border-2 border-success/30'
              }`}>
                {currentPhase === 'new' ? t('learn.newWords') : t('learn.review')}
              </span>
            </div>
            <ProgressBar
              current={currentProgress}
              total={totalWords}
              label={t('learn.progress')}
              color={currentPhase === 'new' ? 'blue' : 'green'}
              size="lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Word Card */}
            <div className="col-span-2">
              {currentWord && (
                <WordCard word={currentWord} showAnswer={showAnswer} onFlip={handleFlip} size="large" />
              )}
              {showAnswer && (
                <div className="mt-6">
                  <ResponseButtons onResponse={handleResponse} />
                </div>
              )}
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-6">
              {/* Session Stats */}
              <div className="clay-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-theme-primary">{t('learn.sessionStats')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="clay-card p-3 bg-info-light/50 text-center">
                    <p className="text-2xl font-bold text-info">{sessionStats.newLearned}</p>
                    <p className="text-xs text-theme-secondary">{t('learn.newWords')}</p>
                  </div>
                  <div className="clay-card p-3 bg-success-light/50 text-center">
                    <p className="text-2xl font-bold text-success">{sessionStats.reviewed}</p>
                    <p className="text-xs text-theme-secondary">{t('learn.review')}</p>
                  </div>
                </div>
                {sessionStats.reviewed > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="clay-card p-3 bg-success-light/30 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <p className="text-xl font-bold text-success">{sessionStats.correct}</p>
                      </div>
                      <p className="text-xs text-theme-secondary">{t('learn.correct')}</p>
                    </div>
                    <div className="clay-card p-3 bg-error-light/30 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="w-4 h-4 text-error" />
                        <p className="text-xl font-bold text-error">{sessionStats.wrong}</p>
                      </div>
                      <p className="text-xs text-theme-secondary">{t('learn.wrong')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Keyboard Shortcuts */}
              <div className="clay-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Keyboard className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-theme-primary">{t('shortcuts.title')}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-theme-secondary">{t('shortcuts.showAnswer')}</span>
                    <kbd className="clay-badge bg-theme-tertiary px-3 py-1 text-xs font-mono">Space</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-theme-secondary">{t('shortcuts.forgot')}</span>
                    <kbd className="clay-badge bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300 px-3 py-1 text-xs font-mono">1</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-theme-secondary">{t('shortcuts.hard')}</span>
                    <kbd className="clay-badge bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300 px-3 py-1 text-xs font-mono">2</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-theme-secondary">{t('shortcuts.good')}</span>
                    <kbd className="clay-badge bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300 px-3 py-1 text-xs font-mono">3</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-theme-secondary">{t('shortcuts.easy')}</span>
                    <kbd className="clay-badge bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 px-3 py-1 text-xs font-mono">4</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Layout
  return (
    <div className="min-h-screen pb-24 bg-theme-primary">
      <header className="clay-float mx-4 mt-4 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className={`clay-badge text-xs ${
              currentPhase === 'new'
                ? 'bg-info-light text-info border-2 border-info/30'
                : 'bg-success-light text-success border-2 border-success/30'
            }`}>
              {currentPhase === 'new' ? t('learn.newWords') : t('learn.review')}
            </span>
          </div>
          <ProgressBar
            current={currentProgress}
            total={totalWords}
            label={t('learn.progress')}
            color={currentPhase === 'new' ? 'blue' : 'green'}
          />
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {currentWord && (
          <div className="mb-6">
            <WordCard word={currentWord} showAnswer={showAnswer} onFlip={handleFlip} />
          </div>
        )}
        {showAnswer && (
          <div className="mb-6">
            <ResponseButtons onResponse={handleResponse} />
          </div>
        )}
        <div className="clay-card p-4">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-info">{sessionStats.newLearned}</p>
              <p className="text-xs text-theme-secondary">{t('learn.newWords')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{sessionStats.reviewed}</p>
              <p className="text-xs text-theme-secondary">{t('learn.review')}</p>
            </div>
            {sessionStats.reviewed > 0 && (
              <div>
                <p className="text-2xl font-bold text-error">{sessionStats.wrong}</p>
                <p className="text-xs text-theme-secondary">{t('learn.wrong')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
