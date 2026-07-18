"use client";

import { useEffect, useState, useCallback } from "react";
import { NewsItem } from "@/lib/rss";
import NewsCard from "./NewsCard";

type Category = "all" | NewsItem["category"];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "landelijk", label: "Landelijk nieuws" },
  { value: "ziekenhuis", label: "Ziekenhuizen" },
];

export default function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("q", search);
      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(query);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === c.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 sm:ml-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek nieuws..."
            className="border border-gray-200 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-52"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-full px-4 py-1.5 text-sm hover:bg-blue-700 transition-colors"
          >
            Zoek
          </button>
        </form>
      </div>

      {/* Status */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-2xl h-56 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">Kon nieuws niet laden</p>
          <button
            onClick={fetchNews}
            className="mt-3 text-blue-600 underline text-sm"
          >
            Probeer opnieuw
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          Geen artikelen gevonden.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
