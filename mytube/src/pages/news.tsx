import CategoryPage from '@/components/CategoryPage';
export default function NewsPage() {
  return (
    <CategoryPage
      title="News"
      description="Latest news, politics, and current events"
      category="News"
      gradient="bg-linear-to-br from-slate-600 to-gray-800"
      icon={<span className="text-3xl">📰</span>}
    />
  );
}
