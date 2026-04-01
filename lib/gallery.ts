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

export function buildOptimizedUrl(fileName: string, width: number, quality = 72) {
  return `/api/image?file=${encodeURIComponent(fileName)}&w=${width}&q=${quality}`;
}

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
      url: buildOptimizedUrl(fileName, 560, 60),
      previewUrl: buildOptimizedUrl(fileName, 1600, 80),
      srcSet: [
        `${buildOptimizedUrl(fileName, 360, 56)} 360w`,
        `${buildOptimizedUrl(fileName, 560, 60)} 560w`,
        `${buildOptimizedUrl(fileName, 860, 66)} 860w`
      ].join(", "),
      sizes: gallerySizes
    }));
}
