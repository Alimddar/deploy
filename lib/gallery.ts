import { galleryImageNames } from "./gallery-manifest";

export type GalleryImage = {
  id: string;
  name: string;
  url: string;
  previewUrl: string;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export const AWS_BASE_URL = "https://project-images-660c.s3.eu-north-1.amazonaws.com";

export function buildAwsUrl(fileName: string) {
  return `${AWS_BASE_URL}/${encodeURIComponent(fileName)}`;
}

export function buildOptimizedUrl(fileName: string, width: number, quality = 72) {
  return `/api/image?file=${encodeURIComponent(fileName)}&w=${width}&q=${quality}`;
}

export const bannerImageUrl = buildOptimizedUrl("Banner.JPG", 1800, 78);
export const profileImageUrl = buildOptimizedUrl("Profile.JPG", 320, 82);

export async function getGalleryImages(): Promise<GalleryImage[]> {
  return galleryImageNames
    .filter((fileName) => IMAGE_EXTENSIONS.has(fileName.slice(fileName.lastIndexOf(".")).toLowerCase()))
    .map((fileName) => ({
      id: fileName,
      name: fileName,
      url: buildOptimizedUrl(fileName, 760, 68),
      previewUrl: buildOptimizedUrl(fileName, 1600, 80)
    }));
}
