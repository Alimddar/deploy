"use client";

import { useEffect, useRef, useState } from "react";
import type { GalleryImage } from "../lib/gallery";

type GalleryClientProps = {
  bannerImage: string;
  images: GalleryImage[];
  profileImage: string;
};

export function GalleryClient({ bannerImage, images, profileImage }: GalleryClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [renderedCount, setRenderedCount] = useState(24);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const heroImage = bannerImage || images[0]?.url || "";

  useEffect(() => {
    setRenderedCount(24);
  }, [images.length]);

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

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || renderedCount >= images.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          setRenderedCount((current) => Math.min(current + 18, images.length));
        }
      },
      {
        rootMargin: "1200px 0px"
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [images.length, renderedCount]);

  function handleDownload(image: GalleryImage) {
    const anchor = document.createElement("a");
    anchor.href = `/api/download?file=${encodeURIComponent(image.name)}`;
    anchor.download = image.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const currentImage = lightboxIndex === null ? null : images[lightboxIndex];
  const visibleImages = images.slice(0, renderedCount);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        {heroImage ? (
          <img
            className="hero-bg loaded"
            src={heroImage}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            loading="eager"
            decoding="async"
          />
        ) : null}
        <div className="hero-bg-overlay" />
        <div className="hero-vignette" />

        <div className="hero-copy">
          {profileImage ? (
            <div className="hero-profile">
              <img src={profileImage} alt="Profile" loading="eager" decoding="async" />
            </div>
          ) : null}
          <span className="hero-date">18.03.2026</span>
          <h1>Sakina&apos;s Party</h1>
        </div>
      </section>

      <section className="gallery-shell">
        <div className="gallery-wrapper">
          <div className="gallery">
            {visibleImages.map((image, index) => (
              <article
                key={image.id}
                className="gallery-item visible"
                style={{ animationDelay: `${Math.min(index * 22, 700)}ms` }}
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={image.url}
                  srcSet={image.srcSet}
                  sizes={image.sizes}
                  alt={image.name}
                  loading="lazy"
                  decoding="async"
                />
                <div className="overlay">
                  <div className="card-actions">
                    <button
                      className="card-icon"
                      type="button"
                      aria-label={`${image.name} yüklə`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDownload(image);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {renderedCount < images.length ? <div ref={loadMoreRef} className="gallery-sentinel" /> : null}

          {images.length === 0 ? <div className="empty-state">Hələ şəkil yüklənməyib.</div> : null}
        </div>
      </section>

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

        {currentImage ? <img src={currentImage.previewUrl} alt={currentImage.name} decoding="async" /> : null}
      </div>
    </main>
  );
}
