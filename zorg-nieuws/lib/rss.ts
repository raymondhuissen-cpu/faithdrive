import Parser from "rss-parser";
import { readFileSync } from "fs";
import { resolve } from "path";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
  source: string;
  category: "landelijk" | "ziekenhuis";
  image?: string;
};

type FeedConfig = {
  url: string;
  source: string;
  category: NewsItem["category"];
};


const FEEDS: FeedConfig[] = [
  // Landelijk nieuws & vakbladen
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
  {
    url: "https://www.medischcontact.nl/rss/nieuws.xml",
    source: "Medisch Contact",
    category: "landelijk",
  },
  {
    url: "https://www.nrc.nl/rss/gezondheid",
    source: "NRC Gezondheid",
    category: "landelijk",
  },
  {
    url: "https://www.rijksoverheid.nl/actueel/nieuws.rss?onderwerp=zorg",
    source: "Rijksoverheid VWS",
    category: "landelijk",
  },
  {
    url: "https://www.volkskrant.nl/nieuws-achtergrond/gezondheid/rss.xml",
    source: "Volkskrant Gezondheid",
    category: "landelijk",
  },
  // UMC's
  {
    url: "https://www.amsterdamumc.nl/rss/nieuws",
    source: "Amsterdam UMC",
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
    url: "https://www.umcg.nl/NL/UMCG/nieuws-en-pers/Pages/nieuwsoverzicht.aspx",
    source: "UMCG",
    category: "ziekenhuis",
  },
  {
    url: "https://www.umcutrecht.nl/rss/nieuws",
    source: "UMC Utrecht",
    category: "ziekenhuis",
  },
  // Topklinische ziekenhuizen
  {
    url: "https://www.catharina-ziekenhuis.nl/nieuws/rss",
    source: "Catharina Ziekenhuis",
    category: "ziekenhuis",
  },
  {
    url: "https://www.isala.nl/rss/nieuws",
    source: "Isala",
    category: "ziekenhuis",
  },
  {
    url: "https://www.st-antonius.nl/rss/nieuws",
    source: "St. Antonius",
    category: "ziekenhuis",
  },
  {
    url: "https://www.mst.nl/rss/nieuws",
    source: "MST",
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

function loadCachedFile(): NewsItem[] {
  try {
    const raw = readFileSync(resolve(process.cwd(), "data/news-cache.json"), "utf-8");
    const parsed = JSON.parse(raw) as { items: NewsItem[] };
    return parsed.items ?? [];
  } catch {
    return [];
  }
}

export async function getNewsItems(): Promise<NewsItem[]> {
  if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL) {
    return _cache.items;
  }

  // Probeer live feeds; valt terug op dagelijks bijgewerkte JSON-cache
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const live = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const items = (live.length > 0 ? live : loadCachedFile()).sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  _cache = { items, fetchedAt: Date.now() };
  return items;
}
