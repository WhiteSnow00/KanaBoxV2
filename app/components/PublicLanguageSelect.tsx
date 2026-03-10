import { useSearchParams } from "@remix-run/react";
import { Globe } from "lucide-react";
import type { PublicLang } from "~/i18n/public";

export default function PublicLanguageSelect({
  lang,
  label,
  optionVi,
  optionEn,
}: {
  lang: PublicLang;
  label: string;
  optionVi: string;
  optionEn: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-zinc-400" />
      <select
        id="public-lang"
        name="lang"
        value={lang}
        onChange={(e) => {
          const nextLang = e.target.value === "en" ? "en" : "vi";
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("lang", nextLang);
          setSearchParams(nextParams);
        }}
        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
        aria-label={label}
      >
        <option value="vi">{optionVi}</option>
        <option value="en">{optionEn}</option>
      </select>
    </div>
  );
}
