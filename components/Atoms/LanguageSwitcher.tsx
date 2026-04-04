"use client";

import { useI18n } from "@/contexts/I18nContext";
import type { Locale } from "@/locales";
import BR from "country-flag-icons/react/3x2/BR";
import US from "country-flag-icons/react/3x2/US";
import ES from "country-flag-icons/react/3x2/ES";

const FLAGS: { locale: Locale; Flag: any; label: string }[] = [
  { locale: "pt", Flag: BR, label: "Português" },
  { locale: "en", Flag: US, label: "English" },
  { locale: "es", Flag: ES, label: "Español" },
];

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={["inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1", className].filter(Boolean).join(" ")}>
      {FLAGS.map((f) => (
        <button
          key={f.locale}
          type="button"
          onClick={() => setLocale(f.locale)}
          title={f.label}
          aria-label={f.label}
          className={[
            "grid h-7 w-7 place-items-center rounded-md transition cursor-pointer overflow-hidden",
            locale === f.locale
              ? "ring-2 ring-[#003399] shadow-sm scale-110"
              : "opacity-50 hover:opacity-100 hover:bg-gray-100",
          ].join(" ")}
        >
          <f.Flag style={{ width: 22, height: 15 }} />
        </button>
      ))}
    </div>
  );
}
