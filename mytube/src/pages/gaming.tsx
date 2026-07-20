import CategoryPage from '@/components/CategoryPage';
export default function GamingPage() {
  return (
    <CategoryPage
      title="Gaming"
      description="Gaming videos, gameplay, reviews, and esports"
      category="Gaming"
      gradient="bg-linear-to-br from-green-600 to-emerald-800"
      icon={<span className="text-3xl">🎮</span>}
    />
  );
}
