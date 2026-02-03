export function XAIReasons({ reasons = [] }) {
  if (!reasons.length) return null;
  return (
    <div className="card-nb mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold uppercase text-black/70">Explainable AI (XAI)</span>
        <span className="text-xs border border-black px-1.5 py-0.5 bg-[#C9B1FF] font-medium">why this match</span>
      </div>
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {reasons.map((r, i) => (
          <li
            key={i}
            className="border-2 border-black px-2 py-1 bg-[#C9B1FF] font-medium text-sm"
          >
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
