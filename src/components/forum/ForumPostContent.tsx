type Props = {
  content: string;
  imageUrls?: string[] | null;
};

export function ForumPostContent({ content, imageUrls }: Props) {
  const images = imageUrls?.filter(Boolean) ?? [];
  const displayContent =
    content === "(image post)" || content === "(image reply)" ? "" : content;

  return (
    <div className="space-y-4">
      {displayContent.trim() && (
        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap prose-content">
          {displayContent}
        </p>
      )}
      {images.length > 0 && (
        <div
          className={`grid gap-2 ${
            images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt="Forum attachment"
              className="rounded-xl border border-slate-700/50 w-full max-h-96 object-contain bg-slate-900/50"
            />
          ))}
        </div>
      )}
    </div>
  );
}
