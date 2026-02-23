import { useEffect, useState } from "react";
import type { Film, Filters } from "./types";
import FilterPanel from "./components/FilterPanel";
import RouletteWheel from "./components/RouletteWheel";
import FilmCard from "./components/FilmCard";

function App() {
  const [filters, setFilters] = useState<Filters>({
    min_rating: "",
    max_rating: "",
    min_ratings: "",
    year_min: "",
    year_max: "",
    genres: [],
    genre_mode: "and",
    countries: [],
    actors: [],
    directors: [],
  });
  const [films, setFilms] = useState<Film[]>([]);
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/`).catch(() => {});
  }, []);

  const fetchFilms = async () => {
    setLoading(true);
    setError(null);
    setFilms([]);
    setSelectedFilm(null);
    setLoaded(false);

    try {
      const params = new URLSearchParams();
      if (filters.min_rating) params.append("min_rating", filters.min_rating);
      if (filters.max_rating) params.append("max_rating", filters.max_rating);
      if (filters.min_ratings)
        params.append("min_ratings", filters.min_ratings);
      if (filters.year_min) params.append("year_min", filters.year_min);
      if (filters.year_max) params.append("year_max", filters.year_max);
      filters.genres.forEach((g) => params.append("genre", g));
      if (filters.genres.length > 1) params.append("genre_mode", filters.genre_mode);
      filters.countries.forEach((c) => params.append("country", c));
      filters.actors.forEach((a) => params.append("actor", a));
      filters.directors.forEach((d) => params.append("director", d));
      params.append("limit", "50");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/films/random?${params}`,
      );
      if (!res.ok) {
        setError("No films match those filters. Try broadening your search.");
        return;
      }
      const data: Film[] = await res.json();
      if (data.length === 0) {
        setError("No films match those filters. Try broadening your search.");
        return;
      }
      if (data.length === 1) {
        setSelectedFilm(data[0]);
      } else {
        setFilms(data);
        setLoaded(true);
      }
    } catch {
      setError("Something went wrong. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight mb-8">
        Letterboxd Roulette
      </h1>

      <FilterPanel filters={filters} setFilters={setFilters} />

      <button
        onClick={fetchFilms}
        disabled={loading}
        className="w-full max-w-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white font-semibold px-6 py-3 rounded-lg transition mb-4 cursor-pointer disabled:cursor-not-allowed "
      >
        {loading ? "Loading..." : "Find Films"}
      </button>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 mb-6 max-w-2xl w-full">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {loaded && films.length > 1 && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md mb-8">
          <p className="text-sm text-zinc-400">
            {films.length}
            {films.length === 50 && "+"} film{films.length !== 1 && "s"} found
          </p>
          <RouletteWheel
            key={films.map((f) => f.id).join()}
            films={films}
            onResult={setSelectedFilm}
          />
        </div>
      )}

      {selectedFilm && <FilmCard film={selectedFilm} />}
    </div>
  );
}

export default App;
