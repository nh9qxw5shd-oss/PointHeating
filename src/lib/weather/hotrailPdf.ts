// Server-side only: reads a Hot Rail Forecast PDF's text with positions (pdfjs) and hands the
// items to the pure parser. Used by the API route and the tests.

import { parseHotRailItems, type TextItem } from "./hotrail.ts";
import type { HotRailForecast } from "./crt.ts";

export async function parseHotRailPdf(bytes: Uint8Array): Promise<HotRailForecast> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const doc = await task.promise;
  try {
    const items: TextItem[] = [];
    // Only the first page carries the tables; later pages, if any, repeat the key.
    const page = await doc.getPage(1);
    const tc = await page.getTextContent();
    for (const it of tc.items) {
      if ("str" in it) items.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
    }
    return parseHotRailItems(items);
  } finally {
    await task.destroy();
  }
}
