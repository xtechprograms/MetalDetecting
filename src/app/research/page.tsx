import { ResearchPanel } from "@/components/research/ResearchPanel";

export const metadata = {
  title: "Area Research",
};

export default function ResearchPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="section-heading mb-2">Area Research</h1>
        <p className="text-slate-400 max-w-2xl">
          Research the history of any location worldwide before you detect. Search by place name,
          zip/postal code, or GPS — find nearby history and browse old topographic maps for your
          area in miles or kilometers.
        </p>
      </div>
      <ResearchPanel />
    </div>
  );
}
