import { useState } from "react";
import { ALL_GENRES } from "../constants";
import type { Filters } from "../types";
import CountrySelect from "./CountrySelect";
import ActorSelect from "./ActorSelect";
import DirectorSelect from "./DirectorSelect";

const PREVIEW_COUNT = 3;

interface FilterPanelProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

export default function FilterPanel({ filters, setFilters }: FilterPanelProps) {
  const [genresExpanded, setGenresExpanded] = useState(false);

  const updateField = (
    field: keyof Omit<Filters, "genres" | "countries" | "actors" | "directors">,
    value: string,
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGenre = (genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const visibleGenres = genresExpanded
    ? ALL_GENRES
    : ALL_GENRES.slice(0, PREVIEW_COUNT);

  return (
    <div className="w-full max-w-md mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Min Rating
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            placeholder="0.0"
            value={filters.min_rating}
            onChange={(e) => updateField("min_rating", e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-base text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Max Rating
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            placeholder="5.0"
            value={filters.max_rating}
            onChange={(e) => updateField("max_rating", e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-base text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Min # of Ratings
          <input
            type="number"
            placeholder="0"
            value={filters.min_ratings}
            onChange={(e) => updateField("min_ratings", e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-base text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Year From
          <input
            type="number"
            placeholder="1903"
            value={filters.year_min}
            onChange={(e) => updateField("year_min", e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-base text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Year To
          <input
            type="number"
            placeholder="2026"
            value={filters.year_max}
            onChange={(e) => updateField("year_max", e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-base text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-zinc-400">Genres</span>
        <div
          className={`flex gap-2 ${genresExpanded ? "flex-wrap" : "flex-nowrap overflow-hidden"}`}
        >
          {visibleGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`text-sm px-3 py-1 rounded-full border transition cursor-pointer whitespace-nowrap ${
                filters.genres.includes(genre)
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {genre}
            </button>
          ))}
          {!genresExpanded && (
            <button
              onClick={() => setGenresExpanded(true)}
              className="text-sm px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition cursor-pointer whitespace-nowrap"
            >
              +{ALL_GENRES.length - PREVIEW_COUNT} more...
            </button>
          )}
          {genresExpanded && (
            <button
              onClick={() => setGenresExpanded(false)}
              className="text-sm px-3 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 transition cursor-pointer whitespace-nowrap"
            >
              Show less
            </button>
          )}
        </div>
      </div>

      <DirectorSelect
        selected={filters.directors}
        onChange={(directors) => setFilters((prev) => ({ ...prev, directors }))}
      />

      <ActorSelect
        selected={filters.actors}
        onChange={(actors) => setFilters((prev) => ({ ...prev, actors }))}
      />

      <CountrySelect
        selected={filters.countries}
        onChange={(countries) => setFilters((prev) => ({ ...prev, countries }))}
      />
      <a
        href="https://letterboxd.com/countries/"
        target="_blank"
        className="text-xs text-zinc-500 hover:text-zinc-400 transition -mt-2"
      >
        View all available countries
      </a>
    </div>
  );
}
