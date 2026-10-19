// POST a Hot Rail Forecast PDF; returns the parsed forecast. Runs on Node (pdfjs); the page only
// sends the file and stores the result itself.

import { NextResponse } from "next/server";
import { parseHotRailPdf } from "@/lib/weather/hotrailPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4_000_000;

export async function POST(req: Request): Promise<Response> {
  const buf = new Uint8Array(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (buf.length > MAX_BYTES) return NextResponse.json({ error: "The file is over 4 MB." }, { status: 413 });
  if (String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") return NextResponse.json({ error: "That is not a PDF." }, { status: 400 });
  try {
    const f = await parseHotRailPdf(buf);
    if (!f.areas.length) return NextResponse.json({ error: "No forecast panels found: is this the Hot Rail Forecast?" }, { status: 422 });
    return NextResponse.json(f);
  } catch (e) {
    return NextResponse.json({ error: `Could not read the PDF: ${(e as Error).message}` }, { status: 422 });
  }
}
