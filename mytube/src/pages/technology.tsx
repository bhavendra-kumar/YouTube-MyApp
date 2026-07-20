import CategoryPage from '@/components/CategoryPage';
export default function TechnologyPage() {
  return (
    <CategoryPage
      title="Technology"
      description="Tech reviews, tutorials, and innovation"
      category="Technology"
      gradient="bg-linear-to-br from-cyan-600 to-blue-700"
      icon={<span className="text-3xl">💻</span>}
    />
  );
}
