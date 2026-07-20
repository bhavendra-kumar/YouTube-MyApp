import CategoryPage from '@/components/CategoryPage';
export default function MoviesPage() {
  return (
    <CategoryPage
      title="Movies"
      description="Trailers, reviews, and film content"
      category="Movies"
      gradient="bg-linear-to-br from-yellow-600 to-orange-700"
      icon={<span className="text-3xl">🎬</span>}
    />
  );
}
