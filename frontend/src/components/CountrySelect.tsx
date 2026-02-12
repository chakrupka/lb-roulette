import { useState, useRef, useEffect } from "react";
import { ALL_COUNTRIES } from "../constants";

interface CountrySelectProps {
  selected: string[];
  onChange: (countries: string[]) => void;
}

export default function CountrySelect({
  selected,
  onChange,
}: CountrySelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const lowerQuery = query.toLowerCase();
  const filtered = ALL_COUNTRIES.filter(
    (c) => c.toLowerCase().includes(lowerQuery) && !selected.includes(c),
  ).sort((a, b) => {
    const aPrefix = a.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
    const bPrefix = b.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
    return aPrefix - bPrefix;
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const add = (country: string) => {
    onChange([...selected, country]);
    setQuery("");
  };

  const remove = (country: string) => {
    onChange(selected.filter((c) => c !== country));
  };

  return (
    <div className="flex flex-col gap-2" ref={ref}>
      <span className="text-sm text-zinc-400">Countries</span>

      <div className="relative">
        <input
          type="text"
          placeholder="Search for a country..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-base text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
        />

        {open && query && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filtered.slice(0, 10).map((c) => (
              <button
                key={c}
                onClick={() => add(c)}
                className="w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((country) => (
            <span
              key={country}
              onClick={() => remove(country)}
              className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-emerald-600 border-emerald-500 text-white cursor-pointer hover:bg-emerald-700 transition"
            >
              {country}
              <span className="text-emerald-200">×</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
