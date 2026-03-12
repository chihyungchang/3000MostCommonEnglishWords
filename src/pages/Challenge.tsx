import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Zap,
  Trophy,
  Play,
  Award,
  Target,
  Clock,
  Star,
  XCircle,
} from "lucide-react";
import { useSettingsStore } from "../stores/themeStore";
import { useDevice } from "../hooks/useDevice";
import translations from "../data/translations.json";

type TranslationMap = Record<string, Record<string, string>>;

interface WordPair {
  word: string;
  translation: string;
  id: number;
  matched?: boolean;
  replacing?: boolean;
}

interface ChallengeStats {
  highestLevel: number;
  totalGames: number;
  totalCorrect: number;
}

const STATS_KEY = "challenge_stats_v2";
const LEVEL_TIME = 180; // 3 minutes in seconds
const WORD_COUNT = 6;

// Required accuracy for each level (50% to 99%)
const LEVEL_REQUIREMENTS = [
  0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.99,
];

function loadStats(): ChallengeStats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore parse errors
  }
  return { highestLevel: 0, totalGames: 0, totalCorrect: 0 };
}

function saveStats(stats: ChallengeStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// Play sound effect (defined outside component to avoid declaration order issues)
function playSound(type: "match" | "combo" | "wrong") {
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "match") {
      osc.frequency.value = 520;
      gain.gain.value = 0.1;
    } else if (type === "combo") {
      osc.frequency.value = 780;
      gain.gain.value = 0.15;
    } else {
      osc.frequency.value = 200;
      gain.gain.value = 0.1;
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // audio not supported
  }
}

