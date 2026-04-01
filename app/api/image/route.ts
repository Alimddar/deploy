import type { NextRequest } from "next/server";
import sharp from "sharp";
import { buildAwsUrl } from "../../../lib/gallery";

export const runtime = "nodejs";

const SAFE_FILE_NAME = /^[A-Za-z0-9._-]+$/;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");

  if (!file || !SAFE_FILE_NAME.test(file)) {
    return new Response("Invalid file name.", { status: 400 });
  }

  const requestedWidth = Number(request.nextUrl.searchParams.get("w") ?? "760");
  const requestedQuality = Number(request.nextUrl.searchParams.get("q") ?? "72");
  const width = clamp(Number.isFinite(requestedWidth) ? requestedWidth : 760, 320, 2200);
  const quality = clamp(Number.isFinite(requestedQuality) ? requestedQuality : 72, 45, 90);

  const upstream = await fetch(buildAwsUrl(file), {
    next: { revalidate: 60 * 60 * 24 * 30 }
  });

  if (!upstream.ok) {
    return new Response("Source image not found.", { status: 404 });
  }

  const input = Buffer.from(await upstream.arrayBuffer());
  const accept = request.headers.get("accept") ?? "";

  let transformer = sharp(input).rotate().resize({
    width,
    withoutEnlargement: true
  });
  let contentType = "image/jpeg";

  if (accept.includes("image/avif")) {
    transformer = transformer.avif({ quality });
    contentType = "image/avif";
  } else if (accept.includes("image/webp")) {
    transformer = transformer.webp({ quality });
    contentType = "image/webp";
  } else {
    transformer = transformer.jpeg({ quality, mozjpeg: true });
  }

  const output = await transformer.toBuffer();
  const body = new Uint8Array(output);

  return new Response(body, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentType,
      Vary: "Accept"
    }
  });
}
