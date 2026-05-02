import { Link } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';
import ChatExchange from './ChatExchange';

export default function Hero() {
  const ref1 = useReveal();
  const ref2 = useReveal();
  const ref3 = useReveal();
  const ref4 = useReveal();

  return (
    <section className="min-h-screen flex items-center pt-[100px] pb-20 px-6 lg:px-10">
      <div className="max-w-[1100px] mx-auto w-full flex flex-col lg:flex-row items-start gap-14 lg:gap-16">

        {/* Left column */}
        <div className="flex-none lg:w-[480px] space-y-7 lg:sticky lg:top-[100px] self-start">
          <div ref={ref1} className="reveal">
            <span className="font-mono text-amber text-xs uppercase tracking-widest">
              ✦ A-Level General Paper
            </span>
          </div>

          <h1
            ref={ref2}
            className="reveal reveal-delay-1 font-display leading-[1.08] tracking-tight"
            style={{ fontSize: 'clamp(42px, 4.5vw, 64px)' }}
          >
            GP doesn&apos;t just test<br />
            what you know.<br />
            <em className="text-amber not-italic">It tests how you think.</em>
          </h1>

          <p ref={ref3} className="reveal reveal-delay-2 font-serif italic text-lg text-textMuted leading-relaxed">
            Socra puts you in a live Socratic dialogue that forces your argument to clarify under pressure — the same pressure Cambridge examiners apply.
          </p>

          <div ref={ref4} className="reveal reveal-delay-3 flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-7 py-3 bg-amber text-background font-mono text-sm uppercase tracking-widest hover:bg-[#D4A84A] transition-colors"
            >
              Start thinking →
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center px-7 py-3 font-mono text-sm uppercase tracking-widest text-textMuted/60 hover:text-textMuted transition-colors"
            >
              See how it works ↓
            </a>
          </div>

          <div className="reveal reveal-delay-4 flex items-center gap-4 pt-2">
            <div className="flex-1 h-px bg-borderDark" />
            <span className="font-mono text-xs text-textMuted/50 whitespace-nowrap">
              Used by students across Singapore&apos;s JCs
            </span>
          </div>
        </div>

        {/* Right column — chat demo */}
        <div className="flex-1 flex justify-center lg:justify-end w-full">
          <ChatExchange />
        </div>
      </div>
    </section>
  );
}
