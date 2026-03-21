import axios from "axios";
import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

export const revalidate = 3600;

type GdacsItem = {
  title: string;
  description: string;
  pubDate: string;
  "geo:lat": string;
  "geo:long": string;
  "gdacs:alertlevel": string;
  "gdacs:eventtype": string;
};

export async function GET() {
  try {
    const response = await axios.get<string>("https://www.gdacs.org/xml/rss.xml", {
      timeout: 10_000,
      responseType: "text",
    });

    const parsed = await parseStringPromise(response.data, {
      explicitArray: false,
      trim: true,
    });

    const channelItems = parsed?.rss?.channel?.item;
    const items = Array.isArray(channelItems)
      ? channelItems
      : channelItems
        ? [channelItems]
        : [];

    const alerts: GdacsItem[] = items.map((item: Record<string, unknown>) => ({
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      pubDate: String(item.pubDate ?? ""),
      "geo:lat": String(item["geo:lat"] ?? ""),
      "geo:long": String(item["geo:long"] ?? ""),
      "gdacs:alertlevel": String(item["gdacs:alertlevel"] ?? ""),
      "gdacs:eventtype": String(item["gdacs:eventtype"] ?? ""),
    }));

    return NextResponse.json({ success: true, data: alerts, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch alerts";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
