import React, { useEffect, useRef, useState } from "react";
import { Search, FileText, Loader2, ArrowRight } from "lucide-react";
import { SearchSuggestion, suggestDocumentsApi } from "../lib/api";
import { useDebounce } from "../hooks/useDebounce";

interface SearchSuggestProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  onPick?: (s: SearchSuggestion) => void;
  placeholder?: string;
  inputClassName?: string;
  containerClassName?: string;
  autoFocus?: boolean;
}

export const SearchSuggest: React.FC<SearchSuggestProps> = ({
  value,
  onChange,
  onSubmit,
  onPick,
  placeholder = "Rechercher une épreuve, une matière, une année...",
  inputClassName = "",
  containerClassName = "",
  autoFocus = false,
}) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(value, 180);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setOpen(true);
    suggestDocumentsApi(q)
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res);
        setLoading(false);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % Math.max(suggestions.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        const picked = suggestions[activeIndex];
        onChange(picked.titre);
        setOpen(false);
        onPick?.(picked);
      } else {
        onSubmit(value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const highlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    const q = query.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-amber-200/70 dark:bg-amber-400/30 px-0.5 rounded font-bold text-slate-900 dark:text-amber-100">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${containerClassName}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-blue-500">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      {open && value.trim().length >= 2 && (
        <div className="absolute z-40 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
          {suggestions.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                Résultats instantanés
              </div>
              <ul className="max-h-56 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(s.titre);
                        setOpen(false);
                        onPick?.(s);
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                        i === activeIndex
                          ? "bg-blue-50 dark:bg-blue-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                          {highlight(s.titre, value)}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {s.matiere} • {s.typeEpreuve} • {s.anneeAcademique}
                        </span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            !loading && (
              <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                Aucun résultat pour <strong className="text-slate-700 dark:text-slate-200">"{value}"</strong>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};