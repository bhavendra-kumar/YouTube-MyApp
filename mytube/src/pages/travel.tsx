import CategoryPage from '@/components/CategoryPage';
export default function TravelPage() {
  return (
    <CategoryPage
      title="Travel"
      description="Explore the world through travel videos"
      category="Travel"
      gradient="bg-linear-to-br from-teal-500 to-green-700"
      icon={<span className="text-3xl">✈️</span>}
    />
  );
}
