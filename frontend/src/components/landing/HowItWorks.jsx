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
        <div className="border-t border-borderDark pt-3 space-y-2.5">
          <div className="flex gap-3 items-start">
            <span className="font-mono text-[10px] text-amber/60 uppercase tracking-widest shrink-0 w-[90px] pt-0.5">Command</span>
            <span className="font-serif text-xs text-textDefault/75 leading-relaxed">&ldquo;no longer necessary&rdquo; — evaluative claim. Requires weighing, not just comparing.</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="font-mono text-[10px] text-purple-400/60 uppercase tracking-widest shrink-0 w-[90px] pt-0.5">Loaded term</span>
            <span className="font-serif text-xs text-textDefault/75 leading-relaxed">&ldquo;facts&rdquo; — rote data, or structured knowledge? The answer shifts the whole argument.</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="font-mono text-[10px] text-textMuted/40 uppercase tracking-widest shrink-0 w-[90px] pt-0.5">Assumption</span>
            <span className="font-serif text-xs text-textDefault/75 leading-relaxed">That access = understanding.</span>
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
      <div className="bg-[#11100D] border border-borderDark overflow-hidden relative w-full">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-borderDark/40 flex items-center justify-between">
          <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Blueprint</div>
          <div className="text-[10px] font-mono text-amber/40">↓ Export as PDF</div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Thesis */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Thesis</div>
            <div className="p-3 border border-amber/30 bg-amber/5">
              <span className="font-serif text-sm text-amber leading-relaxed">
                While the internet has made information retrieval effortless, learning facts remains essential for the judgment, contextual reasoning, and critical thinking that mere access to information cannot replace.
              </span>
            </div>
          </div>

          {/* Paragraph Skeletons */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Paragraph Skeletons</div>

            {/* Argument 1 — mostly filled */}
            <div className="border border-borderDark/40 bg-background/20 overflow-hidden">
              <div className="bg-borderDark/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-textMuted">
                Argument 1 — Factual knowledge is prerequisite to judgment, not a substitute for it
              </div>
              <div className="p-3 flex flex-col space-y-3 font-mono text-xs">
                <div className="pl-3 border-l-2 border-green-500/70">
                  <span className="text-[10px] uppercase text-green-500/70 block mb-0.5">Topic Sentence</span>
                  <span className="text-textDefault">The ability to retrieve information online does not confer the capacity to evaluate it, as that requires a foundation of existing knowledge against which new information can be tested.</span>
                </div>
                <div className="pl-3 border-l-2 border-borderDark/40">
                  <span className="text-[10px] uppercase text-textMuted/50 block mb-0.5">Point / Premise</span>
                  <span className="text-textDefault">A doctor who must look up drug interactions mid-consultation, or a judge who cannot recall basic legal precedent, demonstrates not efficiency but a dangerous gap. No search engine can close that gap in time.</span>
                </div>
                <div className="pl-3 border-l-2 border-borderDark/40">
                  <span className="text-[10px] uppercase text-textMuted/50 block mb-0.5">Explanation</span>
                  <div className="h-3 bg-borderDark/20 rounded w-4/5" />
                </div>
                <div className="pl-3 border-l-2 border-borderDark/40">
                  <span className="text-[10px] uppercase text-textMuted/50 block mb-0.5">Evidence / Example</span>
                  <div className="h-3 bg-borderDark/20 rounded w-3/4" />
                </div>
                <div className="pl-3 border-l-2 border-purple-500/70">
                  <span className="text-[10px] uppercase text-purple-500/70 block mb-0.5">Analytical Link</span>
                  <div className="h-3 bg-borderDark/20 rounded w-5/6" />
                </div>
              </div>
            </div>

            {/* Argument 2 — skeleton only */}
            <div className="border border-borderDark/40 bg-background/20 overflow-hidden">
              <div className="bg-borderDark/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-textMuted">
                Argument 2
              </div>
              <div className="p-3 flex flex-col space-y-3 font-mono text-xs">
                <div className="pl-3 border-l-2 border-borderDark/40">
                  <span className="text-[10px] uppercase text-textMuted/50 block mb-0.5">Topic Sentence</span>
                  <span className="text-textMuted/30 italic">Will be built as the argument develops…</span>
                </div>
                <div className="pl-3 border-l-2 border-borderDark/40">
                  <span className="text-[10px] uppercase text-textMuted/50 block mb-0.5">Point / Premise</span>
                  <div className="h-3 bg-borderDark/20 rounded w-1/2" />
                </div>
                <div className="pl-3 border-l-2 border-borderDark/40">
                  <span className="text-[10px] uppercase text-textMuted/50 block mb-0.5">Explanation</span>
                  <div className="h-3 bg-borderDark/20 rounded w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Counter-argument — just starting */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-textMuted/50 uppercase tracking-widest">Counter Argument</div>
            <div className="border border-borderDark/40 bg-background/20 p-3 flex flex-col space-y-3 font-mono text-xs">
              <div className="pl-3 border-l-2 border-red-500/50">
                <span className="text-[10px] uppercase text-red-500/50 block mb-0.5">Their Claim</span>
                <div className="h-3 bg-borderDark/20 rounded w-3/4" />
              </div>
              <div className="pl-3 border-l-2 border-red-400/30">
                <span className="text-[10px] uppercase text-textMuted/50 block mb-0.5">Its Merit</span>
                <span className="text-textMuted/30 italic">In progress…</span>
              </div>
            </div>
          </div>

          {/* Spacer so the fade has something to cover */}
          <div className="h-4" />
        </div>

        {/* Fade + "continues building" */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#11100D] to-transparent" />
        <div className="relative px-5 pb-4 text-center">
          <span className="font-mono text-[10px] text-textMuted/30 tracking-widest">· · · continues building as you think</span>
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
