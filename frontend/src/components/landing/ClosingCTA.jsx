import { Link } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';

export default function ClosingCTA() {
  const ref = useReveal();

  return (
    <section className="py-24 px-6 lg:px-10 border-t border-borderDark">
      <div ref={ref} className="reveal max-w-[700px] mx-auto text-center space-y-8">
        <h2 className="font-display text-[clamp(32px,3.5vw,52px)] leading-tight">
          Stop practising answers.<br />
          Start practising <em className="text-amber">thinking</em>.
        </h2>
        <p className="font-serif italic text-lg text-textMuted">
          Most students finish their first session in under 45 minutes. Save your session and come back to it anytime.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-amber text-background font-mono text-sm uppercase tracking-widest hover:bg-[#D4A84A] transition-colors"
          >
            Start for free →
          </Link>
          
        </div>

        <div className="inline-flex items-center gap-6 border border-borderDark px-6 py-4 font-mono text-xs text-textMuted/60">
          <div className="text-center">
            <div className="text-textDefault font-semibold text-sm">Question analysis and Argument Formation becomes ingrained</div>
            <div className="uppercase tracking-widest mt-0.5">Habit Formation</div>
          </div>
          <div className="w-px h-8 bg-borderDark" />
          <div className="text-center">
            <div className="text-textDefault font-semibold text-sm">~30-45 min</div>
            <div className="uppercase tracking-widest mt-0.5">Per session</div>
          </div>
          <div className="w-px h-8 bg-borderDark" />
          <div className="text-center">
            <div className="text-textDefault font-semibold text-sm">5 phases</div>
            <div className="uppercase tracking-widest mt-0.5">Socratic method</div>
          </div>
        </div>
      </div>
    </section>
  );
}
