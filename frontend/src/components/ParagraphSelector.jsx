const truncate = (str, max = 65) => {
    if (!str) return '';
    return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
};

export default function ParagraphSelector({ paragraphs, counterArgument, onSelect, completedItems }) {
    const items = [];

    (paragraphs || []).forEach((p, idx) => {
        if (!p.topic_sentence) return;
        const key = `para_${idx}`;
        const isDone = completedItems?.includes(key);
        items.push({
            key,
            label: `Paragraph ${idx + 1}`,
            preview: truncate(p.topic_sentence),
            message: `Let's go deeper on Paragraph ${idx + 1}: "${p.topic_sentence}"`,
            isDone,
        });
    });

    const caHasDeepDive = counterArgument?.its_merit || counterArgument?.student_response;
    items.push({
        key: 'counter',
        label: 'Counter-Argument',
        preview: counterArgument?.their_claim
            ? truncate(counterArgument.their_claim)
            : 'Build out the rebuttal',
        message: "Let's develop the counter-argument — concede what's right and build the rebuttal.",
        isDone: completedItems?.includes('counter') || caHasDeepDive,
    });

    items.push({
        key: 'conclusion',
        label: 'Conclusion Deep Dive',
        preview: 'Synthesis · Qualification · Lasting impression',
        message: "Let's build a strong conclusion — synthesis, honest qualification, and a lasting impression.",
        isDone: completedItems?.includes('conclusion'),
    });

    return (
        <div className="w-full mt-6 animate-fade-in">
            <div className="flex items-center mb-4 space-x-3">
                <span className="w-8 h-[1px] bg-amber/40"></span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber/70">
                    Go deeper on
                </span>
                <span className="flex-1 h-[1px] bg-amber/40"></span>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {items.map(item => (
                    <button
                        key={item.key}
                        onClick={() => !item.isDone && onSelect(item.message)}
                        disabled={item.isDone}
                        className={`text-left p-4 border transition-all ${
                            item.isDone
                                ? 'border-borderDark/20 bg-transparent opacity-40 cursor-default'
                                : 'border-borderDark/50 bg-background/30 hover:border-amber/50 hover:bg-amber/5 cursor-pointer'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-amber/70">
                                {item.label}
                            </span>
                            {item.isDone && (
                                <span className="font-mono text-[9px] uppercase tracking-widest text-green-500/60">
                                    ✓ done
                                </span>
                            )}
                        </div>
                        <span className="font-serif text-sm text-textDefault/80 leading-relaxed">
                            {item.preview}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
