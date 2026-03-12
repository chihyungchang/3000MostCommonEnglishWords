import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Moon,
  Leaf,
  Settings as SettingsIcon,
  Globe,
  ListOrdered,
  Target,
  Trash2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { useUserStore } from "../stores/userStore";
import { useProgressStore } from "../stores/progressStore";
import {
  useSettingsStore,
  type Theme,
  type Language,
  type LearnOrder,
} from "../stores/themeStore";
import { useDevice } from "../hooks/useDevice";

export function Settings() {
  const { t, i18n } = useTranslation();
  const { isDesktop } = useDevice();
  const { stats, isLoaded, loadUser, setDailyGoal } = useUserStore();
  const { loadProgress } = useProgressStore();
  const {
    settings,
    isLoaded: settingsLoaded,
    loadSettings,
    setTheme,
    setLanguage,
    setLearnOrder,
  } = useSettingsStore();
  const [goal, setGoal] = useState(20);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      loadUser();
      loadProgress();
    }
    if (!settingsLoaded) {
      loadSettings();
    }
  }, [isLoaded, settingsLoaded, loadUser, loadProgress, loadSettings]);

  useEffect(() => {
    if (isLoaded) {
      setGoal(stats.dailyGoal);
    }
  }, [isLoaded, stats.dailyGoal]);

  const handleGoalChange = (newGoal: number) => {
    setGoal(newGoal);
    setDailyGoal(newGoal);
  };

  const handleThemeChange = (theme: Theme) => {
    setTheme(theme);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleLearnOrderChange = (order: LearnOrder) => {
    setLearnOrder(order);
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const goalOptions = [10, 15, 20, 30, 50];

  const themeOptions: {
    value: Theme;
    icon: typeof Sun;
    label: string;
    color: string;
  }[] = [
    {
      value: "light",
      icon: Sun,
      label: t("settings.themeLight"),
      color:
        "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300",
    },
    {
      value: "dark",
      icon: Moon,
      label: t("settings.themeDark"),
      color:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      value: "eyecare",
      icon: Leaf,
      label: t("settings.themeSepia"),
      color:
        "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300",
    },
  ];

  const content = (
    <>
      {/* Theme */}
      <div className="clay-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-theme-primary">
            {t("settings.theme")}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ value, icon: Icon, label, color }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className={`clay-btn flex flex-col items-center gap-2 p-4 transition-all ${
                settings.theme === value ? "clay-btn-primary" : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.theme === value ? "bg-white/20" : color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="clay-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-theme-primary">
            {t("settings.language")}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { code: "zh" as const, label: "中文" },
            { code: "en" as const, label: "English" },
            { code: "ja" as const, label: "日本語" },
            { code: "de" as const, label: "Deutsch" },
            { code: "pt" as const, label: "Português" },
            { code: "es" as const, label: "Español" },
            { code: "ru" as const, label: "Русский" },
            { code: "ar" as const, label: "العربية" },
            { code: "ko" as const, label: "한국어" },
            { code: "ms" as const, label: "Melayu" },
          ].map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={`clay-btn py-3 font-semibold transition-all ${
                settings.language === code ? "clay-btn-primary" : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Learn Order */}
      <div className="clay-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-theme-primary">
            {t("settings.learnOrder")}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleLearnOrderChange("new-first")}
            className={`clay-btn py-3 font-semibold transition-all ${
              settings.learnOrder === "new-first" ? "clay-btn-primary" : ""
            }`}
          >
            {t("settings.newFirst")}
          </button>
          <button
            onClick={() => handleLearnOrderChange("review-first")}
            className={`clay-btn py-3 font-semibold transition-all ${
              settings.learnOrder === "review-first" ? "clay-btn-primary" : ""
            }`}
          >
            {t("settings.reviewFirst")}
          </button>
        </div>
      </div>

      {/* Daily Goal */}
      <div className="clay-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-theme-primary">
            {t("settings.dailyGoal")}
          </h3>
        </div>
        <p className="text-theme-secondary text-sm mb-4">
          {t("settings.dailyGoalDesc")}
        </p>
        <div className="flex flex-wrap gap-2">
          {goalOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleGoalChange(option)}
              className={`clay-btn px-5 py-2.5 font-semibold transition-all ${
                goal === option ? "clay-btn-primary" : ""
              }`}
            >
              {option} {t("settings.words")}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="clay-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5 text-error" />
          <h3 className="font-semibold text-theme-primary">{t("settings.reset")}</h3>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="clay-btn clay-btn-error px-4 py-2 text-sm font-medium"
        >
          {t("settings.resetDesc")}
        </button>
      </div>

      {/* Credits */}
      <div className="clay-card p-4 bg-theme-tertiary/30">
        <div className="flex items-center justify-center gap-2 text-theme-tertiary">
          <Info className="w-4 h-4" />
          <div className="text-center text-sm">
            <p className="font-medium">SM-2 Spaced Repetition Algorithm</p>
          </div>
        </div>
      </div>
    </>
  );

  // Reset Confirmation Modal
  const resetModal = showResetConfirm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowResetConfirm(false)}
      />
      {/* Modal */}
      <div className="relative clay-card p-6 w-full max-w-sm animate-fade-in">
        {/* Close button */}
        <button
          onClick={() => setShowResetConfirm(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-theme-tertiary transition-colors"
        >
          <X className="w-5 h-5 text-theme-secondary" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-theme-primary text-center mb-2">
          {t("settings.reset")}
        </h3>

        {/* Message */}
        <p className="text-theme-secondary text-center mb-6">
          {t("settings.resetConfirm")}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowResetConfirm(false)}
            className="flex-1 clay-btn py-3 font-semibold"
          >
            {t("settings.cancel")}
          </button>
          <button
            onClick={handleReset}
            className="flex-1 clay-btn clay-btn-error py-3 font-semibold"
          >
            {t("settings.confirm")}
          </button>
        </div>
      </div>
    </div>
  );

  // Desktop Layout
  if (isDesktop) {
    return (
      <>
        <div className="min-h-screen bg-theme-primary p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <SettingsIcon className="w-8 h-8 text-accent" />
              <h1 className="text-2xl font-bold text-theme-primary">
                {t("settings.title")}
              </h1>
            </div>
            <div className="space-y-6">{content}</div>
          </div>
        </div>
        {resetModal}
      </>
    );
  }

  // Mobile Layout
  return (
    <>
      <div className="min-h-screen pb-24 bg-theme-primary">
        <header className="clay-float mx-4 mt-4 p-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-bold text-theme-primary">
              {t("settings.title")}
            </h1>
          </div>
        </header>
        <main className="p-4 max-w-lg mx-auto space-y-4">{content}</main>
      </div>
      {resetModal}
    </>
  );
}
