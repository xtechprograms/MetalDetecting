"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type MediaLightboxProps = {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function MediaLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: MediaLightboxProps) {
  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasNext, hasPrev, index, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-700 z-10"
        aria-label="Close photo preview"
      >
        <X className="w-5 h-5" />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index - 1);
          }}
          className="absolute left-3 sm:left-6 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-700 z-10"
          aria-label="Previous photo"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index + 1);
          }}
          className="absolute right-3 sm:right-6 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-700 z-10"
          aria-label="Next photo"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={`Photo ${index + 1} of ${images.length}`}
        className="max-w-full max-h-[calc(100dvh-2rem)] object-contain rounded-lg"
        onClick={(event) => event.stopPropagation()}
      />

      {images.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-slate-300 bg-slate-900/70 px-3 py-1 rounded-full">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}
