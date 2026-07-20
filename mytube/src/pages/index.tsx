import Head from "next/head";
import { useState } from "react";
import CategoryTabs, { type Category } from "@/components/CategoryTab";
import Videogrid from "@/components/Videogrid";

export default function Home() {
  const [category, setCategory] = useState<Category>("All");

  return (
    <>
      <Head>
        <title>MyTube - Watch, share, and discover videos</title>
        <meta name="description" content="Watch, share, and discover videos on MyTube — your home for great content." />
        <meta property="og:title" content="MyTube - Watch, share, and discover videos" />
        <meta property="og:description" content="Watch, share, and discover videos on MyTube." />
      </Head>
      <main className="flex-1 px-4 md:px-6 pt-2 pb-8">
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="sticky top-14 z-20 bg-background/95 backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6">
            <CategoryTabs value={category} onChange={setCategory} />
          </div>
          <Videogrid activeCategory={category} />
        </div>
      </main>
    </>
  );
}