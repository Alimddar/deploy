import { galleryImageNames } from "./gallery-manifest";

export type GalleryImage = {
  id: string;
  name: string;
  url: string;
  previewUrl: string;
  srcSet: string;
  sizes: string;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export const AWS_BASE_URL = "https://project-images-660c.s3.eu-north-1.amazonaws.com";

export function buildAwsUrl(fileName: string) {
  return `${AWS_BASE_URL}/${encodeURIComponent(fileName)}`;
}

/**
 * URL for a pre-generated S3 variant (created by scripts/generate-variants.mjs).
 * These are served directly from S3 — no server processing required.
 */
function buildVariantUrl(fileName: string, folder: "thumb" | "lightbox") {
  return `${AWS_BASE_URL}/variants/${folder}/${encodeURIComponent(fileName)}.webp`;
}

export function buildOptimizedUrl(fileName: string, width: number, quality = 72) {
  return `/api/image?file=${encodeURIComponent(fileName)}&w=${width}&q=${quality}`;
}

// Banner and profile are still processed on-demand (only 2 images, cached after first load)
export const bannerImageUrl = buildOptimizedUrl("Banner.JPG", 1800, 78);
export const profileImageUrl = buildOptimizedUrl("Profile.JPG", 320, 82);

const gallerySizes =
  "(max-width: 700px) calc((100vw - 2.75rem) / 2), (max-width: 980px) calc((100vw - 3.35rem) / 2), calc((100vw - 5.8rem) / 3)";

export async function getGalleryImages(): Promise<GalleryImage[]> {
  return galleryImageNames
    .filter((fileName) => IMAGE_EXTENSIONS.has(fileName.slice(fileName.lastIndexOf(".")).toLowerCase()))
    .map((fileName) => ({
      id: fileName,
      name: fileName,
      // Served directly from S3 — 640px WebP, ~100-200 KB each
      url: buildVariantUrl(fileName, "thumb"),
      // Lightbox — 1400px WebP, ~300-600 KB each
      previewUrl: buildVariantUrl(fileName, "lightbox"),
      srcSet: [
        `${buildVariantUrl(fileName, "thumb")} 640w`,
        `${buildVariantUrl(fileName, "lightbox")} 1400w`
      ].join(", "),
      sizes: gallerySizes
    }));
}
