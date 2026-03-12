import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Globe, Target, ArrowRight, Sparkles } from "lucide-react";
import { useSettingsStore, type Language } from "../stores/themeStore";
import { useUserStore } from "../stores/userStore";

const languages = [
  { code: "zh" as const, label: "中文", flag: "🇨🇳" },
  { code: "en" as const, label: "English", flag: "🇺🇸" },
  { code: "ja" as const, label: "日本語", flag: "🇯🇵" },
  { code: "de" as const, label: "Deutsch", flag: "🇩🇪" },
  { code: "pt" as const, label: "Português", flag: "🇧🇷" },
  { code: "es" as const, label: "Español", flag: "🇪🇸" },
  { code: "ru" as const, label: "Русский", flag: "🇷🇺" },
  { code: "ar" as const, label: "العربية", flag: "🇸🇦" },
  { code: "ko" as const, label: "한국어", flag: "🇰🇷" },
  { code: "ms" as const, label: "Melayu", flag: "🇲🇾" },
];

const goalOptions = [10, 15, 20, 30, 50];

export function Onboarding() {
  const { t, i18n } = useTranslation();
  const { settings, setLanguage, completeOnboarding } = useSettingsStore();
  const { setDailyGoal } = useUserStore();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState<Language>(settings.language);
  const [selectedGoal, setSelectedGoal] = useState(20);

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLang(lang);
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleGoalSelect = (goal: number) => {
    setSelectedGoal(goal);
  };

  const handleStart = () => {
    setDailyGoal(selectedGoal);
    completeOnboarding();
  };

  const nextStep = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleStart();
    }
  };

  return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-8 animate-fade-in">
            {/* Logo */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl">
                <GraduationCap className="w-14 h-14 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-theme-primary">{t("app.title")}</h1>
                <p className="text-lg text-theme-secondary mt-2">{t("app.subtitle")}</p>
              </div>
            </div>

            {/* Features */}
            <div className="clay-card p-6 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="font-semibold text-theme-primary">{t("onboarding.feature1Title")}</p>
                  <p className="text-sm text-theme-secondary">{t("onboarding.feature1Desc")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-theme-primary">{t("onboarding.feature2Title")}</p>
                  <p className="text-sm text-theme-secondary">{t("onboarding.feature2Desc")}</p>
                </div>
              </div>
            </div>

            <button
              onClick={nextStep}
              className="clay-btn clay-btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {t("onboarding.getStarted")}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 1: Language Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-theme-primary">{t("onboarding.selectLanguage")}</h2>
              <p className="text-theme-secondary mt-2">{t("onboarding.selectLanguageDesc")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {languages.map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => handleLanguageSelect(code)}
                  className={`clay-btn py-4 font-semibold transition-all flex items-center justify-center gap-2 ${
                    selectedLang === code ? "clay-btn-primary" : ""
                  }`}
                >
                  <span className="text-xl">{flag}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={nextStep}
              className="clay-btn clay-btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {t("onboarding.next")}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Daily Goal */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-warning/20 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-theme-primary">{t("onboarding.setGoal")}</h2>
              <p className="text-theme-secondary mt-2">{t("onboarding.setGoalDesc")}</p>
            </div>

            <div className="space-y-3">
              {goalOptions.map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleGoalSelect(goal)}
                  className={`clay-btn w-full py-4 font-semibold transition-all flex items-center justify-between px-6 ${
                    selectedGoal === goal ? "clay-btn-primary" : ""
                  }`}
                >
                  <span className="text-lg">{goal} {t("settings.words")}</span>
                  <span className="text-sm opacity-75">
                    {goal <= 10 && t("onboarding.paceRelaxed")}
                    {goal > 10 && goal <= 20 && t("onboarding.paceModerate")}
                    {goal > 20 && goal <= 30 && t("onboarding.paceIntensive")}
                    {goal > 30 && t("onboarding.paceChallenge")}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleStart}
              className="clay-btn clay-btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {t("onboarding.startLearning")}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-accent" : "bg-theme-tertiary"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
