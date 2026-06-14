import { ResearchPanel } from "@/components/research/ResearchPanel";

export const metadata = {
  title: "Area Research",
};

export default function ResearchPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="section-heading mb-2">Area Research</h1>
        <p className="text-slate-400 max-w-2xl">
          Research the history of any location worldwide before you detect.
          Get historical context, detecting tips, and legal guidance.
        </p>
      </div>
      <ResearchPanel />
    </div>
  );
}
