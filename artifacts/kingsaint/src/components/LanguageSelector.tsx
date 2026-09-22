import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "zh", label: "Mandarin Chinese", nativeLabel: "中文" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "pl", label: "Polish", nativeLabel: "Polski" },
  { code: "uk", label: "Ukrainian", nativeLabel: "Українська" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی" },
  { code: "th", label: "Thai", nativeLabel: "ไทย" },
  { code: "ro", label: "Romanian", nativeLabel: "Română" },
  { code: "cs", label: "Czech", nativeLabel: "Čeština" },
  { code: "sv", label: "Swedish", nativeLabel: "Svenska" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar" },
  { code: "da", label: "Danish", nativeLabel: "Dansk" },
] as const;

const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "novacrest-preferred-language";
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);
const GOOGLE_LANGUAGE_CODES: Record<string, string> = { zh: "zh-CN", he: "iw" };

type GoogleWindow = Window & {
  googleTranslateElementInit?: () => void;
  google?: {
    translate?: {
      TranslateElement: new (options: Record<string, unknown>, elementId: string) => unknown;
    };
  };
};

function getInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.some(language => language.code === stored) ? stored! : DEFAULT_LANGUAGE;
}

function setTranslationCookie(language: string) {
  if (language === DEFAULT_LANGUAGE) {
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    return;
  }

  const googleLanguage = GOOGLE_LANGUAGE_CODES[language] || language;
  document.cookie = "googtrans=/en/" + googleLanguage + "; path=/";
}

function requestGoogleTranslation(language: string) {
  if (language === DEFAULT_LANGUAGE) return;

  const googleLanguage = GOOGLE_LANGUAGE_CODES[language] || language;
  let attempts = 0;
  const applyLanguage = () => {
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      combo.value = googleLanguage;
      combo.dispatchEvent(new Event("change"));
      return;
    }

    attempts += 1;
    if (attempts < 20) window.setTimeout(applyLanguage, 500);
  };
  applyLanguage();
}

function ensureGoogleTranslate(language: string) {
  const googleWindow = window as GoogleWindow;
  let container = document.getElementById("novacrest-google-translate");
  if (!container) {
    container = document.createElement("div");
    container.id = "novacrest-google-translate";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);
  }

  if (!document.getElementById("novacrest-google-translate-styles")) {
    const style = document.createElement("style");
    style.id = "novacrest-google-translate-styles";
    style.textContent = ".goog-te-banner-frame,.goog-te-banner-frame.skiptranslate,body > .skiptranslate,.goog-te-gadget,.goog-te-gadget-simple,#goog-gt-tt,.goog-te-balloon-frame,.goog-tooltip,.goog-te-menu-frame,.goog-te-spinner-pos,.goog-te-ftab{display:none!important;visibility:hidden!important}body{top:0!important}#novacrest-google-translate{position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden}";
    document.head.appendChild(style);
  }

  const initialize = () => {
    const TranslateElement = googleWindow.google?.translate?.TranslateElement;
    if (TranslateElement && !document.querySelector(".goog-te-combo")) {
      const includedLanguages = SUPPORTED_LANGUAGES.map(item => GOOGLE_LANGUAGE_CODES[item.code] || item.code).join(",");
      new TranslateElement({ pageLanguage: "en", includedLanguages, autoDisplay: false }, container!.id);
    }
    requestGoogleTranslation(language);
  };

  if (googleWindow.google?.translate?.TranslateElement) {
    initialize();
    return;
  }

  const scriptId = "novacrest-google-translate-script";
  if (!document.getElementById(scriptId)) {
    googleWindow.googleTranslateElementInit = initialize;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onload = () => window.setTimeout(initialize, 0);
    document.head.appendChild(script);
  }
}

export function LanguageSelector({ className = "" }: { className?: string }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
    setTranslationCookie(language);
    ensureGoogleTranslate(language);
    requestGoogleTranslation(language);
  }, [language]);

  const selectedLanguage = SUPPORTED_LANGUAGES.find(item => item.code === language);
  const handleLanguageChange = (nextLanguage: string) => {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = RTL_LANGUAGES.has(nextLanguage) ? "rtl" : "ltr";
    setTranslationCookie(nextLanguage);
    setLanguage(nextLanguage);
    window.location.reload();
  };

  return (
    <Select value={language} onValueChange={handleLanguageChange}>
      <SelectTrigger
        aria-label="Preferred language"
        className={"h-9 border-white/10 bg-white/5 text-white text-xs rounded-sm focus:ring-primary/40 " + (className || "w-[154px]")}
      >
        <Globe2 className="w-3.5 h-3.5 shrink-0 text-primary" />
        <SelectValue>{selectedLanguage?.nativeLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 bg-card border-white/10 text-white">
        {SUPPORTED_LANGUAGES.map(item => (
          <SelectItem key={item.code} value={item.code} className="text-sm focus:bg-primary/20 focus:text-white">
            <span className="flex items-center gap-2">
              <span>{item.nativeLabel}</span>
              <span className="text-muted-foreground">{item.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
