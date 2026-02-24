import { useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

type Stage = "input" | "cached" | "loading" | "results" | "error";
type Tab = "table" | "heatmap" | "director";

const RATINGS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

interface FilmResult {
  slug: string;
  title: string;
  user_rating: number;
  db_rating: number;
  diff: number;
  direction: "higher" | "lower" | "same";
}

interface DirectorResult {
  name: string;
  slug: string;
  film_count: number;
  avg_diff: number;
}

interface CompareData {
  username: string;
  scraped_date: string;
  total_films: number;
  matched: number;
  films: FilmResult[];
  directors: DirectorResult[];
}

export default function SignalScore() {
  const [stage, setStage] = useState<Stage>("input");
  const [tab, setTab] = useState<Tab>("table");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [directorSortKey, setDirectorSortKey] = useState<"films" | "diff">(
    "films",
  );
  const [directorSortDir, setDirectorSortDir] = useState<"asc" | "desc">(
    "desc",
  );
  const [username, setUsername] = useState("");
  const [cachedDate, setCachedDate] = useState<string | null>(null);
  const [data, setData] = useState<CompareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadResults = async () => {
    const res = await fetch(`${API}/profile/${username}/compare`);
    if (!res.ok) throw new Error("Failed to load comparison data.");
    const json: CompareData = await res.json();
    setData(json);
    setStage("results");
  };

  const runUpdate = async () => {
    setStage("loading");
    const res = await fetch(`${API}/profile/${username}/update`, {
      method: "POST",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Failed to fetch profile.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError(null);
    setStage("loading");

    try {
      const res = await fetch(`${API}/profile/${username}`);

      if (res.status === 404) {
        await runUpdate();
        await loadResults();
      } else if (res.ok) {
        const json = await res.json();
        setCachedDate(json.last_updated);
        setStage("cached");
      } else {
        throw new Error("Unexpected error checking profile.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  };

  const handleUseCached = async () => {
    setStage("loading");
    try {
      await loadResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  };

  const handleUpdate = async () => {
    try {
      await runUpdate();
      await loadResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  };

  const higher =
    data?.films.filter((f) => f.direction === "higher").length ?? 0;
  const lower = data?.films.filter((f) => f.direction === "lower").length ?? 0;
  const same = data?.films.filter((f) => f.direction === "same").length ?? 0;
  const avgDiff =
    data && data.films.length > 0
      ? (
          data.films.reduce((s, f) => s + f.diff, 0) / data.films.length
        ).toFixed(2)
      : null;

  const sortedFilms = data
    ? [...data.films].sort((a, b) =>
        sortDir === "asc" ? a.diff - b.diff : b.diff - a.diff,
      )
    : [];

  const sortedDirectors = data
    ? [...data.directors].sort((a, b) => {
        const val =
          directorSortKey === "films"
            ? a.film_count - b.film_count
            : a.avg_diff - b.avg_diff;
        return directorSortDir === "asc" ? val : -val;
      })
    : [];

  const snapHalf = (n: number) => Math.round(n * 2) / 2;
  const heatmapCounts: Record<string, number> = {};
  if (data) {
    for (const f of data.films) {
      const key = `${f.user_rating},${snapHalf(f.db_rating)}`;
      heatmapCounts[key] = (heatmapCounts[key] ?? 0) + 1;
    }
  }
  const heatmapMax = Math.max(...Object.values(heatmapCounts), 1);

  const handleDirectorSort = (key: "films" | "diff") => {
    if (directorSortKey === key) {
      setDirectorSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setDirectorSortKey(key);
      setDirectorSortDir(key === "diff" ? "asc" : "desc");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">SignalScore</h1>
        <Link
          to="/"
          className="text-zinc-400 hover:text-zinc-200 text-sm transition"
        >
          ← Home
        </Link>
      </div>

      {stage === "input" && (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm flex flex-col gap-3"
        >
          <label className="text-sm text-zinc-400">
            Enter your Letterboxd username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="e.g. lilfilm"
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2 rounded-lg transition cursor-pointer"
          >
            Go
          </button>
        </form>
      )}

      {stage === "cached" && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <p className="text-sm text-zinc-300 mb-1">
              Found cached data for{" "}
              <span className="font-semibold text-zinc-100">{username}</span>
            </p>
            <p className="text-xs text-zinc-500">
              Last updated:{" "}
              {cachedDate
                ? new Date(cachedDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : cachedDate}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Update
            </button>
            <button
              onClick={handleUseCached}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Use cached data
            </button>
          </div>
        </div>
      )}

      {stage === "loading" && (
        <div className="flex flex-col items-center gap-3 mt-8 text-zinc-400">
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm">Fetching profile for {username}…</p>
          <p className="text-xs text-zinc-600">
            This can take a moment for large libraries.
          </p>
        </div>
      )}

      {stage === "error" && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              setStage("input");
              setError(null);
            }}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            ← Try again
          </button>
        </div>
      )}

      {stage === "results" && data && (
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <p className="text-zinc-400 text-sm">
            Comparing{" "}
            <span className="text-zinc-200 font-medium">{data.matched}</span>{" "}
            rated films for{" "}
            <span className="text-zinc-200 font-medium">{data.username}</span>
          </p>
          <p className="text-zinc-400 text-sm -mt-4">
            Database was last updated on Febuary 12, 2026. Newer releases may
            not appear.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Rated higher",
                value: higher,
                color: "text-emerald-400",
              },
              { label: "Rated lower", value: lower, color: "text-red-400" },
              { label: "Same", value: same, color: "text-zinc-400" },
              {
                label: "Avg diff",
                value: avgDiff
                  ? Number(avgDiff) >= 0
                    ? `+${avgDiff}`
                    : avgDiff
                  : "—",
                color:
                  Number(avgDiff) >= 0 ? "text-emerald-400" : "text-red-400",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
              >
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {(
              [
                ["table", "Table"],
                ["heatmap", "Heatmap"],
                ["director", "Director"],
              ] as [Tab, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                  tab === t
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "table" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="text-left px-4 py-2 font-normal">Film</th>
                    <th className="text-right px-2 sm:px-4 py-2 font-normal">
                      You
                    </th>
                    <th className="text-right px-2 sm:px-4 py-2 font-normal">
                      LB
                    </th>
                    <th
                      className="text-right px-2 sm:px-4 py-2 font-normal cursor-pointer select-none hover:text-zinc-300 transition"
                      onClick={() =>
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                    >
                      Diff {sortDir === "asc" ? "↑" : "↓"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilms.map((f) => (
                    <tr
                      key={f.slug}
                      className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 py-2.5 max-w-0 w-full truncate">
                        <a
                          href={`https://letterboxd.com/film/${f.slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:text-emerald-400 transition"
                        >
                          {f.title}
                        </a>
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-zinc-300 whitespace-nowrap">
                        {f.user_rating.toFixed(1)}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-zinc-500 whitespace-nowrap">
                        {f.db_rating.toFixed(1)}
                      </td>
                      <td
                        className={`px-2 sm:px-4 py-2.5 text-right font-medium whitespace-nowrap ${f.diff > 0 ? "text-emerald-400" : f.diff < 0 ? "text-red-400" : "text-zinc-500"}`}
                      >
                        {f.diff > 0 ? "+" : ""}
                        {f.diff.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "director" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="text-left px-4 py-2 font-normal">
                      Director
                    </th>
                    <th
                      className="text-right px-2 sm:px-4 py-2 font-normal cursor-pointer select-none hover:text-zinc-300 transition whitespace-nowrap"
                      onClick={() => handleDirectorSort("films")}
                    >
                      {`Films${directorSortKey === "films" ? (directorSortDir === "asc" ? " ↑" : " ↓") : ""}`}
                    </th>
                    <th
                      className="text-right px-2 sm:px-4 py-2 font-normal cursor-pointer select-none hover:text-zinc-300 transition whitespace-nowrap"
                      onClick={() => handleDirectorSort("diff")}
                    >
                      {`Diff${directorSortKey === "diff" ? (directorSortDir === "asc" ? " ↑" : " ↓") : ""}`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDirectors.map((d) => (
                    <tr
                      key={d.name}
                      className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 py-2.5 max-w-0 w-full truncate">
                        <a
                          href={`https://letterboxd.com/director/${d.slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:text-emerald-400 transition"
                        >
                          {d.name}
                        </a>
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 text-right text-zinc-500 whitespace-nowrap">
                        {d.film_count}
                      </td>
                      <td
                        className={`px-2 sm:px-4 py-2.5 text-right font-medium whitespace-nowrap ${d.avg_diff > 0 ? "text-emerald-400" : d.avg_diff < 0 ? "text-red-400" : "text-zinc-500"}`}
                      >
                        {d.avg_diff > 0 ? "+" : ""}
                        {d.avg_diff.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "heatmap" && (
            <div className="flex gap-3 items-start overflow-x-auto justify-center -ml-1">
              <div
                className="text-xs text-zinc-500 shrink-0 self-center"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                LB rating
              </div>
              <div className="flex flex-col gap-2">
                <div
                  className="[--cw:30px] sm:[--cw:44px]"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto repeat(10, var(--cw))",
                    gap: "2px",
                  }}
                >
                  {[...RATINGS].reverse().map((lb) => (
                    <>
                      <div
                        key={`label-${lb}`}
                        className="text-xs text-zinc-500 flex items-center justify-end pr-2 h-7.5 sm:h-11"
                      >
                        {lb.toFixed(1)}
                      </div>
                      {RATINGS.map((user) => {
                        const count = heatmapCounts[`${user},${lb}`] ?? 0;
                        const isDiag = user === lb;
                        const intensity =
                          count === 0 ? 0 : 0.2 + 0.8 * (count / heatmapMax);
                        return (
                          <div
                            key={`${user},${lb}`}
                            className={`h-7.5 sm:h-11 rounded-sm flex items-center justify-center ${isDiag ? "ring-1 ring-inset ring-zinc-600" : ""}`}
                            style={{
                              backgroundColor:
                                count === 0
                                  ? "rgb(24,24,27)"
                                  : `rgba(52,211,153,${intensity})`,
                            }}
                            title={
                              count > 0
                                ? `${count} film${count !== 1 ? "s" : ""}`
                                : undefined
                            }
                          >
                            {count > 0 && (
                              <span
                                className={`text-xs font-semibold ${intensity > 0.5 ? "text-zinc-900" : "text-emerald-300"}`}
                              >
                                {count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ))}
                  <div />
                  {RATINGS.map((r) => (
                    <div
                      key={r}
                      className="text-xs text-zinc-500 text-center pt-1"
                    >
                      {r.toFixed(1)}
                    </div>
                  ))}
                </div>
                <p
                  className="text-xs text-zinc-500 text-center"
                  style={{ paddingLeft: "38px" }}
                >
                  Your rating
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
