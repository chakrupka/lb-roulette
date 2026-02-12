import type { Film } from "../types";

interface FilmCardProps {
  film: Film;
}

export default function FilmCard({ film }: FilmCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-2xl w-full flex flex-col sm:flex-row gap-5">
      <img
        src={film.image}
        alt={film.title}
        className="w-48 sm:w-45 h-auto rounded-lg shadow-lg shrink-0 self-center sm:self-start"
      />
      <div className="flex flex-col gap-2 min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold">
          {film.title}
          <span className="text-zinc-500 font-normal ml-2">({film.year})</span>
        </h2>

        <p className="text-sm text-zinc-400">
          Directed by {film.directors.map((d) => d.name).join(", ")}
        </p>

        <div className="flex gap-2 flex-wrap">
          {film.genres.map((g) => (
            <span
              key={g}
              className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full"
            >
              {g}
            </span>
          ))}
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed mt-1">
          {film.description}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400 mt-2">
          <span>{film.rating} ★</span>
          <span>{film.rating_count.toLocaleString()} ratings</span>
          <span>{film.countries.join(", ")}</span>
        </div>

        <a
          href={film.url}
          target="_blank"
          className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 transition w-fit"
        >
          View on Letterboxd →
        </a>
      </div>
    </div>
  );
}
