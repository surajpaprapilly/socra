import { useOutletContext } from 'react-router-dom';
import { TODAY_Q } from './AppShell';
import { PAST_YEAR_QUESTIONS } from '../data/pastYearQuestions';

// ── Weekly-rotating suggested questions ──────────────────────────────────────
const _allQs = PAST_YEAR_QUESTIONS.flatMap(y => y.questions.map(q => ({ q, year: y.year })));
const _weekOfYear = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (7 * 86_400_000)
);
const _startIdx = (_weekOfYear * 4) % _allQs.length;
const SUGGESTED_QS = [0, 1, 2, 3].map(i => _allQs[(_startIdx + i) % _allQs.length]);

export default function HomeView() {
  const { mode, onSelectQuestion } = useOutletContext();

  const today = new Date().toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-10 animate-in fade-in duration-400 relative z-10">

      {/* Greeting */}
      <div className="mb-8 md:mb-10">
        <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-textMuted/50 mb-3">
          {today}
        </p>
        <h1 className="font-display text-2xl md:text-4xl text-textDefault font-normal leading-tight mb-2">
          {mode === 'test' ? 'What will you write today?' : 'What will you study today?'}
        </h1>
        <p className="font-serif italic text-textMuted/80 text-base leading-relaxed max-w-lg">
          {mode === 'test'
            ? 'Pick a question from the sidebar. Build your position. Watch your blueprint form.'
            : 'Pick a question, read the conflict, then build your argument.'}
        </p>
      </div>

      {/* Today's Question — hero card */}
      <div className="mb-10">
        <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-amber/80 mb-3 flex items-center gap-2">
          <span>✦</span> Today's Question
          <span className="font-serif italic normal-case tracking-normal text-textMuted/30 text-[10px] ml-1">
            — changes daily
          </span>
        </div>
        <div
          onClick={() => onSelectQuestion(TODAY_Q)}
          className="relative bg-[#141210] border border-amber/20 p-7 cursor-pointer hover:border-amber/45 hover:bg-[#161410] transition-all group"
        >
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber opacity-60" />
          <p className="font-display text-xl text-textDefault leading-relaxed mb-4 pl-1">
            "{TODAY_Q.q}"
          </p>
          <div className="flex items-center justify-between pl-1">
            <span className="font-mono text-[9px] text-textMuted/50">
              {TODAY_Q.year} A-Level GP
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase text-amber group-hover:translate-x-1 transition-transform duration-200">
              {mode === 'test' ? 'Start forming your essay' : 'Study this'} →
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      <div>
        <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-textMuted/45 mb-3 flex items-center gap-2">
          <span>◈</span> Suggested Questions
          <span className="font-serif italic normal-case tracking-normal text-textMuted/25 text-[10px] ml-1">
            — refreshes weekly
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_QS.map((item, i) => (
            <div
              key={i}
              onClick={() => onSelectQuestion(item)}
              className="bg-[#141210] border border-borderDark p-4 cursor-pointer hover:border-amber/30 hover:-translate-y-px transition-all duration-150 group animate-in fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className="font-serif italic text-[12px] text-textDefault/80 leading-snug mb-3">
                "{item.q}"
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-wider text-textMuted/40">
                  {item.year} A-Level GP
                </span>
                <span className="font-mono text-[9px] text-textMuted/30 group-hover:text-amber group-hover:translate-x-0.5 transition-all duration-150">
                  →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
