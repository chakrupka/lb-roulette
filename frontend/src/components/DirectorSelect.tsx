import { useState, useEffect, useRef } from "react";

interface Director {
  id: number;
  name: string;
  film_count: number;
  avg_rating: number;
}

interface DirectorSelectProps {
  selected: string[];
  onChange: (directors: string[]) => void;
}

export default function DirectorSelect({
  selected,
  onChange,
}: DirectorSelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Director[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/directors/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        setResults(data);
      } catch (error) {
        console.error("Failed to fetch directors:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const addDirector = (directorName: string) => {
    if (!selected.includes(directorName)) {
      onChange([...selected, directorName]);
    }
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const removeDirector = (directorName: string) => {
    onChange(selected.filter((d) => d !== directorName));
  };

  return (
    <div className="flex flex-col gap-2" ref={wrapperRef}>
      <span className="text-sm text-zinc-400">Directors</span>

      <div className="relative">
        <input
          type="text"
          placeholder="Search for a director..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-base text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
        />

        {isOpen && query.length >= 2 && (
          <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-zinc-400">Loading...</div>
            ) : results.length > 0 ? (
              results.map((director) => (
                <button
                  key={director.id}
                  onClick={() => addDirector(director.name)}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 transition flex justify-between items-center  cursor-pointer"
                >
                  <span>{director.name}</span>
                  <span className="text-xs text-zinc-500">
                    {director.film_count} films
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-zinc-400">
                No directors found
              </div>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((director) => (
            <span
              key={director}
              onClick={() => removeDirector(director)}
              className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-emerald-600 border-emerald-500 text-white cursor-pointer hover:bg-emerald-700 transition"
            >
              {director}
              <span className="text-emerald-200">×</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
