import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, Sparkles, Target, CheckCircle2, XCircle, Keyboard, MessageCircle } from 'lucide-react';
import { WordCard, ProgressBar, ResponseButtons, AIChatDialog, SyncIndicator } from '../components';
import { useWordStore } from '../stores/wordStore';
import { useProgressStore } from '../stores/progressStore';
import { useUserStore } from '../stores/userStore';
import { useSettingsStore } from '../stores/themeStore';
import { useDevice } from '../hooks/useDevice';
import { calculateXP } from '../algorithms/sm2';
import { getItem, setItem, removeItem, getTodayString } from '../utils/storage';
import { aiService } from '../services/aiService';
import type { ResponseQuality } from '../types';

type LearningPhase = 'new' | 'review';

// Session storage key
const SESSION_KEY = 'learn_session';

interface LearnSession {
  date: string;
  studyWords: string[];
  reviewWords: string[];
  currentPhase: LearningPhase;
  currentIndex: number;
  sessionStats: {
    newLearned: number;
    reviewed: number;
    correct: number;
    wrong: number;
    xpEarned: number;
  };
}

export function Learn() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDesktop } = useDevice();

  // Stores
  const { isLoaded: wordsLoaded, loadWords, getWord, getWordIds, ensureWordsLoaded } = useWordStore();
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

  // Session state - combined into single object to avoid multiple setState calls
  interface SessionState {
    studyWords: string[];
    reviewWords: string[];
    currentPhase: LearningPhase;
    currentIndex: number;
    sessionStats: {
      newLearned: number;
      reviewed: number;
      correct: number;
      wrong: number;
      xpEarned: number;
    };
    initialized: boolean;
    sessionComplete: boolean;
  }

  const [session, setSession] = useState<SessionState>({
    studyWords: [],
    reviewWords: [],
    currentPhase: 'new',
    currentIndex: 0,
    sessionStats: { newLearned: 0, reviewed: 0, correct: 0, wrong: 0, xpEarned: 0 },
    initialized: false,
    sessionComplete: false,
  });

  const [showAnswer, setShowAnswer] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const sessionSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  // AI Chat handler
  const handleSendMessage = useCallback(async (message: string, context: string) => {
    setIsChatLoading(true);
    try {
      const reply = await aiService.chat(message, context, settings.language);
      return reply;
    } finally {
      setIsChatLoading(false);
    }
  }, [settings.language]);

  // Destructure for easier access
  const { studyWords, reviewWords, currentPhase, currentIndex, sessionStats, initialized, sessionComplete } = session;

  // Save session to localStorage (debounced)
  const saveSession = useCallback(() => {
    if (sessionSaveTimeoutRef.current) {
      clearTimeout(sessionSaveTimeoutRef.current);
    }
    sessionSaveTimeoutRef.current = setTimeout(() => {
      const sessionData: LearnSession = {
        date: getTodayString(),
        studyWords: session.studyWords,
        reviewWords: session.reviewWords,
        currentPhase: session.currentPhase,
        currentIndex: session.currentIndex,
        sessionStats: session.sessionStats,
      };
      setItem(SESSION_KEY, sessionData);
    }, 100);
  }, [session]);

  // Clear session when complete
  const clearSession = useCallback(() => {
    removeItem(SESSION_KEY);
  }, []);

  // Load data on mount
  useEffect(() => {
    if (!wordsLoaded) loadWords();
    if (!progressLoaded) loadProgress();
    if (!userLoaded) loadUser();
    if (!settingsLoaded) loadSettings();
  }, [wordsLoaded, progressLoaded, userLoaded, settingsLoaded, loadWords, loadProgress, loadUser, loadSettings]);

  // Initialize learning session - try to restore from saved session first
  useEffect(() => {
    if (wordsLoaded && progressLoaded && settingsLoaded && userLoaded && !initRef.current && !session.sessionComplete) {
      initRef.current = true;
      const today = getTodayString();
      const savedSession = getItem<LearnSession | null>(SESSION_KEY, null);

      // Check if we have a valid saved session from today
      // Also validate that total words is reasonable (not more than 2x daily goal + 10 buffer)
      const maxSessionWords = stats.dailyGoal * 2 + 10;
      const savedSessionValid = savedSession
        && savedSession.date === today
        && savedSession.studyWords.length + savedSession.reviewWords.length > 0
        && savedSession.studyWords.length + savedSession.reviewWords.length <= maxSessionWords;

      if (savedSessionValid) {
        // Restore saved session using single setState
        // This is intentional initialization from localStorage, not a cascading render
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession({
          studyWords: savedSession.studyWords,
          reviewWords: savedSession.reviewWords,
          currentPhase: savedSession.currentPhase,
          currentIndex: savedSession.currentIndex,
          sessionStats: savedSession.sessionStats,
          initialized: true,
          sessionComplete: false,
        });
      } else {
        // Create new session
        const wordIds = getWordIds();
        // Calculate remaining new words for today (consider already learned today)
        const remainingNewWords = Math.max(0, stats.dailyGoal - stats.todayLearned);
        const newWords = remainingNewWords > 0 ? getNewWords(wordIds, remainingNewWords) : [];
        // Limit review words to be proportional to daily goal (max 1:1 ratio)
        const reviewLimit = Math.max(stats.dailyGoal, 10);
        const dueWords = getWordsToReview(reviewLimit);

        // Mark new words as learning (only those not already marked)
        newWords.forEach((id) => startLearning(id));

        // Set initial phase based on settings
        let initialPhase: LearningPhase = 'new';
        if (settings.learnOrder === 'review-first' && dueWords.length > 0) {
          initialPhase = 'review';
        } else if (newWords.length === 0 && dueWords.length > 0) {
          initialPhase = 'review';
        }

        setSession({
          studyWords: newWords,
          reviewWords: dueWords,
          currentPhase: initialPhase,
          currentIndex: 0,
          sessionStats: { newLearned: 0, reviewed: 0, correct: 0, wrong: 0, xpEarned: 0 },
          initialized: true,
          sessionComplete: false,
        });
      }
    }
  }, [wordsLoaded, progressLoaded, settingsLoaded, userLoaded, getWordIds, stats.dailyGoal, stats.todayLearned, settings.learnOrder, getNewWords, getWordsToReview, startLearning, session.sessionComplete]);

  // Load full word data for current session
  useEffect(() => {
    if (initialized && (studyWords.length > 0 || reviewWords.length > 0)) {
      const allSessionWords = [...studyWords, ...reviewWords];
      ensureWordsLoaded(allSessionWords);
    }
  }, [initialized, studyWords, reviewWords, ensureWordsLoaded]);

  // Save session whenever relevant state changes
  useEffect(() => {
    if (initialized && !sessionComplete && (studyWords.length > 0 || reviewWords.length > 0)) {
      saveSession();
    }
  }, [initialized, sessionComplete, studyWords, reviewWords, currentPhase, currentIndex, sessionStats, saveSession]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionSaveTimeoutRef.current) {
        clearTimeout(sessionSaveTimeoutRef.current);
      }
    };
  }, []);

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
        setSession((prev) => ({
          ...prev,
          sessionStats: {
            ...prev.sessionStats,
            newLearned: prev.sessionStats.newLearned + 1,
            xpEarned: prev.sessionStats.xpEarned + xp,
          },
        }));
      } else {
        recordReview();
        if (quality === 'easy') {
          recordMastered();
        }
        setSession((prev) => ({
          ...prev,
          sessionStats: {
            ...prev.sessionStats,
            reviewed: prev.sessionStats.reviewed + 1,
            correct: prev.sessionStats.correct + (quality !== 'forgot' ? 1 : 0),
            wrong: prev.sessionStats.wrong + (quality === 'forgot' ? 1 : 0),
            xpEarned: prev.sessionStats.xpEarned + xp,
          },
        }));
      }

      // Move to next word
      if (currentIndex < currentWordList.length - 1) {
        setSession((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
        setShowAnswer(false);
      } else {
        // Current phase complete, switch to next phase or finish
        if (currentPhase === 'new' && reviewWords.length > 0) {
          setSession((prev) => ({ ...prev, currentPhase: 'review', currentIndex: 0 }));
          setShowAnswer(false);
        } else if (currentPhase === 'review' && settings.learnOrder === 'review-first' && studyWords.length > 0) {
          setSession((prev) => ({ ...prev, currentPhase: 'new', currentIndex: 0 }));
          setShowAnswer(false);
        } else {
          setSession((prev) => ({ ...prev, sessionComplete: true }));
          clearSession();
        }
      }
    },
    [currentWordId, currentIndex, currentWordList.length, currentPhase, reviewWords.length, studyWords.length, settings.learnOrder, updateProgress, addXP, recordLearn, recordReview, recordMastered, clearSession]
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
              <p className="text-3xl font-bold text-warning">+{sessionStats.xpEarned}</p>
              <p className="text-xs text-theme-secondary mt-1">XP</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                clearSession();
                initRef.current = false;
                setSession({
                  studyWords: [],
                  reviewWords: [],
                  currentPhase: 'new',
                  currentIndex: 0,
                  sessionStats: { newLearned: 0, reviewed: 0, correct: 0, wrong: 0, xpEarned: 0 },
                  initialized: false,
                  sessionComplete: false,
                });
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

  const aiConfigured = aiService.isConfigured();

  // Desktop Layout
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-theme-primary p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-theme-primary">{t('learn.title')}</h1>
                <span className={`clay-badge ${
                  currentPhase === 'new'
                    ? 'bg-info-light text-info border-2 border-info/30'
                    : 'bg-success-light text-success border-2 border-success/30'
                }`}>
                  {currentPhase === 'new' ? t('learn.newWords') : t('learn.review')}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <SyncIndicator />
                {aiConfigured && (
                <button
                  onClick={() => setShowChat(!showChat)}
                  className={`clay-btn flex items-center gap-2 px-4 py-2 ${
                    showChat ? 'clay-btn-primary' : ''
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{t('ai.chatTitle', 'AI 助教')}</span>
                </button>
                )}
              </div>
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

        {/* AI Chat Dialog */}
        <AIChatDialog
          word={currentWord || null}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
        />
      </div>
    );
  }

  // Mobile Layout
  return (
    <div className="min-h-screen pb-24 bg-theme-primary">
      <header className="clay-float mx-4 mt-4 p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className={`clay-badge text-xs ${
              currentPhase === 'new'
                ? 'bg-info-light text-info border-2 border-info/30'
                : 'bg-success-light text-success border-2 border-success/30'
            }`}>
              {currentPhase === 'new' ? t('learn.newWords') : t('learn.review')}
            </span>
            <SyncIndicator />
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

      {/* Floating AI Chat Button */}
      {aiConfigured && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-28 right-4 w-14 h-14 clay-btn clay-btn-primary rounded-full flex items-center justify-center shadow-lg z-40"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* AI Chat Dialog */}
      <AIChatDialog
        word={currentWord || null}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
      />
    </div>
  );
}
