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

function getInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.some(language => language.code === stored) ? stored! : DEFAULT_LANGUAGE;
}

export function LanguageSelector({ className = "" }: { className?: string }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
  }, [language]);

  const selectedLanguage = SUPPORTED_LANGUAGES.find(item => item.code === language);

  return (
    <Select value={language} onValueChange={setLanguage}>
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
