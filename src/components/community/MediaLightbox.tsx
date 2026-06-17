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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasNext, hasPrev, index, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-3 sm:right-4 min-h-11 min-w-11 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-700 z-10 touch-manipulation"
        aria-label="Close photo preview"
      >
        <X className="w-5 h-5 mx-auto" />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index - 1);
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 min-h-11 min-w-11 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-700 z-10 touch-manipulation"
          aria-label="Previous photo"
        >
          <ChevronLeft className="w-6 h-6 mx-auto" />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index + 1);
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 min-h-11 min-w-11 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-700 z-10 touch-manipulation"
          aria-label="Next photo"
        >
          <ChevronRight className="w-6 h-6 mx-auto" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={`Photo ${index + 1} of ${images.length}`}
        className="max-w-full max-h-[calc(100dvh-6rem)] sm:max-h-[calc(100dvh-4rem)] object-contain rounded-lg"
        onClick={(event) => event.stopPropagation()}
      />

      {images.length > 1 && (
        <p className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-xs sm:text-sm text-slate-300 bg-slate-900/70 px-3 py-1 rounded-full">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}
