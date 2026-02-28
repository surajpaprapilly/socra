import React from 'react';

const ArgumentMap = ({ currentPhase }) => {
    const phases = [
        { num: 1, label: "Your Position", size: 6 },
        { num: 2, label: "Counterargument", size: 6 },
        { num: 3, label: "Your Rebuttal", size: 6 },
        { num: 4, label: "Nuance/Concession", size: 6 },
        { num: 5, label: "Synthesis", size: 6 },
    ];

    const renderBlocks = (phaseNum) => {
        const isActive = currentPhase >= phaseNum;
        const isCurrent = currentPhase === phaseNum;
        const isCompleted = currentPhase > phaseNum;

        // A simple visual representation of filling blocks: ████░░
        // If completed: all solid
        // If current: partial solid, partial empty/blinking
        // If future: all empty

        const totalBlocks = 6;
        let solidCount = 0;

        if (isCompleted) solidCount = totalBlocks;
        else if (isCurrent) solidCount = 2; // Represents in-progress
        else solidCount = 0;

        const blocks = [];
        for (let i = 0; i < totalBlocks; i++) {
            if (i < solidCount) {
                blocks.push(<span key={i} className="text-amber">█</span>);
            } else if (isCurrent && i === solidCount) {
                blocks.push(<span key={i} className="text-amber animate-pulse">▒</span>);
            } else {
                blocks.push(<span key={i} className={`text-borderDark ${isActive ? 'opacity-50' : 'opacity-20'}`}>░</span>);
            }
        }
        return blocks;
    };

    return (
        <div className="flex flex-col mb-8 w-full animate-fade-in">
            <span className="text-xs font-mono uppercase text-textMuted tracking-wider mb-4 border-b border-borderDark/40 pb-2">Your Argument Blueprint</span>
            <div className="flex flex-col space-y-3">
                {phases.map((p) => {
                    const isActive = currentPhase >= p.num;
                    return (
                        <div key={p.num} className={`flex flex-col ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                            <div className="flex justify-between items-end mb-1">
                                <span className={`font-mono text-[10px] tracking-widest uppercase ${currentPhase === p.num ? 'text-amber' : 'text-textMuted'}`}>
                                    {p.label}
                                </span>
                                {currentPhase === p.num && (
                                    <span className="text-[9px] text-amber animate-pulse border border-amber/30 px-1">ACTIVE</span>
                                )}
                            </div>
                            <div className="flex text-sm tracking-widest font-mono">
                                {renderBlocks(p.num)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ArgumentMap;
