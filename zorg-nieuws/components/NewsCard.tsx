"use client";

import { NewsItem } from "@/lib/rss";

const CATEGORY_LABELS: Record<NewsItem["category"], string> = {
  landelijk: "Landelijk",
  regionaal: "Regionaal",
  ziekenhuis: "Ziekenhuis",
};

const CATEGORY_COLORS: Record<NewsItem["category"], string> = {
  landelijk: "bg-blue-100 text-blue-800",
  regionaal: "bg-green-100 text-green-800",
  ziekenhuis: "bg-purple-100 text-purple-800",
};

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden"
    >
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          className="w-full h-44 object-cover"
        />
      )}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}
          >
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="text-xs text-gray-400">{item.source}</span>
        </div>
        <h2 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-3">
          {item.title}
        </h2>
        {item.summary && (
          <p className="text-xs text-gray-500 line-clamp-3">{item.summary}</p>
        )}
        <div className="mt-auto pt-2 text-xs text-gray-400">
          {formatDate(item.pubDate)}
        </div>
      </div>
    </a>
  );
}
