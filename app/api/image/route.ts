import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import sharp from "sharp";
import { buildAwsUrl } from "../../../lib/gallery";

export const runtime = "nodejs";

const SAFE_FILE_NAME = /^[A-Za-z0-9._-]+$/;
const CACHE_DIR = path.join("/tmp", "sekine-gallery-image-cache");
const pendingTransforms = new Map<string, Promise<Buffer>>();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFormatFromAcceptHeader(accept: string) {
  if (accept.includes("image/avif")) {
    return { contentType: "image/avif", extension: "avif" as const };
  }

  if (accept.includes("image/webp")) {
    return { contentType: "image/webp", extension: "webp" as const };
  }

  return { contentType: "image/jpeg", extension: "jpg" as const };
}

function getCachePath(file: string, width: number, quality: number, extension: string) {
  const hash = createHash("sha1").update(`${file}:${width}:${quality}:${extension}`).digest("hex");
  return path.join(CACHE_DIR, `${hash}.${extension}`);
}

async function readCachedVariant(cachePath: string) {
  try {
    return await readFile(cachePath);
  } catch {
    return null;
  }
}

async function buildVariant(file: string, width: number, quality: number, contentType: string) {
  const upstream = await fetch(buildAwsUrl(file), {
    next: { revalidate: 60 * 60 * 24 * 30 }
  });

  if (!upstream.ok) {
    throw new Error("SOURCE_IMAGE_NOT_FOUND");
  }

  const input = Buffer.from(await upstream.arrayBuffer());
  let transformer = sharp(input).rotate().resize({
    width,
    withoutEnlargement: true,
    fastShrinkOnLoad: true
  });

  if (contentType === "image/avif") {
    transformer = transformer.avif({ quality });
  } else if (contentType === "image/webp") {
    transformer = transformer.webp({ quality });
  } else {
    transformer = transformer.jpeg({ quality, mozjpeg: true });
  }

  return transformer.toBuffer();
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
  const accept = request.headers.get("accept") ?? "";
  const { contentType, extension } = getFormatFromAcceptHeader(accept);
  const cachePath = getCachePath(file, width, quality, extension);

  try {
    await mkdir(CACHE_DIR, { recursive: true });

    const cachedVariant = await readCachedVariant(cachePath);
    if (cachedVariant) {
      return new Response(new Uint8Array(cachedVariant), {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
          "Content-Type": contentType,
          Vary: "Accept",
          "X-Image-Cache": "HIT"
        }
      });
    }

    let transformPromise = pendingTransforms.get(cachePath);
    if (!transformPromise) {
      transformPromise = buildVariant(file, width, quality, contentType);
      pendingTransforms.set(cachePath, transformPromise);
    }

    const output = await transformPromise;
    pendingTransforms.delete(cachePath);

    void writeFile(cachePath, output).catch(() => {});

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
        "Content-Type": contentType,
        Vary: "Accept",
        "X-Image-Cache": "MISS"
      }
    });
  } catch (error) {
    pendingTransforms.delete(cachePath);

    if (error instanceof Error && error.message === "SOURCE_IMAGE_NOT_FOUND") {
      return new Response("Source image not found.", { status: 404 });
    }

    return new Response("Image processing failed.", { status: 500 });
  }
}
