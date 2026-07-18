import Parser from "rss-parser";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
  source: string;
  category: "landelijk" | "regionaal" | "ziekenhuis";
  image?: string;
};

type FeedConfig = {
  url: string;
  source: string;
  category: NewsItem["category"];
};

const FEEDS: FeedConfig[] = [
  // Landelijk
  {
    url: "https://feeds.nos.nl/nosnieuwsgezondheid",
    source: "NOS Gezondheid",
    category: "landelijk",
  },
  {
    url: "https://www.zorgvisie.nl/feed/",
    source: "Zorgvisie",
    category: "landelijk",
  },
  {
    url: "https://www.skipr.nl/feed/",
    source: "Skipr",
    category: "landelijk",
  },
  // Regionaal
  {
    url: "https://www.omroepgelderland.nl/nieuws/gezondheid.rss",
    source: "Omroep Gelderland",
    category: "regionaal",
  },
  {
    url: "https://www.rtvnoord.nl/rss/gezondheid",
    source: "RTV Noord",
    category: "regionaal",
  },
  // Ziekenhuizen
  {
    url: "https://www.umcg.nl/NL/UMCG/nieuws-en-pers/Pages/nieuwsoverzicht.aspx",
    source: "UMCG",
    category: "ziekenhuis",
  },
  {
    url: "https://www.erasmusmc.nl/nl-nl/rss/nieuws",
    source: "Erasmus MC",
    category: "ziekenhuis",
  },
  {
    url: "https://www.radboudumc.nl/rss/nieuws",
    source: "Radboud UMC",
    category: "ziekenhuis",
  },
  {
    url: "https://www.lumc.nl/rss/nieuws",
    source: "LUMC",
    category: "ziekenhuis",
  },
  {
    url: "https://www.amsterdamumc.nl/rss/nieuws",
    source: "Amsterdam UMC",
    category: "ziekenhuis",
  },
];

const parser = new Parser({
  customFields: {
    item: ["media:content", "enclosure"],
  },
});

let _cache: { items: NewsItem[]; fetchedAt: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minuten

async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items ?? []).slice(0, 10).map((item, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = item as any;
      const image: string | undefined =
        raw["media:content"]?.["$"]?.url ||
        raw["enclosure"]?.url ||
        undefined;

      return {
        id: `${feed.source}-${i}-${item.link ?? ""}`,
        title: item.title ?? "",
        link: item.link ?? "#",
        pubDate: item.pubDate ?? item.isoDate ?? "",
        summary: stripHtml(item.contentSnippet ?? item.summary ?? ""),
        source: feed.source,
        category: feed.category,
        image,
      };
    });
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim().slice(0, 300);
}

export async function getNewsItems(): Promise<NewsItem[]> {
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL) {
    return _cache.items;
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const items = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  _cache = { items, fetchedAt: Date.now() };
  return items;
}
