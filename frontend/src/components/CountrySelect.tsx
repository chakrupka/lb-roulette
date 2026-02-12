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

  const filtered = ALL_COUNTRIES.filter(
    (c) =>
      c.toLowerCase().includes(query.toLowerCase()) && !selected.includes(c),
  );

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
    <div ref={ref} className="relative">
      <span className="text-sm text-zinc-400">Countries</span>
      <div className="flex flex-wrap gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 mt-1 focus-within:border-emerald-500 transition">
        {selected.map((c) => (
          <button
            key={c}
            onClick={() => remove(c)}
            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full flex items-center gap-1 hover:bg-emerald-700 transition cursor-pointer"
          >
            {c}
            <span className="text-base">×</span>
          </button>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Search countries..." : ""}
          autoComplete="off"
          className="bg-transparent text-zinc-100 text-base outline-none flex-1 min-w-25"
        />
      </div>
      {open && query && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 10).map((c) => (
            <button
              key={c}
              onClick={() => add(c)}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
