import { useState, useEffect, useRef } from 'react';
import TypedText from './TypedText';

const EXCHANGE = [
  {
    role: 'ai',
    text: `What does this question actually want from you? Is it asking you to prove facts are useless, or something more ?`,
  },
  {
    role: 'student',
    text: `It wants me to say whether I agree or disagree?`,
  },
  {
    role: 'ai',
    text: `Close — but GP questions rarely want a simple yes or no. The word "evaluate" is doing real work here. What does it signal about how you should structure your thinking?`,
  },
  {
    role: 'student',
    text: `Oh... does it mean I need to look at both sides and then make a judgement?`,
  },
  {
    role: 'ai',
    text: `Exactly. So before you pick a side — what's the strongest case *for* the statement? Why might someone genuinely believe facts no longer matter?`,
  },
  {
    role: 'student',
    text: `Because you can just search anything up now? Like even doctors use Google?`,
  },
  {
    role: 'ai',
    text: `Good instinct. Now stress-test it: when a doctor is mid-surgery, or a judge is mid-trial — is "just Google it" still an option? What does that tell you about the limits of the claim?`,
  },
];

const PHASES = [
  { label: 'Question Autopsy', short: 'Question Autopsy' },
  { label: 'Thesis Formation', short: 'Thesis Formation' },
  { label: 'Argument Sketching', short: 'Argument Sketching' },
  { label: 'Topic Sentences', short: 'Topic Sentences' },
  { label: 'Deep Dives', short: 'Deep Dives' },
  { label: 'Essay Plan', short: 'Essay Plan' },
];
const CHAR_DELAY = 22;

export default function ChatExchange() {
  const [loopKey, setLoopKey] = useState(0);
  const [typingIdx, setTypingIdx] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [visibleCount, typingIdx]);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const run = async () => {
      for (let i = 0; i < EXCHANGE.length; i++) {
        if (cancelled) return;
        setTypingIdx(i);
        await sleep(EXCHANGE[i].text.length * CHAR_DELAY + 400);
        if (cancelled) return;
        setVisibleCount(i + 1);
        await sleep(i === EXCHANGE.length - 1 ? 2800 : 700);
        if (cancelled) return;
      }
      await sleep(1200);
      if (cancelled) return;
      setVisibleCount(0);
      setTypingIdx(-1);
      setLoopKey(k => k + 1);
    };

    run();
    return () => { cancelled = true; };
  }, [loopKey]);

  return (
    <div className="bg-[#11100D] border border-borderDark shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-w-[520px] w-full flex flex-col">
      {/* Chrome bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-borderDark bg-background/40">
        <span className="font-display text-xl text-amber italic">Socra</span>
        <span className="font-serif italic text-xs text-textMuted/70 max-w-[400px]">
          ‘Learning facts is no longer necessary because information can be instantly accessed online.’ Evaluate this statement.
        </span>

      </div>

      {/* Phase strip */}
      <div className="border-b border-borderDark px-3 pt-2.5 pb-2 overflow-x-auto">
        <div className="flex items-start min-w-max">
          {PHASES.map((phase, i) => (
            <div key={phase.label} className="flex items-start shrink-0">
              {/* Tile + short label */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-5 h-5 flex items-center justify-center font-mono text-[9px] border ${
                  i === 0 ? 'border-amber text-amber bg-amber/10' : 'border-borderDark/40 text-textMuted/25'
                }`}>
                  {i + 1}
                </div>
                <span className={`font-mono text-[8px] uppercase tracking-wide whitespace-nowrap ${
                  i === 0 ? 'text-amber/80' : 'text-textMuted/30'
                }`}>
                  {phase.short}
                </span>
              </div>
              {/* Connector line between tiles */}
              {i < PHASES.length - 1 && (
                <div className={`w-3 h-px shrink-0 mt-[10px] ${i === 0 ? 'bg-amber/30' : 'bg-borderDark/30'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="px-5 py-4 h-[288px] overflow-y-auto space-y-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        {EXCHANGE.map((msg, i) => {
          const isSettled = i < visibleCount;
          const isTyping = i === typingIdx && !isSettled;
          if (!isSettled && !isTyping) return null;

          if (msg.role === 'student') {
            return (
              <div key={`${loopKey}-${i}`} className="flex justify-end animate-slide-up">
                <div className="font-mono text-sm text-textMuted border border-borderDark/50 bg-background/50 p-4 max-w-[85%]">
                  {isTyping
                    ? <TypedText key={`tt-${loopKey}-${i}`} text={msg.text} speed={CHAR_DELAY} />
                    : msg.text}
                </div>
              </div>
            );
          }

          return (
            <div key={`${loopKey}-${i}`} className="flex gap-2 animate-slide-up">
              <span className="text-amber text-xs mt-1 flex-shrink-0">◆</span>
              <p className="font-serif text-base text-textDefault leading-relaxed">
                {isTyping
                  ? <TypedText key={`tt-${loopKey}-${i}`} text={msg.text} speed={CHAR_DELAY} />
                  : msg.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Dummy input */}
      <div className="px-5 py-3 border-t border-borderDark">
        <div className="w-full bg-background/60 border border-borderDark/60 px-4 py-3 font-mono text-sm text-textMuted/40 select-none">
          Your structural response…
        </div>
      </div>
    </div>
  );
}
