import Head from "next/head";
import { ReactNode } from "react";
import Videogrid from "@/components/Videogrid";

interface CategoryPageProps {
  title: string;
  description: string;
  category: string;
  icon: ReactNode;
  gradient: string;
}

export default function CategoryPage({ title, description, category, icon, gradient }: CategoryPageProps) {
  return (
    <>
      <Head>
        <title>{title} - MyTube</title>
        <meta name="description" content={description} />
      </Head>
      <main className="px-4 md:px-6 pb-8">
        {/* Hero header */}
        <div className={`${gradient} rounded-2xl mx-0 mt-4 mb-6 p-8 flex items-center gap-6`}>
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="text-white/80 mt-1 text-sm">{description}</p>
          </div>
        </div>
        <div className="max-w-screen-2xl mx-auto">
          <Videogrid activeCategory={category} />
        </div>
      </main>
    </>
  );
}
