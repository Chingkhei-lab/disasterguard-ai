import axios from "axios";
import { NextResponse } from "next/server";

export const revalidate = 3600;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export async function GET() {
  try {
    const firmsApiKey = process.env.NASA_FIRMS_API_KEY;

    if (!firmsApiKey) {
      return NextResponse.json(
        { success: false, data: null, error: "Missing NASA_FIRMS_API_KEY" },
        { status: 500 },
      );
    }

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsApiKey}/VIIRS_SNPP_NRT/world/1`;
    const response = await axios.get<string>(url, {
      timeout: 10_000,
      responseType: "text",
    });

    const lines = response.data
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length <= 1) {
      return NextResponse.json({ success: true, data: [], error: null });
    }

    const headers = parseCsvLine(lines[0]);
    const headerIndex = new Map(headers.map((header, index) => [header, index]));

    const result = lines.slice(1)
      .map((line) => {
        const values = parseCsvLine(line);
        return {
          latitude: Number(values[headerIndex.get("latitude") ?? -1]),
          longitude: Number(values[headerIndex.get("longitude") ?? -1]),
          bright_ti4: Number(values[headerIndex.get("bright_ti4") ?? -1]),
          confidence: values[headerIndex.get("confidence") ?? -1] ?? "",
          acq_date: values[headerIndex.get("acq_date") ?? -1] ?? "",
        };
      })
      .filter((row: Record<string, string | number>) => {
        const conf = String(row.confidence)?.toLowerCase();
        // Handle both text format (VIIRS) and numeric format
        return conf === "nominal" ||
               conf === "high" ||
               parseInt(conf) > 70;
      });

    return NextResponse.json({ success: true, data: result, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch fires";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
