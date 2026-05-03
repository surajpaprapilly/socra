import { useReveal } from '../../hooks/useReveal';

const CARDS = [
  {
    pain: "I can't really study for GP.",
    detail: "You can. You need to practise forming arguments under pressure — not memorising them.",
  },
  {
    pain: "I have the examples. I just don't know how to use them.",
    detail: "An example only earns marks when it's chained to a claim. That chain is a skill. It can be built.",
  },
  {
    pain: "I read everything but I somehow seem to be not answering the question (ATQ).",
    detail: "GP punishes drift. Your argument can start on-question and wander off by paragraph two — most students only find out when the paper comes back.",
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
            Common student{' '}
            <em className="text-amber">pain points</em>.
          </h2>
        </div>

        <div ref={gridRef} className="reveal grid grid-cols-1 md:grid-cols-3 gap-px bg-borderDark">
          {CARDS.map(({ pain, detail }) => (
            <div key={pain} className="bg-background p-10 space-y-5">
              <p className="font-serif italic text-textDefault text-lg leading-relaxed">
                &ldquo;{pain}&rdquo;
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
