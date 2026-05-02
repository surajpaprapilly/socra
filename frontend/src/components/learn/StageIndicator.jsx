export default function StageIndicator({ currentStage }) {
    // currentStage = 1, 2, or 3
    const stages = [
        { id: 1, label: "READ" },
        { id: 2, label: "TEST" }
    ];

    const getIcon = (stageId) => {
        if (stageId < currentStage) return <span className="text-textMuted">✓</span>;
        if (stageId === currentStage) return <span className="text-amber text-lg">◈</span>;
        return <span className="text-textMuted/40 text-sm">○</span>;
    };

    const getLabelClass = (stageId) => {
        if (stageId < currentStage) return "text-textMuted";
        if (stageId === currentStage) return "text-amber font-medium";
        return "text-textMuted/40";
    };

    return (
        <div className="w-full flex items-center justify-center py-6 border-b border-borderDark/30 bg-background/50 backdrop-blur-sm z-40 sticky top-16 relative">
            <div className="flex items-center space-x-4 md:space-x-8 font-mono text-xs tracking-[0.2em] uppercase">
                {stages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center">
                        <div className={`flex items-center space-x-2 transition-colors duration-300 ${getLabelClass(stage.id)}`}>
                            <div className="w-4 h-4 flex items-center justify-center">
                                {getIcon(stage.id)}
                            </div>
                            <span>{stage.label}</span>
                        </div>

                        {idx < stages.length - 1 && (
                            <div className="mx-4 md:mx-8 w-8 md:w-16 h-[1px] border-b border-dashed border-borderDark text-transparent">
                                {/* Dashed line */}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Beta badge — pinned to right of indicator bar */}
            <div className="absolute right-4 md:right-8 flex items-center">
                <div className="relative group">
                    <span className="font-mono text-[10px] tracking-widest uppercase bg-amber/15 text-amber border border-amber/40 px-2 py-1 cursor-help select-none">
                        BETA
                    </span>
                    <div className="absolute right-0 top-full mt-2 w-60 bg-[#1A1815] border border-borderDark text-textMuted text-[11px] font-mono leading-relaxed p-3 hidden group-hover:block z-50 pointer-events-none shadow-lg">
                        <span className="text-amber font-medium">Learn Mode is in beta.</span>
                        <br />
                        This means it&apos;s still being developed — articles and features may be incomplete or change.
                    </div>
                </div>
            </div>
        </div>
    );
}
