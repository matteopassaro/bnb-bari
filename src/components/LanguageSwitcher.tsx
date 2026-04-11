import { startTransition } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { normalizeLanguage, supportedLanguages, type SupportedLanguage } from "@/i18n/config";

type LanguageSwitcherProps = {
  inverted?: boolean;
  onLanguageChange?: () => void;
};

const LanguageSwitcher = ({ inverted = false, onLanguageChange }: LanguageSwitcherProps) => {
  const { t, i18n } = useTranslation("nav");
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage);

  const handleLanguageChange = (language: SupportedLanguage) => {
    if (language === currentLanguage) {
      onLanguageChange?.();
      return;
    }

    startTransition(() => {
      void i18n.changeLanguage(language);
    });
    onLanguageChange?.();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]",
        inverted ? "text-white/90" : "text-muted-foreground"
      )}
      aria-label={t("languageSwitcher.ariaLabel")}
    >
      {supportedLanguages.map((language, index) => (
        <div key={language} className="flex items-center gap-2">
          {index > 0 && <span className={inverted ? "text-white/50" : "text-muted-foreground/60"}>/</span>}
          <button
            type="button"
            onClick={() => handleLanguageChange(language)}
            className={cn(
              "transition-colors",
              inverted ? "hover:text-white" : "hover:text-primary",
              currentLanguage === language
                ? inverted
                  ? "text-white"
                  : "text-primary"
                : undefined
            )}
          >
            {t(`languageSwitcher.${language}`)}
          </button>
        </div>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
