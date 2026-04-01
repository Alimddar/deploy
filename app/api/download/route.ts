import type { NextRequest } from "next/server";
import { buildAwsUrl } from "../../../lib/gallery";

const SAFE_FILE_NAME = /^[A-Za-z0-9._-]+$/;

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");

  if (!file || !SAFE_FILE_NAME.test(file)) {
    return new Response("Invalid file name.", { status: 400 });
  }

  const response = await fetch(buildAwsUrl(file), { cache: "no-store" });

  if (!response.ok || !response.body) {
    return new Response("File could not be downloaded.", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Disposition", `attachment; filename="${file}"`);
  headers.set("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");

  return new Response(response.body, {
    status: 200,
    headers
  });
}
