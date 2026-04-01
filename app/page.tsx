import { preload } from "react-dom";
import { GalleryClient } from "../components/gallery-client";
import { bannerImageUrl, getGalleryImages, profileImageUrl } from "../lib/gallery";

export default async function HomePage() {
  const images = await getGalleryImages();

  if (bannerImageUrl) {
    preload(bannerImageUrl, { as: "image", fetchPriority: "high" });
  }

  if (profileImageUrl) {
    preload(profileImageUrl, { as: "image", fetchPriority: "high" });
  }

  return <GalleryClient bannerImage={bannerImageUrl} images={images} profileImage={profileImageUrl} />;
}
