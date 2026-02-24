import { Link } from "react-router-dom";

const modules = [
  {
    to: "/roulette",
    name: "Roulette",
    description: "Spin for a random film from the database, filtered by you.",
  },
  {
    to: "/signal-score",
    name: "SignalScore™",
    description: "See how your Letterboxd ratings compare against the crowd.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold tracking-tight mb-2">LB Playground</h1>
      <p className="text-zinc-400 mb-5 text-sm">by cha ♥</p>

      <div className="flex flex-col gap-4  w-3/4 sm:w-1/2 max-w-xl">
        {modules.map(({ to, name, description }) => (
          <Link
            key={to}
            to={to}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-600 rounded-xl p-6 transition group"
          >
            <h2 className="text-lg font-semibold mb-1 group-hover:text-emerald-400 transition">
              {name}
            </h2>
            <p className="text-zinc-400 text-sm">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
