import NewsFeed from "@/components/NewsFeed";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xl">
            🏥
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">
              ZorgNieuws
            </h1>
            <p className="text-xs text-gray-500">
              Actueel nieuws uit de zorgsector
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Laatste nieuws</h2>
          <p className="text-sm text-gray-500 mt-1">
            Landelijk, regionaal en van ziekenhuizen in Nederland
          </p>
        </div>
        <NewsFeed />
      </div>
    </main>
  );
}
