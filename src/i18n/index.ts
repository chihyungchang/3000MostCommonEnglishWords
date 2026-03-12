import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zh from './locales/zh.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import ko from './locales/ko.json';
import ms from './locales/ms.json';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  ja: { translation: ja },
  de: { translation: de },
  pt: { translation: pt },
  es: { translation: es },
  ru: { translation: ru },
  ar: { translation: ar },
  ko: { translation: ko },
  ms: { translation: ms },
};

export const supportedLanguages = ['zh', 'en', 'ja', 'de', 'pt', 'es', 'ru', 'ar', 'ko', 'ms'] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'app_settings_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
