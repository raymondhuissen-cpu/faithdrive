import { NextRequest, NextResponse } from "next/server";
import { getNewsItems } from "@/lib/rss";

export const revalidate = 600; // 10 minuten

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.toLowerCase();

  let items = await getNewsItems();

  if (category && category !== "all") {
    items = items.filter((item) => item.category === category);
  }

  if (q) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
    );
  }

  return NextResponse.json(items);
}
