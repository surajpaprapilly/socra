import { useReveal } from '../../hooks/useReveal';

const CARDS = [
  {
    pain: "You make a point. You explain it. You move on.",
    verdict: "assertive, not analytical",
    detail: "Cambridge markers call this the describe-explain trap. You're telling them what happened — not why it matters, or how it connects to the question's actual tension.",
  },
  {
    pain: "Your conclusion restates what you said in the introduction.",
    verdict: "a summary, not a verdict",
    detail: "A Band 4 conclusion doesn't repeat — it arrives somewhere new. It weighs, qualifies, and commits to a position that couldn't have been written before the argument was made.",
  },
  {
    pain: "You know your examples. But you can't connect them to the question.",
    verdict: "description, not analysis",
    detail: "The example is the evidence. The analytical link is the argument. Cambridge examiners aren't marking your knowledge — they're marking what you do with it.",
  },
];

export default function PainSection() {
  const headRef = useReveal();
  const gridRef = useReveal();

  return (
    <section className="py-20 px-6 lg:px-10">
      <div className="max-w-[1100px] mx-auto space-y-12">
        <div ref={headRef} className="reveal max-w-[640px]">
          <h2 className="font-display text-[clamp(28px,3vw,40px)] leading-tight">
            Notes give you points. Cambridge is examining your ability to{' '}
            <em className="text-amber">reason</em>.
          </h2>
        </div>

        <div ref={gridRef} className="reveal grid grid-cols-1 md:grid-cols-3 gap-px bg-borderDark">
          {CARDS.map(({ pain, verdict, detail }) => (
            <div key={verdict} className="bg-background p-10 space-y-5">
              <p className="font-serif italic text-textDefault text-lg leading-relaxed">
                &ldquo;{pain}&rdquo;
              </p>
              <p className="font-mono text-xs text-amber uppercase tracking-widest">
                Cambridge calls this: {verdict}
              </p>
              <p className="font-serif text-sm text-textMuted leading-relaxed border-t border-borderDark pt-5">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
