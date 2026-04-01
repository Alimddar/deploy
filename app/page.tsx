import { GalleryClient } from "../components/gallery-client";
import { bannerImageUrl, getGalleryImages, profileImageUrl } from "../lib/gallery";

export default async function HomePage() {
  const images = await getGalleryImages();

  return <GalleryClient bannerImage={bannerImageUrl} images={images} profileImage={profileImageUrl} />;
}
