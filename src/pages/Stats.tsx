import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, RotateCcw, Trophy, Target, TrendingUp, Sparkles } from 'lucide-react';
import { ProgressBar } from '../components';
import { useWordStore } from '../stores/wordStore';
import { useProgressStore } from '../stores/progressStore';
import { useUserStore } from '../stores/userStore';
import { useDevice } from '../hooks/useDevice';

export function Stats() {
  const { t } = useTranslation();
  const { isDesktop } = useDevice();
  const { isLoaded: wordsLoaded, loadWords, getTotalWordCount, getWordCountByLevel } = useWordStore();
  const { isLoaded: progressLoaded, loadProgress, getStats } = useProgressStore();
  const { stats: userStats, isLoaded: userLoaded, loadUser } = useUserStore();

  useEffect(() => {
    if (!wordsLoaded) loadWords();
    if (!progressLoaded) loadProgress();
    if (!userLoaded) loadUser();
  }, [wordsLoaded, progressLoaded, userLoaded, loadWords, loadProgress, loadUser]);

  if (!wordsLoaded || !progressLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="clay-card p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-theme-secondary font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const progressStats = getStats();
  const totalWords = getTotalWordCount();
  const learnedPercentage = Math.round((progressStats.total / totalWords) * 100);

  const levelConfig: Record<string, { gradient: string; bg: string }> = {
    A1: { gradient: 'from-green-400 to-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    A2: { gradient: 'from-emerald-400 to-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    B1: { gradient: 'from-yellow-400 to-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    B2: { gradient: 'from-orange-400 to-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    C1: { gradient: 'from-red-400 to-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    C2: { gradient: 'from-purple-400 to-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  };

  // Desktop Layout
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-theme-primary p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="w-8 h-8 text-accent" />
            <h1 className="text-2xl font-bold text-theme-primary">{t('stats.title')}</h1>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Left Column - Main Stats */}
            <div className="col-span-2 space-y-6">
              {/* Overview Card */}
              <div className="clay-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-lg font-medium text-theme-secondary mb-2">{t('stats.vocabulary')}</h2>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-bold text-theme-primary">{progressStats.total}</span>
                      <span className="text-xl text-theme-tertiary">/ {totalWords}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-24 h-24 rounded-full clay-card flex items-center justify-center bg-accent-light/50">
                      <span className="text-3xl font-bold text-accent">{learnedPercentage}%</span>
                    </div>
                  </div>
                </div>

                <ProgressBar current={progressStats.total} total={totalWords} showPercentage={false} color="teal" size="lg" />

                <div className="grid grid-cols-4 gap-4 mt-8">
                  <div className="clay-card p-4 bg-success-light/50 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-success" />
                    </div>
                    <p className="text-3xl font-bold text-success">{progressStats.mastered}</p>
                    <p className="text-xs text-theme-secondary mt-1">{t('stats.mastered')}</p>
                  </div>
                  <div className="clay-card p-4 bg-warning-light/50 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <RotateCcw className="w-5 h-5 text-warning" />
                    </div>
                    <p className="text-3xl font-bold text-warning">{progressStats.reviewing}</p>
                    <p className="text-xs text-theme-secondary mt-1">{t('stats.reviewing')}</p>
                  </div>
                  <div className="clay-card p-4 bg-info-light/50 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-info" />
                    </div>
                    <p className="text-3xl font-bold text-info">{progressStats.learning}</p>
                    <p className="text-xs text-theme-secondary mt-1">{t('stats.learning')}</p>
                  </div>
                  <div className="clay-card p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-theme-tertiary" />
                    </div>
                    <p className="text-3xl font-bold text-theme-secondary">{totalWords - progressStats.total}</p>
                    <p className="text-xs text-theme-tertiary mt-1">New</p>
                  </div>
                </div>
              </div>

              {/* CEFR Progress */}
              <div className="clay-card p-8">
                <h3 className="text-lg font-semibold text-theme-primary mb-6">CEFR Levels</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
                    const levelWordCount = getWordCountByLevel(level);
                    const config = levelConfig[level];
                    return (
                      <div key={level} className={`clay-card p-4 ${config.bg}`}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-lg font-bold text-theme-primary">{level}</span>
                          <span className="text-sm text-theme-secondary font-medium">{levelWordCount} {t('settings.words')}</span>
                        </div>
                        <div className="clay-progress h-3">
                          <div className={`clay-progress-bar bg-linear-to-r ${config.gradient} h-3`} style={{ width: '0%' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Quick Stats */}
            <div className="space-y-6">
              {/* Today Stats */}
              <div className="clay-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-theme-primary">{t('stats.daily')}</h3>
                </div>
                <div className="space-y-4">
                  <div className="clay-card p-4 bg-info-light/50 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-info/20 flex items-center justify-center">
                      <BookOpen className="w-7 h-7 text-info" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-info">{userStats.todayLearned}</p>
                      <p className="text-sm text-theme-secondary">{t('stats.todayLearned')}</p>
                    </div>
                  </div>
                  <div className="clay-card p-4 bg-success-light/50 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center">
                      <RotateCcw className="w-7 h-7 text-success" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-success">{userStats.todayReviewed}</p>
                      <p className="text-sm text-theme-secondary">{t('stats.todayReviewed')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Goal */}
              <div className="clay-card p-6">
                <h3 className="text-sm font-medium text-theme-secondary mb-3">{t('settings.dailyGoal')}</h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-theme-primary">{userStats.dailyGoal}</p>
                  <span className="text-theme-secondary">{t('settings.words')}</span>
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
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-accent" />
          <h1 className="text-xl font-bold text-theme-primary">{t('stats.title')}</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Overview */}
        <div className="clay-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-theme-secondary mb-3">{t('stats.vocabulary')}</h3>
            <div className="flex items-end justify-between mb-3">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-theme-primary">{progressStats.total}</span>
                <span className="text-theme-tertiary mb-1">/ {totalWords}</span>
              </div>
              <div className="w-16 h-16 rounded-full clay-card flex items-center justify-center bg-accent-light/50">
                <span className="text-lg font-bold text-accent">{learnedPercentage}%</span>
              </div>
            </div>
            <ProgressBar current={progressStats.total} total={totalWords} showPercentage={false} color="teal" size="lg" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="clay-card p-3 bg-success-light/50 text-center">
              <Trophy className="w-4 h-4 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-success">{progressStats.mastered}</p>
              <p className="text-xs text-theme-secondary">{t('stats.mastered')}</p>
            </div>
            <div className="clay-card p-3 bg-warning-light/50 text-center">
              <RotateCcw className="w-4 h-4 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold text-warning">{progressStats.reviewing}</p>
              <p className="text-xs text-theme-secondary">{t('stats.reviewing')}</p>
            </div>
            <div className="clay-card p-3 bg-info-light/50 text-center">
              <BookOpen className="w-4 h-4 text-info mx-auto mb-1" />
              <p className="text-2xl font-bold text-info">{progressStats.learning}</p>
              <p className="text-xs text-theme-secondary">{t('stats.learning')}</p>
            </div>
          </div>
        </div>

        {/* Today Stats */}
        <div className="clay-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-theme-primary">{t('stats.daily')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="clay-card p-4 bg-info-light/50 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-primary">{userStats.todayLearned}</p>
                <p className="text-xs text-theme-secondary">{t('stats.todayLearned')}</p>
              </div>
            </div>
            <div className="clay-card p-4 bg-success-light/50 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-primary">{userStats.todayReviewed}</p>
                <p className="text-xs text-theme-secondary">{t('stats.todayReviewed')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CEFR Levels */}
        <div className="clay-card p-6">
          <h3 className="font-semibold text-theme-primary mb-4">CEFR Levels</h3>
          <div className="space-y-3">
            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
              const levelWordCount = getWordCountByLevel(level);
              const config = levelConfig[level];
              return (
                <div key={level}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-theme-primary">{level}</span>
                    <span className="text-theme-secondary">{levelWordCount} {t('settings.words')}</span>
                  </div>
                  <div className="clay-progress h-2">
                    <div className={`clay-progress-bar bg-linear-to-r ${config.gradient} h-2`} style={{ width: '0%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
