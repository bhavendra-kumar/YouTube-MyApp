import Head from "next/head";
import Link from "next/link";
import { Search } from "lucide-react";
import Videogrid from "@/components/Videogrid";

export default function ExplorePage() {
  const categories = [
    { name: "Gaming", href: "/gaming", emoji: "🎮", bg: "from-green-600 to-emerald-800" },
    { name: "Music", href: "/music", emoji: "🎵", bg: "from-purple-600 to-pink-700" },
    { name: "Sports", href: "/sports", emoji: "🏆", bg: "from-blue-600 to-cyan-700" },
    { name: "News", href: "/news", emoji: "📰", bg: "from-slate-600 to-gray-800" },
    { name: "Technology", href: "/technology", emoji: "💻", bg: "from-cyan-600 to-blue-700" },
    { name: "Movies", href: "/movies", emoji: "🎬", bg: "from-yellow-600 to-orange-700" },
    { name: "Fashion", href: "/fashion", emoji: "👗", bg: "from-pink-500 to-rose-700" },
    { name: "Education", href: "/education", emoji: "🎓", bg: "from-indigo-600 to-violet-700" },
    { name: "Travel", href: "/travel", emoji: "✈️", bg: "from-teal-500 to-green-700" },
    { name: "Food", href: "/food", emoji: "🍕", bg: "from-orange-500 to-red-600" },
    { name: "Trending", href: "/trending", emoji: "🔥", bg: "from-orange-600 to-red-700" },
    { name: "Live", href: "/live", emoji: "📡", bg: "from-red-600 to-rose-700" },
  ];

  return (
    <>
      <Head>
        <title>Explore - MyTube</title>
        <meta name="description" content="Explore videos by category on MyTube." />
      </Head>
      <main className="px-4 md:px-6 py-6 max-w-screen-2xl mx-auto">
        {/* Search bar shortcut */}
        <Link
          href="/search"
          className="flex items-center gap-3 h-12 w-full max-w-lg px-4 rounded-full border border-border bg-muted hover:bg-muted/80 transition-colors mb-8"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search videos, channels...</span>
        </Link>

        {/* Category grid */}
        <h1 className="text-xl font-bold mb-4">Browse categories</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className={`bg-linear-to-br ${cat.bg} rounded-xl p-4 flex flex-col justify-between min-h-20 hover:opacity-90 transition-opacity group`}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-white font-semibold text-sm mt-2">{cat.name}</span>
            </Link>
          ))}
        </div>

        {/* Recent videos */}
        <h2 className="text-xl font-bold mb-4">Recommended for you</h2>
        <Videogrid activeCategory="All" />
      </main>
    </>
  );
}
