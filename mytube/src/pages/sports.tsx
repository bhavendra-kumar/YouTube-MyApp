import CategoryPage from '@/components/CategoryPage';
export default function SportsPage() {
  return (
    <CategoryPage
      title="Sports"
      description="Live sports, highlights, and fitness content"
      category="Sports"
      gradient="bg-linear-to-br from-blue-600 to-cyan-700"
      icon={<span className="text-3xl">🏆</span>}
    />
  );
}
