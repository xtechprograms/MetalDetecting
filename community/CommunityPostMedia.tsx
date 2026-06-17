"use client";

import { useState } from "react";
import type { CommunityPost, CommunityPostMedia as PostMedia } from "./types";
import { MediaLightbox } from "./MediaLightbox";

type CommunityPostMediaProps = {
  media: PostMedia[];
};

function gridClass(count: number, index: number): string {
  if (count === 1) return "col-span-2 row-span-2 min-h-[220px]";
  if (count === 2) return "min-h-[180px]";
  if (count === 3) {
    return index === 0 ? "col-span-1 row-span-2 min-h-[220px]" : "min-h-[108px]";
  }
  return "min-h-[140px]";
}

export function CommunityPostMedia({ media }: CommunityPostMediaProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order);
  const images = sorted.filter((item) => item.media_type === "image");
  const videos = sorted.filter((item) => item.media_type === "video");
  const imageUrls = images.map((item) => item.media_url);
  const visibleImages = images.slice(0, 4);
  const extraCount = Math.max(images.length - 4, 0);

  return (
    <>
      {images.length > 0 && (
        <div
          className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${
            visibleImages.length === 1
              ? "grid-cols-1"
              : visibleImages.length === 2
                ? "grid-cols-2"
                : visibleImages.length === 3
                  ? "grid-cols-2 grid-rows-2"
                  : "grid-cols-2 grid-rows-2"
          }`}
        >
          {visibleImages.map((item, index) => {
            const isLastWithOverlay = extraCount > 0 && index === 3;
            const imageIndex = images.findIndex((img) => img.id === item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightboxIndex(imageIndex)}
                className={`relative overflow-hidden bg-slate-800 ${gridClass(
                  visibleImages.length,
                  index
                )}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.media_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover hover:scale-[1.02] transition-transform"
                />
                {isLastWithOverlay && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
                    +{extraCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-3 space-y-2">
          {videos.map((item) => (
            <video
              key={item.id}
              src={item.media_url}
              controls
              playsInline
              className="w-full max-h-[420px] rounded-xl bg-black"
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <MediaLightbox
          images={imageUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </>
  );
}
