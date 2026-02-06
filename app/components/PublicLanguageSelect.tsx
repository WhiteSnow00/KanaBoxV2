import { useSearchParams } from "@remix-run/react";
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
      <label htmlFor="public-lang" className="text-sm text-gray-700">
        {label}
      </label>
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
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
        aria-label={label}
      >
        <option value="vi">{optionVi}</option>
        <option value="en">{optionEn}</option>
      </select>
    </div>
  );
}
