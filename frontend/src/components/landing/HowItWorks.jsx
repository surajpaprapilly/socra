import { useReveal } from '../../hooks/useReveal';

const STEPS = [
  {
    num: '01',
    label: 'Interrogate. Don\'t just answer.',
    desc: 'Socra won\'t let you start until you\'ve examined what the question is actually asking — loaded terms, hidden assumptions, command word.',
    visual: (
      <div className="bg-[#11100D] border border-borderDark p-5 space-y-3">
        <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Question</div>
        <div className="font-serif italic text-sm text-textDefault/80 leading-snug">
          &ldquo;Learning facts is no longer necessary because information can be instantly accessed online.&rdquo;
        </div>
        <div className="border-t border-borderDark pt-3 space-y-2">
          <div className="text-[10px] font-mono text-amber/70 uppercase tracking-widest">Working thesis</div>
          <div className="font-serif text-sm text-textDefault leading-relaxed">
            Access to information is not the same as the ability to use it — facts provide the scaffolding that makes analysis possible.
            <span className="inline-block w-[2px] h-[1em] bg-amber ml-[2px] align-text-bottom animate-blink" />
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '02',
    label: 'The struggle is the lesson.',
    desc: 'Reaching for words under pressure is how ideas embed — not in revision notes.',
    visual: (
      <div className="bg-[#11100D] border border-borderDark p-5 space-y-4">
        {/* Retention diagram */}
        <div className="space-y-2.5">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] text-textMuted/50 uppercase tracking-widest">Re-reading notes</span>
              <span className="font-mono text-[10px] text-textMuted/40">~20% retained</span>
            </div>
            <div className="h-1.5 bg-borderDark rounded-sm w-full overflow-hidden">
              <div className="h-full bg-textMuted/25 rounded-sm w-[20%]" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] text-amber/70 uppercase tracking-widest">Challenged to recall</span>
              <span className="font-mono text-[10px] text-amber/60">~65% retained</span>
            </div>
            <div className="h-1.5 bg-borderDark rounded-sm w-full overflow-hidden">
              <div className="h-full bg-amber/70 rounded-sm w-[65%]" />
            </div>
          </div>
          <p className="font-mono text-[9px] text-textMuted/30">Roediger &amp; Karpicke, 2006 — testing effect on long-term retention</p>
        </div>
        {/* Single exchange */}
        <div className="border-t border-borderDark pt-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-amber text-xs flex-shrink-0 mt-0.5">◆</span>
            <p className="font-serif italic text-xs text-textDefault/80 leading-relaxed">
              Your thesis says facts enable &ldquo;judgment.&rdquo; But couldn&apos;t someone build judgment just by practising analysis?
            </p>
          </div>
          <div className="flex justify-end">
            <div className="font-mono text-xs text-textMuted border border-borderDark/50 bg-background/50 px-3 py-2 max-w-[82%]">
              You need base knowledge to know what to analyse in the first place
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '03',
    label: 'Leave with an essay plan.',
    desc: 'Every claim you defend becomes your Blueprint — thesis, topic sentences, counter-argument, conclusion. Your argument, structured.',
    visual: (
      <div className="bg-[#11100D] border border-borderDark p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Blueprint</div>
          <div className="text-[10px] font-mono text-amber/50">↓ Export as PDF</div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-mono text-amber/70 uppercase tracking-widest mb-1">Thesis — locked</div>
            <div className="font-serif text-sm text-textDefault/90 leading-relaxed">
              Access to information is not the same as understanding it — without foundational knowledge, one cannot evaluate, contextualise, or even know what to search for.
            </div>
          </div>
          <div className="border-t border-borderDark pt-2 space-y-1.5">
            <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Topic sentences</div>
            {['Filter bubbles distort civic reasoning without factual grounding…', 'Factual knowledge provides schema through which new information is interpreted…'].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 flex-shrink-0" />
                <span className="font-mono text-xs text-textMuted leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-borderDark pt-2">
            <div className="text-[10px] font-mono text-textMuted/30 uppercase tracking-widest mb-1">Counter-argument</div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-borderDark mt-1.5 flex-shrink-0" />
              <span className="font-mono text-xs text-textMuted/30">In progress…</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '04',
    label: 'A thinking partner, not a yes-machine.',
    desc: 'Plato reviews every session, tracks which moves you\'ve mastered, and shapes the next one around your gaps. It knows your patterns — and doesn\'t let you slide.',
    visual: (
      <div className="bg-[#11100D] border border-borderDark p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Plato — session 4</div>
          <div className="flex gap-2">
            {[{ n: 1, done: true }, { n: 2, done: true }, { n: 3, done: false }, { n: 4, done: true }, { n: 5, done: false }].map(({ n, done }) => (
              <div key={n} className="flex flex-col items-center gap-0.5">
                <span className={`font-mono text-xs ${done ? 'text-amber' : 'text-textMuted/25'}`}>{done ? '✓' : '○'}</span>
                <span className="font-mono text-[9px] text-textMuted/30">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 border-t border-borderDark pt-3">
          <div>
            <div className="text-[10px] font-mono text-textMuted/40 uppercase tracking-widest mb-1">Pattern</div>
            <p className="font-serif italic text-xs text-textMuted leading-snug">Counter-argument conceded too quickly — genuine pushback needed.</p>
          </div>
          <div>
            <div className="text-[10px] font-mono text-amber/60 uppercase tracking-widest mb-1">Next session</div>
            <p className="font-serif italic text-xs text-textDefault/80 leading-snug">Find the CA&apos;s weakest assumption before you concede any ground.</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const headRef = useReveal();
  const calloutRef = useReveal();

  return (
    <section id="how" className="py-20 px-6 lg:px-10">
      <div className="max-w-[1100px] mx-auto">
        <div ref={headRef} className="reveal mb-10">
          <h2 className="font-display text-[clamp(28px,3vw,40px)]">How it works.</h2>
        </div>

        {/* ChatGPT vs Socra */}
        <div ref={calloutRef} className="reveal mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 border border-borderDark overflow-hidden">
            <div className="bg-[#11100D] p-5 border-b md:border-b-0 md:border-r border-borderDark space-y-2">
              <div className="text-[10px] font-mono text-textMuted/40 uppercase tracking-widest">ChatGPT</div>
              <p className="font-serif italic text-textMuted text-sm">Ask → get an answer → feel prepared.</p>
            </div>
            <div className="bg-[#11100D] p-5 space-y-2">
              <div className="text-[10px] font-mono text-amber/70 uppercase tracking-widest">Socra</div>
              <p className="font-serif italic text-textDefault/90 text-sm">Claim → get challenged → actually be prepared.</p>
            </div>
          </div>
        </div>

        {STEPS.map(({ num, label, desc, visual }, i) => (
          <StepRow
            key={num}
            num={num}
            label={label}
            desc={desc}
            visual={visual}
            textLeft={i % 2 === 0}
          />
        ))}
      </div>
    </section>
  );
}

function StepRow({ num, label, desc, visual, textLeft }) {
  const ref = useReveal();

  const textCol = (
    <div className="space-y-3 flex flex-col justify-center">
      <div className="font-display text-[48px] text-amber/15 font-bold leading-none">{num}</div>
      <h3 className="font-display text-[clamp(22px,2.2vw,28px)] leading-tight">{label}</h3>
      <p className="font-serif italic text-textMuted leading-relaxed">{desc}</p>
    </div>
  );

  const visualCol = <div className="flex items-center">{visual}</div>;

  return (
    <div ref={ref} className="reveal grid grid-cols-1 md:grid-cols-2 gap-[60px] border-t border-borderDark py-14">
      {textLeft ? <>{textCol}{visualCol}</> : <>{visualCol}{textCol}</>}
    </div>
  );
}
