import CategoryPage from '@/components/CategoryPage';
export default function FashionPage() {
  return (
    <CategoryPage
      title="Fashion"
      description="Style, trends, and beauty content"
      category="Fashion"
      gradient="bg-linear-to-br from-pink-500 to-rose-700"
      icon={<span className="text-3xl">👗</span>}
    />
  );
}
