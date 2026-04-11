import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import { enUS, it } from "date-fns/locale";
import type { Locale } from "date-fns";

export const supportedLanguages = ["it", "en"] as const;
export const namespaces = ["common", "home", "booking", "nav"] as const;
export const languageStorageKey = "bnb-bari-language";

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type TranslationNamespace = (typeof namespaces)[number];

const isSupportedLanguage = (language: string): language is SupportedLanguage =>
  supportedLanguages.includes(language as SupportedLanguage);

export const normalizeLanguage = (language?: string | null): SupportedLanguage => {
  if (!language) {
    return "it";
  }

  const normalized = language.toLowerCase().trim().split("-")[0];
  return isSupportedLanguage(normalized) ? normalized : "it";
};

const getStoredLanguage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(languageStorageKey);
};

const getBrowserLanguage = () => {
  if (typeof navigator === "undefined") {
    return "it";
  }

  return navigator.language;
};

export const getInitialLanguage = () => normalizeLanguage(getStoredLanguage() ?? getBrowserLanguage());

const dateLocales: Record<SupportedLanguage, Locale> = {
  it,
  en: enUS,
};

export const getDateLocale = (language?: string | null) => dateLocales[normalizeLanguage(language ?? i18n.resolvedLanguage)];
export const getCurrentLanguage = () => normalizeLanguage(i18n.resolvedLanguage);

const syncDocumentLanguage = (language: SupportedLanguage) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(languageStorageKey, language);
  }
};

const initialLanguage = getInitialLanguage();

export const i18nReady = i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: "it",
    supportedLngs: supportedLanguages,
    ns: namespaces,
    defaultNS: "common",
    fallbackNS: "common",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
  })
  .then(() => {
    syncDocumentLanguage(initialLanguage);
    return i18n;
  })
  .catch((error) => {
    console.error("i18n initialization error:", error);
    syncDocumentLanguage(initialLanguage);
    return i18n;
  });

i18n.on("languageChanged", (language) => {
  syncDocumentLanguage(normalizeLanguage(language));
});

export default i18n;
