import CategoryPage from '@/components/CategoryPage';
export default function FoodPage() {
  return (
    <CategoryPage
      title="Food"
      description="Recipes, cooking, and food culture"
      category="Food"
      gradient="bg-linear-to-br from-orange-500 to-red-600"
      icon={<span className="text-3xl">🍕</span>}
    />
  );
}
