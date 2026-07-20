import CategoryPage from '@/components/CategoryPage';
export default function MusicPage() {
  return (
    <CategoryPage
      title="Music"
      description="Music videos, concerts, covers, and playlists"
      category="Music"
      gradient="bg-linear-to-br from-purple-600 to-pink-700"
      icon={<span className="text-3xl">🎵</span>}
    />
  );
}
