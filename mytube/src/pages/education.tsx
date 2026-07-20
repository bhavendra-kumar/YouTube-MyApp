import CategoryPage from '@/components/CategoryPage';
export default function EducationPage() {
  return (
    <CategoryPage
      title="Education"
      description="Learn anything with educational videos"
      category="Education"
      gradient="bg-linear-to-br from-indigo-600 to-violet-700"
      icon={<span className="text-3xl">🎓</span>}
    />
  );
}
