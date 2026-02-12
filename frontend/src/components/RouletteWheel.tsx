import { useState, useCallback } from "react";
import type { Film } from "../types";

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const FRAME_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const REPETITIONS = 15;

interface RouletteWheelProps {
  films: Film[];
  onResult: (film: Film) => void;
}

export default function RouletteWheel({ films, onResult }: RouletteWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasSpun, setHasSpun] = useState(false);

  const totalItems = films.length * REPETITIONS;
  const centerOffset = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

  const spinDuration = Math.max(
    3000,
    Math.min(4500, 4500 - (films.length - 5) * 30),
  );

  const spin = useCallback(() => {
    if (spinning || films.length === 0) return;

    setSpinning(true);
    setSelectedIndex(null);
    setHasSpun(true);

    setTransitioning(false);
    setOffset(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const winnerIndex = Math.floor(Math.random() * films.length);
        const middleRepStart = Math.floor(REPETITIONS / 2) * films.length;
        const targetItem = middleRepStart + winnerIndex;
        const targetOffset = targetItem * ITEM_HEIGHT - centerOffset;
        const totalItems = films.length * REPETITIONS;
        const itemsRemaining = totalItems - targetItem - 1;
        const maxExtraCycles = Math.floor(itemsRemaining / films.length);
        const desiredCycles = Math.min(
          6,
          Math.max(2, Math.ceil(50 / films.length)),
        );
        const extraCycles = Math.min(maxExtraCycles, desiredCycles);
        const extraScroll = films.length * ITEM_HEIGHT * extraCycles;
        const finalOffset = targetOffset + extraScroll;

        setTransitioning(true);
        setOffset(finalOffset);

        setTimeout(() => {
          setSpinning(false);
          setSelectedIndex(winnerIndex);
          onResult(films[winnerIndex]);
        }, spinDuration);
      });
    });
  }, [spinning, films, onResult, centerOffset, spinDuration]);

  const items = Array.from(
    { length: totalItems },
    (_, i) => films[i % films.length],
  );

  const centerItemIndex = transitioning
    ? null
    : Math.round(offset / ITEM_HEIGHT) + Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="relative w-full">
        <div
          className="relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900"
          style={{ height: FRAME_HEIGHT }}
        >
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                "linear-gradient(to bottom, rgb(24 24 27) 0%, transparent 30%, transparent 70%, rgb(24 24 27) 100%)",
            }}
          />

          <div
            className="absolute inset-x-0 z-20 pointer-events-none border-y border-emerald-500/50 bg-emerald-500/5"
            style={{
              top: centerOffset,
              height: ITEM_HEIGHT,
            }}
          />

          <div
            style={{
              transform: `translateY(-${offset}px)`,
              transition: transitioning
                ? `transform ${spinDuration}ms cubic-bezier(0.15, 0.6, 0.35, 1)`
                : "none",
            }}
          >
            {items.map((film, i) => {
              const isWinner =
                selectedIndex !== null &&
                i % films.length === selectedIndex &&
                !spinning;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 border-b border-zinc-800/50 transition-colors ${
                    isWinner && centerItemIndex === i
                      ? "text-emerald-300"
                      : "text-zinc-300"
                  }`}
                  style={{ height: ITEM_HEIGHT }}
                >
                  <span className="text-xs text-zinc-500 w-6 text-right shrink-0">
                    {film.year}
                  </span>
                  <span className="text-sm font-sm truncate">{film.title}</span>
                  <span className="text-xs text-zinc-500 ml-auto shrink-0">
                    {film.rating} ★
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={spin}
        disabled={spinning || films.length === 0}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white font-semibold px-8 py-3 rounded-lg transition cursor-pointer disabled:cursor-not-allowed w-full"
      >
        {spinning ? "Spinning..." : hasSpun ? "Spin Again" : "Spin"}
      </button>
    </div>
  );
}
