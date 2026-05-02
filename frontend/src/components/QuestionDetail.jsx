import { useState } from 'react';
import { PAST_YEAR_QUESTIONS } from '../data/pastYearQuestions';

// ── Related questions (same year, different question) ─────────────────────────
function getRelatedQuestions(item) {
  if (item.custom) return [];
  const yearData = PAST_YEAR_QUESTIONS.find(y => y.year === item.year);
  if (!yearData) return [];
  return yearData.questions.filter(q => q !== item.q).slice(0, 3);
}

// ── QuestionDetail ────────────────────────────────────────────────────────────
// Replaces ModeChoice. Renders inline inside AppShell when a question is
// selected from the sidebar. No separate route needed.
export default function QuestionDetail({
  item,
  mode,
  onBack,
  onStartTest,
  onStartLearn,
  onSelectRelated,
}) {
  const [starting, setStarting] = useState(false);
  const [startingMode, setStartingMode] = useState(null);
  const isCustom = !!item.custom;
  const related = getRelatedQuestions(item);

  const handleStartTest = () => {
    setStarting(true);
    setStartingMode('test');
    // Short delay so the button state is visible before navigation
    setTimeout(() => onStartTest(item.q), 800);
  };

  const handleStartLearn = () => {
    setStarting(true);
    setStartingMode('learn');
    setTimeout(() => onStartLearn(item.q), 800);
  };

  const steps =
    mode === 'test'
      ? [
          { num: '01', label: 'Stake your thesis', desc: 'Commit to a position. No hedging allowed.' },
          { num: '02', label: 'Stress-test it', desc: '5 rounds of Socratic questioning.' },
          { num: '03', label: 'Blueprint forged', desc: 'A full essay plan built from your own thinking.' },
        ]
      : [
          { num: '01', label: 'Read both sides', desc: 'Curated perspectives on the core conflict.' },
          { num: '02', label: 'Build understanding', desc: 'Key terms, examples, and analytical links.' },
          { num: '03', label: 'Save to bank', desc: 'Your notes ready for when you switch to Test mode.' },
        ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-10 animate-in slide-in-from-left-2 duration-300 relative z-10">

      {/* Back button */}
      <button
        onClick={onBack}
        className="font-mono text-[10px] tracking-widest uppercase text-textMuted/40 hover:text-textMuted mb-7 flex items-center gap-1.5 transition-colors"
      >
        ← Back
      </button>

      {/* Question header */}
      <div className="mb-9">
        <div className="flex items-center gap-3 mb-5">
          {isCustom ? (
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-amber border border-amber/25 bg-amber/5 px-3 py-1">
              ✎ Your Question
            </span>
          ) : (
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-textMuted/50 border border-borderDark px-3 py-1">
              {item.year} A-Level GP
            </span>
          )}
        </div>
        <h2 className="font-display text-xl md:text-2xl text-textDefault font-normal leading-relaxed border-l-[3px] border-amber pl-5 max-w-3xl">
          "{item.q}"
        </h2>
      </div>

      {/* Primary / secondary CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        {/* Primary: whichever mode is active */}
        <button
          onClick={mode === 'test' ? handleStartTest : handleStartLearn}
          disabled={starting}
          className="px-8 py-3.5 bg-amber text-background font-mono text-[11px] tracking-widest uppercase font-medium hover:bg-amber/90 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {starting && startingMode === mode ? (
            <>
              <span className="animate-pulse">◆</span> Initialising…
            </>
          ) : mode === 'test' ? (
            <>◆ Start forming your essay →</>
          ) : (
            <>◈ Study this question →</>
          )}
        </button>

        {/* Secondary: switch mode */}
        <button
          onClick={mode === 'test' ? handleStartLearn : handleStartTest}
          disabled={starting}
          className="px-6 py-3.5 bg-transparent border border-borderDark text-textMuted/70 font-mono text-[11px] tracking-widest uppercase hover:border-amber/50 hover:text-textDefault transition-all disabled:opacity-40"
        >
          {starting && startingMode !== mode ? (
            <span className="animate-pulse">…</span>
          ) : mode === 'test' ? (
            <>◈ Study first</>
          ) : (
            <>◆ Test mode</>
          )}
        </button>
      </div>

      {/* What to expect — 3 steps */}
      <div className="mb-10">
        <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-textMuted/40 mb-4">
          What to expect
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {steps.map((s, i) => (
            <div
              key={i}
              className="bg-[#141210] border border-borderDark p-4 animate-in fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="font-mono text-[9px] text-amber/40 tracking-wider mb-2">{s.num}</div>
              <div className="font-mono text-[10px] text-textDefault tracking-wide mb-1.5">{s.label}</div>
              <div className="font-serif italic text-[11px] text-textMuted/65 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Related questions (same year) */}
      {related.length > 0 && (
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-textMuted/40 mb-3">
            Same paper — {item.year}
          </p>
          <div className="flex flex-col gap-2">
            {related.map((q, i) => (
              <button
                key={i}
                onClick={() => onSelectRelated?.({ q, year: item.year })}
                className="w-full text-left border border-borderDark px-4 py-3 hover:border-amber/30 hover:bg-white/[0.01] transition-all flex items-center justify-between gap-4"
              >
                <span className="font-serif italic text-[12px] text-textMuted/75 leading-relaxed">
                  {q}
                </span>
                <span className="font-mono text-[9px] text-textMuted/30 flex-shrink-0">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
