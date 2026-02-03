export function EligibilityGauge({ score, verdict = '—' }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  let fill = '#FF6B6B';
  if (pct >= 80) fill = '#95E1A3';
  else if (pct >= 50) fill = '#FFE66D';

  return (
    <div className="card-nb inline-block p-4">
      <div className="text-sm font-bold uppercase text-black/70">ML suitability score</div>
      <div className="text-xs text-black/60 mt-0.5">AI-powered eligibility (0–100)</div>
      <div className="flex items-center gap-4 mt-2">
        <div className="w-32 h-6 border-[3px] border-black overflow-hidden bg-gray-200">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: fill,
              minWidth: pct > 0 ? '6px' : 0,
            }}
          />
        </div>
        <div className="text-2xl font-bold">{pct}%</div>
      </div>
      <div className="mt-2 font-semibold border-2 border-black inline-block px-2 py-0.5 bg-white">
        {verdict}
      </div>
    </div>
  );
}