export function Challenge() {
  const { t } = useTranslation();
  const { isDesktop } = useDevice();
  const { settings } = useSettingsStore();
  const lang = settings.language === "en" ? "zh" : settings.language;

  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(LEVEL_TIME);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState<number | null>(
    null,
  );
  const [gameWords, setGameWords] = useState<WordPair[]>([]);
  const [shuffledTranslations, setShuffledTranslations] = useState<WordPair[]>(
    [],
  );
  const [wrongPair, setWrongPair] = useState<{
    word: number;
    trans: number;
  } | null>(null);
  const [showComboAnimation, setShowComboAnimation] = useState(false);
  const [showLevelResult, setShowLevelResult] = useState<
    "success" | "fail" | null
  >(null);
  const [stats, setStats] = useState<ChallengeStats>(loadStats);

  const nextIdRef = useRef(WORD_COUNT);
  const allWordsRef = useRef<string[]>([]);
  const usedWordsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get all available words
  const getAllWords = useCallback(() => {
    return Object.keys(translations as TranslationMap);
  }, []);

  // Get a random unused word
  const getRandomWord = useCallback((): WordPair | null => {
    let available = allWordsRef.current.filter(
      (w) => !usedWordsRef.current.has(w),
    );
    if (available.length === 0) {
      // Reset used words if we've used them all
      usedWordsRef.current.clear();
      available = allWordsRef.current;
    }
    if (available.length === 0) return null;

    const word = available[Math.floor(Math.random() * available.length)];
    usedWordsRef.current.add(word);
    const id = nextIdRef.current++;
    return {
      word,
      translation: (translations as TranslationMap)[word]?.[lang] || word,
      id,
    };
  }, [lang]);

  // Initialize game words
  const initGameWords = useCallback(() => {
    allWordsRef.current = getAllWords().sort(() => Math.random() - 0.5);
    usedWordsRef.current.clear();
    nextIdRef.current = WORD_COUNT;

    const words: WordPair[] = [];
    for (let i = 0; i < WORD_COUNT; i++) {
      const word = allWordsRef.current[i];
      usedWordsRef.current.add(word);
      words.push({
        word,
        translation: (translations as TranslationMap)[word]?.[lang] || word,
        id: i,
      });
    }
    setGameWords(words);
    setShuffledTranslations([...words].sort(() => Math.random() - 0.5));
  }, [getAllWords, lang]);

  // Start game
  const startGame = useCallback(() => {
    setIsPlaying(true);
    setLevel(1);
    setTimeLeft(LEVEL_TIME);
    setCorrect(0);
    setTotal(0);
    setCombo(0);
    setMaxCombo(0);
    setShowLevelResult(null);
    initGameWords();
  }, [initGameWords]);

  // Check level result
  const checkLevelResult = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const accuracy = total > 0 ? correct / total : 0;
    const required = LEVEL_REQUIREMENTS[level - 1] || 0.99;

    if (accuracy >= required && total >= 5) {
      // Level passed
      setShowLevelResult("success");
      playSound("combo");

      // Update stats
      const newStats = {
        ...stats,
        highestLevel: Math.max(stats.highestLevel, level),
        totalGames: stats.totalGames + 1,
        totalCorrect: stats.totalCorrect + correct,
      };
      setStats(newStats);
      saveStats(newStats);
    } else {
      // Level failed
      setShowLevelResult("fail");
      playSound("wrong");

      const newStats = {
        ...stats,
        totalGames: stats.totalGames + 1,
        totalCorrect: stats.totalCorrect + correct,
      };
      setStats(newStats);
      saveStats(newStats);
    }
  }, [level, correct, total, stats]);

  // Timer effect
  useEffect(() => {
    if (isPlaying && !showLevelResult) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - schedule level result check
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isPlaying, showLevelResult]);

  // Handle time up - use a separate effect that triggers on timeLeft becoming 0
  const prevTimeLeftRef = useRef(timeLeft);
  useEffect(() => {
    const wasPositive = prevTimeLeftRef.current > 0;
    prevTimeLeftRef.current = timeLeft;

    if (wasPositive && timeLeft === 0 && isPlaying && !showLevelResult) {
      // Use setTimeout to avoid synchronous setState cascade
      setTimeout(() => {
        checkLevelResult();
      }, 0);
    }
  }, [timeLeft, isPlaying, showLevelResult, checkLevelResult]);

  // Continue to next level
  const nextLevel = useCallback(() => {
    if (level >= 10) {
      // Game complete!
      setIsPlaying(false);
      setShowLevelResult(null);
      return;
    }
    setLevel((l) => l + 1);
    setTimeLeft(LEVEL_TIME);
    setCorrect(0);
    setTotal(0);
    setCombo(0);
    setShowLevelResult(null);
    initGameWords();
  }, [level, initGameWords]);

  // Restart from level 1
  const restartGame = useCallback(() => {
    setShowLevelResult(null);
    startGame();
  }, [startGame]);

  // Exit to home
  const exitGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setShowLevelResult(null);
  }, []);

  // Replace a matched word with a new one
  const replaceWord = useCallback(
    (matchedId: number) => {
      const newWord = getRandomWord();
      if (!newWord) return;

      // Update words list
      setGameWords((prev) =>
        prev.map((w) =>
          w.id === matchedId ? { ...newWord, replacing: true } : w,
        ),
      );

      // Update translations list - find where the matched word is and replace
      setShuffledTranslations((prev) => {
        const idx = prev.findIndex((t) => t.id === matchedId);
        if (idx === -1) return prev;
        const newArr = [...prev];
        newArr[idx] = { ...newWord };
        return newArr;
      });

      // Remove replacing animation after a moment
      setTimeout(() => {
        setGameWords((prev) =>
          prev.map((w) =>
            w.id === newWord.id ? { ...w, replacing: false } : w,
          ),
        );
      }, 300);
    },
    [getRandomWord],
  );

  // Check match
  const checkMatch = useCallback(
    (wordId: number, transId: number) => {
      if (wordId === transId) {
        // Correct match
        setCorrect((c) => c + 1);
        setTotal((t) => t + 1);

        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo > maxCombo) setMaxCombo(newCombo);

        // Mark as matched
        setGameWords((prev) =>
          prev.map((w) => (w.id === wordId ? { ...w, matched: true } : w)),
        );
        setShuffledTranslations((prev) =>
          prev.map((t) => (t.id === transId ? { ...t, matched: true } : t)),
        );

        // Combo animation at multiples of 5
        if (newCombo > 0 && newCombo % 5 === 0) {
          playSound("combo");
          setShowComboAnimation(true);
          setTimeout(() => setShowComboAnimation(false), 1500);
        } else {
          playSound("match");
        }

        // Replace word after 1 second
        setTimeout(() => {
          replaceWord(wordId);
        }, 1000);
      } else {
        // Wrong match
        playSound("wrong");
        setTotal((t) => t + 1);
        setCombo(0);
        setWrongPair({ word: wordId, trans: transId });
        setTimeout(() => setWrongPair(null), 500);
      }

      setSelectedWord(null);
      setSelectedTranslation(null);
    },
    [combo, maxCombo, replaceWord],
  );

  // Handle word click
  const handleWordClick = (id: number) => {
    const word = gameWords.find((w) => w.id === id);
    if (word?.matched) return;
    setSelectedWord(id);
    if (selectedTranslation !== null) {
      checkMatch(id, selectedTranslation);
    }
  };

  // Handle translation click
  const handleTranslationClick = (id: number) => {
    const trans = shuffledTranslations.find((t) => t.id === id);
    if (trans?.matched) return;
    setSelectedTranslation(id);
    if (selectedWord !== null) {
      checkMatch(selectedWord, id);
    }
  };

  const isComboMode = combo >= 5;
  const comboColor = isComboMode
    ? "from-orange-500 to-red-500"
    : "from-teal-500 to-teal-600";
  const currentAccuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const requiredAccuracy = Math.round(LEVEL_REQUIREMENTS[level - 1] * 100);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Home view - show stats and start button
  const homeView = (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-3">
        <div className="clay-card p-5 text-center">
          <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-theme-primary">
            Lv.{stats.highestLevel}
          </p>
          <p className="text-sm text-theme-secondary">
            {t("challenge.highestLevel")}
          </p>
        </div>
        <div className="clay-card p-5 text-center">
          <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-theme-primary">
            {stats.totalCorrect}
          </p>
          <p className="text-sm text-theme-secondary">
            {t("challenge.totalCorrect")}
          </p>
        </div>
        <div className="clay-card p-5 text-center">
          <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-theme-primary">
            {stats.totalGames}
          </p>
          <p className="text-sm text-theme-secondary">
            {t("challenge.gamesPlayed")}
          </p>
        </div>
      </div>

      {/* Level Requirements */}
      <div className="clay-card p-6">
        <h3 className="font-semibold text-theme-primary mb-4">
          {t("challenge.levelRequirements")}
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {LEVEL_REQUIREMENTS.map((req, i) => (
            <div
              key={i}
              className={`text-center p-2 rounded-lg ${
                stats.highestLevel > i
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                  : "bg-theme-tertiary text-theme-secondary"
              }`}
            >
              <p className="text-xs font-medium">Lv.{i + 1}</p>
              <p className="text-sm font-bold">{Math.round(req * 100)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* How to play */}
      <div className="clay-card p-6">
        <h3 className="font-semibold text-theme-primary mb-3">
          {t("challenge.howToPlay")}
        </h3>
        <ul className="space-y-2 text-theme-secondary text-sm">
          <li>• {t("challenge.rule1")}</li>
          <li>• {t("challenge.rule2")}</li>
          <li>• {t("challenge.rule4")}</li>
          <li>• {t("challenge.rule5")}</li>
        </ul>
      </div>

      {/* Start Button */}
      <button
        onClick={startGame}
        className="w-full clay-btn clay-btn-primary py-5 flex items-center justify-center gap-3 text-xl font-bold"
      >
        <Play className="w-7 h-7" />
        {t("challenge.start")}
      </button>
    </div>
  );

  // Game view
  const gameView = (
    <div className="space-y-4">
      {/* Level & Timer Bar */}
      <div className="clay-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-xl font-bold text-theme-primary">
              Lv.{level}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              timeLeft <= 30
                ? "bg-red-100 text-red-600 animate-pulse"
                : "bg-theme-tertiary text-theme-primary"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-xl font-bold font-mono">
              {formatTime(timeLeft)}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${comboColor} text-white font-bold transition-all ${isComboMode ? "scale-110 animate-pulse" : ""}`}
          >
            <Zap className="w-4 h-4" />
            <span>{combo}x</span>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-2">
          {/* Time bar */}
          <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${timeLeft <= 30 ? "bg-red-500" : "bg-teal-500"}`}
              style={{ width: `${(timeLeft / LEVEL_TIME) * 100}%` }}
            />
          </div>
          {/* Accuracy indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">
              {t("challenge.accuracy")}:{" "}
              <span
                className={`font-bold ${currentAccuracy >= requiredAccuracy ? "text-green-500" : "text-orange-500"}`}
              >
                {currentAccuracy}%
              </span>
            </span>
            <span className="text-theme-secondary">
              {t("challenge.required")}:{" "}
              <span className="font-bold text-theme-primary">
                {requiredAccuracy}%
              </span>
            </span>
            <span className="text-theme-secondary">
              {correct}/{total}
            </span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className={`grid grid-cols-2 ${isDesktop ? "gap-8" : "gap-3"}`}>
        {/* Words Column */}
        <div className={isDesktop ? "space-y-3" : "space-y-2"}>
          {gameWords.map((item) => (
            <button
              key={`word-${item.id}`}
              onClick={() => handleWordClick(item.id)}
              disabled={item.matched}
              className={`w-full clay-btn ${isDesktop ? "py-5 px-4 text-xl" : "py-3 px-3 text-base"} font-semibold transition-all cursor-pointer ${
                item.matched
                  ? "opacity-30 cursor-not-allowed bg-green-100 dark:bg-green-900/30 scale-95"
                  : item.replacing
                    ? "animate-fade-in"
                    : selectedWord === item.id
                      ? "clay-btn-primary scale-105"
                      : wrongPair?.word === item.id
                        ? "bg-red-100 dark:bg-red-900/50 border-red-400"
                        : "hover:scale-102"
              }`}
            >
              {item.word}
            </button>
          ))}
        </div>

        {/* Translations Column */}
        <div className={isDesktop ? "space-y-3" : "space-y-2"}>
          {shuffledTranslations.map((item) => (
            <button
              key={`trans-${item.id}`}
              onClick={() => handleTranslationClick(item.id)}
              disabled={item.matched}
              className={`w-full clay-btn ${isDesktop ? "py-5 px-4 text-xl" : "py-3 px-3 text-base"} font-semibold transition-all cursor-pointer ${
                item.matched
                  ? "opacity-30 cursor-not-allowed bg-green-100 dark:bg-green-900/30 scale-95"
                  : selectedTranslation === item.id
                    ? "clay-btn-primary scale-105"
                    : wrongPair?.trans === item.id
                      ? "bg-red-100 dark:bg-red-900/50 border-red-400"
                      : "hover:scale-102"
              }`}
            >
              {item.translation}
            </button>
          ))}
        </div>
      </div>

      {/* Exit button at bottom with red background */}
      <div className="flex justify-center mt-6">
        <button
          onClick={exitGame}
          className="clay-btn clay-btn-error px-8 py-3 font-semibold cursor-pointer"
        >
          {t("challenge.exit")}
        </button>
      </div>
    </div>
  );

  // Level result modal
  const levelResultModal = showLevelResult && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative clay-card p-8 w-full max-w-md animate-fade-in text-center">
        {showLevelResult === "success" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">
              {level >= 10
                ? t("challenge.gameComplete")
                : t("challenge.levelUp")}
            </h2>
            <p className="text-theme-secondary mb-6">
              {level >= 10
                ? t("challenge.maxLevelReached")
                : t("challenge.levelUpDesc", {
                    level: level + 1,
                    accuracy: requiredAccuracy + 5,
                  })}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {currentAccuracy}%
                </p>
                <p className="text-xs text-theme-secondary">
                  {t("challenge.accuracy")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-theme-primary">
                  {correct}/{total}
                </p>
                <p className="text-xs text-theme-secondary">
                  {t("challenge.score")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {maxCombo}x
                </p>
                <p className="text-xs text-theme-secondary">
                  {t("challenge.bestCombo")}
                </p>
              </div>
            </div>
            {level < 10 ? (
              <button
                onClick={nextLevel}
                className="w-full clay-btn clay-btn-primary py-4 text-lg font-bold"
              >
                {t("challenge.nextLevel")}
              </button>
            ) : (
              <button
                onClick={exitGame}
                className="w-full clay-btn clay-btn-primary py-4 text-lg font-bold"
              >
                {t("challenge.backToHome")}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-theme-primary mb-2">
              {t("challenge.levelFailed")}
            </h2>
            <p className="text-theme-secondary mb-6">
              {t("challenge.levelFailedDesc", {
                required: requiredAccuracy,
                actual: currentAccuracy,
              })}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">
                  {currentAccuracy}%
                </p>
                <p className="text-xs text-theme-secondary">
                  {t("challenge.accuracy")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-theme-primary">
                  {correct}/{total}
                </p>
                <p className="text-xs text-theme-secondary">
                  {t("challenge.score")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {maxCombo}x
                </p>
                <p className="text-xs text-theme-secondary">
                  {t("challenge.bestCombo")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exitGame}
                className="flex-1 clay-btn py-3 font-semibold"
              >
                {t("challenge.exit")}
              </button>
              <button
                onClick={restartGame}
                className="flex-1 clay-btn clay-btn-primary py-3 font-semibold"
              >
                {t("challenge.tryAgain")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Combo Animation Overlay
  const comboOverlay = showComboAnimation && (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="animate-combo-burst text-center">
        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 animate-pulse">
          {combo}x
        </div>
        <div className="text-3xl font-bold text-orange-400 mt-2">
          {t("challenge.combo")}!
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <>
        <div className="min-h-screen bg-theme-primary p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-8 h-8 text-accent" />
              <h1 className="text-2xl font-bold text-theme-primary">
                {t("challenge.title")}
              </h1>
            </div>
            {isPlaying ? gameView : homeView}
          </div>
        </div>
        {comboOverlay}
        {levelResultModal}
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-24 bg-theme-primary">
        <header className="clay-float mx-4 mt-4 p-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Zap className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-bold text-theme-primary">
              {t("challenge.title")}
            </h1>
          </div>
        </header>
        <main className="p-4 max-w-lg mx-auto">
          {isPlaying ? gameView : homeView}
        </main>
      </div>
      {comboOverlay}
      {levelResultModal}
    </>
  );
}
