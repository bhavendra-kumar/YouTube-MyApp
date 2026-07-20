"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORIES = [
  "All",
  "Gaming",
  "Music",
  "News",
  "Live",
  "Technology",
  "Sports",
  "Education",
  "Movies",
  "Food",
  "Travel",
  "Fashion",
  "Science",
  "Pets & Animals",
  "Autos",
  "Comedy",
  "Entertainment",
  "Howto",
  "Nonprofit",
  "Politics",
] as const;

export type Category = (typeof CATEGORIES)[number] | string;

interface CategoryTabsProps {
  value: Category;
  onChange: (cat: Category) => void;
}

export default function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  }, []);

  return (
    <div className="relative flex items-center">
      {/* Left gradient + arrow */}
      {showLeft && (
        <div className="absolute left-0 z-10 flex items-center h-full">
          <div className="w-12 h-full bg-linear-to-r from-background to-transparent pointer-events-none" />
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-1 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Chips scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={cn(
              "yt-chip shrink-0",
              value === cat && "yt-chip-active"
            )}
            aria-pressed={value === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Right gradient + arrow */}
      {showRight && (
        <div className="absolute right-0 z-10 flex items-center h-full justify-end">
          <div className="w-12 h-full bg-linear-to-l from-background to-transparent pointer-events-none" />
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-1 h-8 w-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
