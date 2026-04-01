import { galleryImageNames } from "./gallery-manifest";

export type GalleryImage = {
  id: string;
  name: string;
  url: string;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export const AWS_BASE_URL = "https://project-images-660c.s3.eu-north-1.amazonaws.com";

export function buildAwsUrl(fileName: string) {
  return `${AWS_BASE_URL}/${encodeURIComponent(fileName)}`;
}

export const bannerImageUrl = buildAwsUrl("Banner.JPG");
export const profileImageUrl = buildAwsUrl("Profile.JPG");

export async function getGalleryImages(): Promise<GalleryImage[]> {
  return galleryImageNames
    .filter((fileName) => IMAGE_EXTENSIONS.has(fileName.slice(fileName.lastIndexOf(".")).toLowerCase()))
    .map((fileName) => ({
      id: fileName,
      name: fileName,
      url: buildAwsUrl(fileName)
    }));
}
