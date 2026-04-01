"use client";

import { useEffect, useState } from "react";
import type { GalleryImage } from "../lib/gallery";

type GalleryClientProps = {
  bannerImage: string;
  images: GalleryImage[];
  profileImage: string;
};

export function GalleryClient({
  bannerImage,
  images,
  profileImage
}: GalleryClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showShadowStrip, setShowShadowStrip] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowShadowStrip(window.scrollY > 80);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
      }

      if (event.key === "ArrowRight") {
        setLightboxIndex((current) => {
          if (current === null) return current;
          return Math.min(current + 1, images.length - 1);
        });
      }

      if (event.key === "ArrowLeft") {
        setLightboxIndex((current) => {
          if (current === null) return current;
          return Math.max(current - 1, 0);
        });
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images.length, lightboxIndex]);

  function handleDownload(image: GalleryImage) {
    const anchor = document.createElement("a");
    anchor.href = `/api/download?file=${encodeURIComponent(image.name)}`;
    anchor.download = image.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const currentImage = lightboxIndex === null ? null : images[lightboxIndex];

  return (
    <>
      <div className={`shadow-strip${showShadowStrip ? " show" : ""}`} />

      <section className="hero has-bg">
        <img className="hero-bg loaded" src={bannerImage} alt="" aria-hidden="true" />
        <div className="hero-bg-overlay" />

        <div className="profile-ring">
          <img className="profile-img" src={profileImage} alt="Profil" />
        </div>

        <h1>Sakina&apos;s party</h1>
        <p className="subtitle">Xatirələr &amp; Anılar</p>

        <div className="divider">
          <div className="divider-line" />
          <span className="divider-ornament">✦</span>
          <div className="divider-line" />
        </div>
      </section>

      <div className="gallery-wrapper">
        <div className="gallery">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="gallery-item visible"
              style={{ animationDelay: `${Math.min(index * 30, 800)}ms` }}
              onClick={() => setLightboxIndex(index)}
            >
              <img src={image.url} alt={image.name} loading="lazy" />
              <div className="overlay">
                <div className="card-actions">
                  <button
                    className="download-btn"
                    type="button"
                    aria-label={`${image.name} yüklə`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDownload(image);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {images.length === 0 ? <div className="empty-state">Hələ şəkil yüklənməyib.</div> : null}
      </div>

      <footer>Made with love · Sakina&apos;s Party 2026</footer>

      <div
        className={`lightbox${currentImage ? " active" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setLightboxIndex(null);
          }
        }}
      >
        <button className="lightbox-close" type="button" onClick={() => setLightboxIndex(null)}>
          ✕
        </button>
        <button
          className="lightbox-nav prev"
          type="button"
          onClick={() => setLightboxIndex((current) => (current === null ? current : Math.max(current - 1, 0)))}
        >
          &#8249;
        </button>
        <button
          className="lightbox-nav next"
          type="button"
          onClick={() =>
            setLightboxIndex((current) =>
              current === null ? current : Math.min(current + 1, images.length - 1)
            )
          }
        >
          &#8250;
        </button>

        {currentImage ? <img src={currentImage.url} alt={currentImage.name} /> : null}
      </div>
    </>
  );
}
