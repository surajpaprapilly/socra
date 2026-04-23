import { useEffect } from 'react';

const MILESTONE_CONTENT = {
    question_autopsy_complete: {
        label: 'QUESTION AUTOPSY COMPLETE',
        statement: "You've done what most students skip — interrogating the question before arguing. That precision separates Band 3 from Band 4.",
    },
    both_sides_argued: {
        label: 'BOTH SIDES ENGAGED',
        statement: "You've engaged the opposing view at its strongest. Cambridge examiners reward this — it signals a mature, balanced argument.",
    },
    thesis_refined: {
        label: 'THESIS REFINED',
        statement: "You've sharpened your position under pressure. A refined thesis is the mark of evaluative thinking, not just descriptive argument.",
    },
    analytical_links_count: {
        label: 'ANALYTICAL DEPTH REACHED',
        statement: "Three analytical links built. Your examples are doing argumentative work — not just illustrative, but constitutive.",
    },
};

export default function MilestoneCard({ milestone, onDismiss }) {
    useEffect(() => {
        if (!milestone) return;
        const timer = setTimeout(onDismiss, 4500);
        return () => clearTimeout(timer);
    }, [milestone, onDismiss]);

    if (!milestone) return null;

    const content = MILESTONE_CONTENT[milestone];
    if (!content) return null;

    return (
        <div
            className="absolute bottom-[148px] left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-lg cursor-pointer animate-slide-in"
            onClick={onDismiss}
        >
            <div className="flex flex-col items-center text-center px-6 py-5 bg-[#11100D]/98 border border-amber/60 shadow-[0_0_30px_rgba(212,175,55,0.2)] backdrop-blur-md">
                <span className="text-amber text-lg mb-3">✦</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber/80 mb-2">
                    {content.label}
                </span>
                <p className="font-serif text-sm text-textDefault/80 leading-relaxed">
                    {content.statement}
                </p>
                <span className="mt-4 font-mono text-[9px] uppercase tracking-widest text-textMuted/30">
                    tap to continue
                </span>
            </div>
        </div>
    );
}
