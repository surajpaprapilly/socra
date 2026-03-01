export default function StageIndicator({ currentStage }) {
    // currentStage = 1, 2, or 3
    const stages = [
        { id: 1, label: "READ" },
        { id: 2, label: "SUMMARISE" },
        { id: 3, label: "BANK" }
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
        <div className="w-full flex items-center justify-center py-6 border-b border-borderDark/30 bg-background/50 backdrop-blur-sm z-40 sticky top-16">
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
        </div>
    );
}
