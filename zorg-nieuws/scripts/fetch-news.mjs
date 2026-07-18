// Draait als onderdeel van de GitHub Action — haalt alle feeds op en slaat op als JSON
import Parser from "rss-parser";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FEEDS = [
  { url: "https://feeds.nos.nl/nosnieuwsgezondheid", source: "NOS Gezondheid", category: "landelijk" },
  { url: "https://www.zorgvisie.nl/feed/", source: "Zorgvisie", category: "landelijk" },
  { url: "https://www.skipr.nl/feed/", source: "Skipr", category: "landelijk" },
  { url: "https://www.medischcontact.nl/rss/nieuws.xml", source: "Medisch Contact", category: "landelijk" },
  { url: "https://www.nrc.nl/rss/gezondheid", source: "NRC Gezondheid", category: "landelijk" },
  { url: "https://www.rijksoverheid.nl/actueel/nieuws.rss?onderwerp=zorg", source: "Rijksoverheid VWS", category: "landelijk" },
  { url: "https://www.volkskrant.nl/nieuws-achtergrond/gezondheid/rss.xml", source: "Volkskrant Gezondheid", category: "landelijk" },
  { url: "https://www.amsterdamumc.nl/rss/nieuws", source: "Amsterdam UMC", category: "ziekenhuis" },
  { url: "https://www.erasmusmc.nl/nl-nl/rss/nieuws", source: "Erasmus MC", category: "ziekenhuis" },
  { url: "https://www.radboudumc.nl/rss/nieuws", source: "Radboud UMC", category: "ziekenhuis" },
  { url: "https://www.lumc.nl/rss/nieuws", source: "LUMC", category: "ziekenhuis" },
  { url: "https://www.umcg.nl/NL/UMCG/nieuws-en-pers/Pages/nieuwsoverzicht.aspx", source: "UMCG", category: "ziekenhuis" },
  { url: "https://www.umcutrecht.nl/rss/nieuws", source: "UMC Utrecht", category: "ziekenhuis" },
  { url: "https://www.catharina-ziekenhuis.nl/nieuws/rss", source: "Catharina Ziekenhuis", category: "ziekenhuis" },
  { url: "https://www.isala.nl/rss/nieuws", source: "Isala", category: "ziekenhuis" },
  { url: "https://www.st-antonius.nl/rss/nieuws", source: "St. Antonius", category: "ziekenhuis" },
  { url: "https://www.mst.nl/rss/nieuws", source: "MST", category: "ziekenhuis" },
];

const parser = new Parser({ customFields: { item: ["media:content", "enclosure"] } });

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, "").trim().slice(0, 300);
}

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items ?? []).slice(0, 15).map((item, i) => ({
      id: `${feed.source}-${i}-${item.link ?? ""}`,
      title: item.title ?? "",
      link: item.link ?? "#",
      pubDate: item.pubDate ?? item.isoDate ?? "",
      summary: stripHtml(item.contentSnippet ?? item.summary ?? ""),
      source: feed.source,
      category: feed.category,
      image: item["media:content"]?.["$"]?.url ?? item.enclosure?.url ?? undefined,
    }));
  } catch (err) {
    console.warn(`⚠ ${feed.source}: ${err.message}`);
    return [];
  }
}

const results = await Promise.allSettled(FEEDS.map(fetchFeed));
const items = results
  .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
  .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

const outPath = resolve(__dirname, "../data/news-cache.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ fetchedAt: new Date().toISOString(), items }, null, 2));

console.log(`✓ ${items.length} artikelen opgeslagen in data/news-cache.json`);
