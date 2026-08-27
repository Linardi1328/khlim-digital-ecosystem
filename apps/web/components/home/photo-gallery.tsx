"use client";

import React from "react";

export interface PhotoStoryItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  photoLabel: string;
  imageUrl?: string;
  placeholderGradient: string;
}

export interface PhotoGalleryItem {
  id: string;
  photoLabel: string;
  imageUrl?: string;
  placeholderGradient: string;
}

export function PhotoStorySection({ item }: { item: PhotoStoryItem }) {
  const backgroundImage = item.imageUrl
    ? `linear-gradient(90deg, rgba(9, 9, 11, 0.76), rgba(9, 9, 11, 0.24)), url("${item.imageUrl}")`
    : `linear-gradient(90deg, rgba(9, 9, 11, 0.78), rgba(9, 9, 11, 0.3)), ${item.placeholderGradient}`;

  return (
    <section className="home-photo-story" style={{ backgroundImage }}>
      {!item.imageUrl && (
        <div className="home-photo-placeholder-label home-photo-story-placeholder">
          Photo slot · {item.photoLabel}
        </div>
      )}
      <div className="home-photo-story-content">
        <span>{item.eyebrow}</span>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
    </section>
  );
}

export function PhotoGallery({ items }: { items: PhotoGalleryItem[] }) {
  return (
    <section className="home-gallery-section" aria-labelledby="home-gallery-title">
      <div className="home-gallery-heading">
        <span>Gallery</span>
        <h2 id="home-gallery-title">Inside KHLIM</h2>
        <p>
          Approved academy photography can be dropped into these slots without changing
          the page structure.
        </p>
      </div>
      <div className="home-gallery-grid">
        {items.map((item, index) => {
          const backgroundImage = item.imageUrl
            ? `linear-gradient(180deg, rgba(9, 9, 11, 0.08), rgba(9, 9, 11, 0.3)), url("${item.imageUrl}")`
            : `linear-gradient(180deg, rgba(9, 9, 11, 0.04), rgba(9, 9, 11, 0.28)), ${item.placeholderGradient}`;
          return (
            <div
              key={item.id}
              className={`home-gallery-tile home-gallery-tile-${(index % 6) + 1}`}
              style={{ backgroundImage }}
              role="img"
              aria-label={item.imageUrl ? item.photoLabel : `Future photo slot: ${item.photoLabel}`}
            >
              {!item.imageUrl && (
                <div className="home-gallery-placeholder">Photo slot · {item.photoLabel}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
