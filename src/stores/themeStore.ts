import { create } from "zustand";
import { getItem, setItem } from "../utils/storage";
import i18n from "../i18n";
import { supportedLanguages } from "../i18n";
import { syncService } from "../services/syncService";

export type Theme = "light" | "dark" | "eyecare";
export type Language = "zh" | "en";
export type LearnOrder = "new-first" | "review-first";

const SETTINGS_KEY = "app_settings";

interface AppSettings {
  theme: Theme;
  language: Language;
  learnOrder: LearnOrder;
  onboardingCompleted: boolean;
}

function getDetectedLanguage(): Language {
  const detected = i18n.language;
  // Handle language codes like "zh-CN" -> "zh"
  const shortCode = detected?.split('-')[0] as Language;
  if (supportedLanguages.includes(shortCode as typeof supportedLanguages[number])) {
    return shortCode;
  }
  return "en";
}

function createDefaultSettings(): AppSettings {
  return {
    theme: "light",
    language: getDetectedLanguage(),
    learnOrder: "new-first",
    onboardingCompleted: false,
  };
}

const themes: Record<Theme, Record<string, string>> = {
  light: {
    "--bg-primary": "#f9fafb",
    "--bg-secondary": "#ffffff",
    "--bg-tertiary": "#f3f4f6",
    "--text-primary": "#111827",
    "--text-secondary": "#6b7280",
    "--text-tertiary": "#9ca3af",
    "--border-color": "#e5e7eb",
    "--accent": "#3b82f6",
    "--accent-hover": "#2563eb",
    "--success": "#22c55e",
    "--warning": "#f59e0b",
    "--error": "#ef4444",
  },
  dark: {
    "--bg-primary": "#111827",
    "--bg-secondary": "#1f2937",
    "--bg-tertiary": "#374151",
    "--text-primary": "#f9fafb",
    "--text-secondary": "#d1d5db",
    "--text-tertiary": "#9ca3af",
    "--border-color": "#374151",
    "--accent": "#60a5fa",
    "--accent-hover": "#3b82f6",
    "--success": "#4ade80",
    "--warning": "#fbbf24",
    "--error": "#f87171",
  },
  eyecare: {
    "--bg-primary": "#e8f5e9",
    "--bg-secondary": "#f1f8f2",
    "--bg-tertiary": "#c8e6c9",
    "--text-primary": "#1b5e20",
    "--text-secondary": "#4a6b4c",
    "--text-tertiary": "#7a9a7c",
    "--border-color": "#a5d6a7",
    "--accent": "#2e7d32",
    "--accent-hover": "#1b5e20",
    "--success": "#43a047",
    "--warning": "#f9a825",
    "--error": "#e53935",
  },
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "eyecare");
  root.classList.add(theme);

  // 直接设置 CSS 变量
  const themeVars = themes[theme];
  Object.entries(themeVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;

  loadSettings: () => void;
  saveSettings: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setLearnOrder: (order: LearnOrder) => void;
  completeOnboarding: () => void;

  // Cloud sync
  setSettingsFromCloud: (settings: {
    theme: Theme;
    language: string;
    learnOrder: LearnOrder;
    onboardingCompleted: boolean;
  }) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: createDefaultSettings(),
  isLoaded: false,

  loadSettings: () => {
    const defaults = createDefaultSettings();
    const saved = getItem<AppSettings>(SETTINGS_KEY, defaults);
    // If no saved language, use browser-detected language
    if (!localStorage.getItem(SETTINGS_KEY)) {
      saved.language = defaults.language;
    }
    applyTheme(saved.theme);
    // Sync i18n with saved/detected language
    if (i18n.language !== saved.language) {
      i18n.changeLanguage(saved.language);
    }
    set({ settings: saved, isLoaded: true });
  },

  saveSettings: () => {
    const { settings } = get();
    setItem(SETTINGS_KEY, settings);

    // Sync to cloud
    syncService.queueChange('settings', 'user', settings);
  },

  setSettingsFromCloud: (cloudSettings: {
    theme: Theme;
    language: string;
    learnOrder: LearnOrder;
    onboardingCompleted: boolean;
  }) => {
    const language = (supportedLanguages.includes(cloudSettings.language as typeof supportedLanguages[number])
      ? cloudSettings.language
      : 'en') as Language;

    const settings: AppSettings = {
      theme: cloudSettings.theme,
      language,
      learnOrder: cloudSettings.learnOrder,
      onboardingCompleted: cloudSettings.onboardingCompleted,
    };

    applyTheme(settings.theme);
    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }

    set({ settings, isLoaded: true });
    setItem(SETTINGS_KEY, settings);
  },

  setTheme: (theme: Theme) => {
    const { settings, saveSettings } = get();
    applyTheme(theme);
    set({ settings: { ...settings, theme } });
    saveSettings();
  },

  setLanguage: (language: Language) => {
    const { settings, saveSettings } = get();
    set({ settings: { ...settings, language } });
    saveSettings();
  },

  setLearnOrder: (order: LearnOrder) => {
    const { settings, saveSettings } = get();
    set({ settings: { ...settings, learnOrder: order } });
    saveSettings();
  },

  completeOnboarding: () => {
    const { settings, saveSettings } = get();
    set({ settings: { ...settings, onboardingCompleted: true } });
    saveSettings();
  },
}));
