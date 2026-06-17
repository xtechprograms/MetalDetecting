"use client";

import { useState } from "react";
import type { CommunityPostMedia as PostMedia } from "./types";
import { MediaLightbox } from "./MediaLightbox";

type CommunityPostMediaProps = {
  media: PostMedia[];
};

function gridClass(count: number, index: number): string {
  if (count === 1) {
    return "relative w-full aspect-[4/3] sm:aspect-video max-h-[min(70dvh,28rem)]";
  }
  if (count === 2) {
    return "relative aspect-square min-h-0";
  }
  if (count === 3) {
    return index === 0
      ? "relative row-span-2 min-h-[9rem] sm:min-h-[11rem]"
      : "relative aspect-square min-h-0";
  }
  return "relative aspect-square min-h-0";
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
    <div className="mt-3 w-full min-w-0 overflow-hidden">
      {images.length > 0 && (
        <div
          className={`grid gap-1 rounded-xl overflow-hidden w-full ${
            visibleImages.length === 1
              ? "grid-cols-1"
              : visibleImages.length === 2
                ? "grid-cols-2"
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
                className={`overflow-hidden bg-slate-800 touch-manipulation ${gridClass(
                  visibleImages.length,
                  index
                )}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.media_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isLastWithOverlay && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl sm:text-2xl font-semibold text-white">
                    +{extraCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-3 space-y-2 w-full min-w-0">
          {videos.map((item) => (
            <video
              key={item.id}
              src={item.media_url}
              controls
              playsInline
              preload="metadata"
              className="w-full max-w-full max-h-[min(70dvh,28rem)] rounded-xl bg-black object-contain"
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
    </div>
  );
}
