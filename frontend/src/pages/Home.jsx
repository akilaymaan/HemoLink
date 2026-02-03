import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <h1 className="text-4xl md:text-6xl font-bold border-4 border-black inline-block px-6 py-3 bg-[#4ECDC4] shadow-[6px_6px_0_0_#000] mb-4">
        HemoLink
      </h1>
      <p className="text-xl font-medium mb-4">
        Connect with blood donors nearby. <strong>ML-powered</strong> matching, <strong>NLP</strong> health analysis, and <strong>Explainable AI (XAI)</strong> reasons.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-6 text-sm">
        <span className="border-2 border-black px-3 py-1 bg-[#FFE66D] font-semibold">ML</span>
        <span className="border-2 border-black px-3 py-1 bg-[#C9B1FF] font-semibold">NLP</span>
        <span className="border-2 border-black px-3 py-1 bg-[#95E1A3] font-semibold">XAI</span>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/request"
          className="font-bold text-lg border-4 border-black px-6 py-3 bg-[#FF6B6B] text-white no-underline shadow-[5px_5px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
        >
          I need blood – SOS
        </Link>
        <Link
          to="/donor"
          className="font-bold text-lg border-4 border-black px-6 py-3 bg-[#95E1A3] text-black no-underline shadow-[5px_5px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5"
        >
          I want to donate
        </Link>
      </div>
      <p className="mt-8 text-sm text-black/70">
        Donors are ranked by an <strong>AI/ML suitability score</strong>. Health summaries are analyzed with <strong>NLP</strong>; each match comes with <strong>Explainable AI</strong> reasons.
      </p>
    </div>
  );
}
