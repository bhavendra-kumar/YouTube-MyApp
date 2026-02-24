import CategoryTabs from "@/components/CategoryTab";
import Videogrid from "@/components/Videogrid";
import { Suspense } from "react";
import { useState } from "react";
import type { Category } from "@/components/CategoryTab";

export default function Home() {
  const [category, setCategory] = useState<Category>("All");

  return (
    <main className="flex-1 p-4">
      <div className="mx-auto w-full max-w-7xl">
        <CategoryTabs value={category} onChange={setCategory} />
        <Suspense fallback={<div>Loading videos...</div>}>
          <Videogrid activeCategory={category} />
        </Suspense>
      </div>
    </main>
  );
}