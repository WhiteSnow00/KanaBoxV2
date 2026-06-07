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
        className="h-10 rounded-md border border-zinc-300 bg-white/95 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-zinc-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/10"
        aria-label={label}
      >
        <option value="vi">{optionVi}</option>
        <option value="en">{optionEn}</option>
      </select>
    </div>
  );
}
