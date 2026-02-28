import React from 'react';

const ArgumentMap = ({ currentPhase, blueprint, tension, evidence }) => {

    // Layer 1: The Spine
    const spineSections = [
        { id: 'thesis', label: 'THESIS' },
        { id: 'arg1', label: 'ARGUMENT 1' },
        { id: 'arg2', label: 'ARGUMENT 2' },
        { id: 'counterarg', label: 'COUNTERARGUMENT' },
        { id: 'synthesis', label: 'SYNTHESIS' }
    ];

    const renderSpineBlocks = (hasContent) => {
        if (hasContent) {
            return (
                <span className="text-amber tracking-widest text-[10px]">██████████</span>
            );
        }
        return (
            <span className="text-borderDark/30 tracking-widest text-[10px]">░░░░░░░░░░</span>
        );
    };

    return (
        <div className="flex flex-col w-full h-full relative">
            <span className="text-xs font-mono uppercase text-textMuted tracking-wider mb-6 border-b border-borderDark/40 pb-2">
                Living Essay Blueprint
            </span>

            {/* LAYER 1: THE SPINE */}
            <div className="flex flex-col space-y-6 relative ml-2 z-10">
                {/* Visual vertical connector line */}
                <div className="absolute left-[3px] top-4 bottom-4 w-[1px] bg-gradient-to-b from-amber/40 via-borderDark/20 to-transparent -z-10"></div>

                {spineSections.map((section, idx) => {
                    const content = blueprint?.[section.id];
                    const hasContent = !!content;

                    return (
                        <div key={section.id} className="flex flex-col relative animate-fade-in group">
                            {/* Node dot on the line */}
                            <div className={`absolute -left-1 top-[6px] w-[9px] h-[9px] rotate-45 border transition-all duration-700 ${hasContent ? 'bg-amber border-amber' : 'bg-background border-borderDark/50'}`}></div>

                            <div className="pl-6 flex flex-col">
                                <div className="flex items-center space-x-4 mb-1">
                                    <span className={`font-mono text-[10px] tracking-widest uppercase ${hasContent ? 'text-amber' : 'text-textMuted/50'}`}>
                                        ◆ {section.label}
                                    </span>
                                    {renderSpineBlocks(hasContent)}
                                    {!hasContent && idx === 0 && currentPhase === 1 && (
                                        <span className="text-[9px] text-amber/60 animate-pulse italic font-serif tracking-wide lowercase">forming...</span>
                                    )}
                                </div>

                                {hasContent && (
                                    <div className="mt-2 text-sm font-serif text-textDefault/90 leading-relaxed border-l border-amber/20 pl-4 py-1 animate-slide-in">
                                        "{content}"
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* LAYER 2: THE TENSION VISUALIZATION */}
            {tension && tension.pole_left && tension.pole_right && (
                <div className="mt-12 mb-8 flex flex-col pt-8 border-t border-borderDark/20 animate-fade-in">
                    <span className="text-[10px] font-mono uppercase text-textMuted tracking-widest mb-4">Dialectical Tension</span>
                    <div className="flex items-center justify-between text-[11px] font-mono text-textMuted/80 uppercase mb-2">
                        <span className="max-w-[100px] text-left leading-tight">{tension.pole_left}</span>
                        <span className="max-w-[100px] text-right leading-tight">{tension.pole_right}</span>
                    </div>
                    <div className="relative w-full h-[2px] bg-borderDark/30 rounded-full mt-2">
                        {/* The Amber gradient axis */}
                        <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber/20 via-amber/80 to-amber/20 rounded-full w-full opacity-60"></div>

                        {/* The dynamic dot */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-background border border-amber rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-1000 ease-out flex items-center justify-center pointer-events-none"
                            style={{ left: `calc(${Math.max(0, Math.min(100, tension.current_position || 50))}% - 8px)` }}
                        >
                            <div className="w-[4px] h-[4px] bg-amber rounded-full"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* LAYER 3: THE EVIDENCE NODES */}
            {evidence && evidence.length > 0 && (
                <div className="mt-auto pt-8 border-t border-borderDark/20 animate-fade-in">
                    <span className="text-[10px] font-mono uppercase text-textMuted tracking-widest mb-4 block">Evidence Map</span>
                    <div className="flex flex-wrap gap-2">
                        {evidence.map((node, i) => {
                            const isRejected = node.status === 'rejected';
                            return (
                                <span
                                    key={i}
                                    className={`
                                        text-xs font-mono px-2 py-1 transition-all duration-700
                                        ${isRejected ? 'text-textMuted/40 line-through border border-borderDark/30' : 'text-textDefault bg-[#1c1a16] border border-amber/30'}
                                    `}
                                >
                                    [{node.label}]
                                    {isRejected && <span className="ml-1 text-[8px] italic opacity-60">✗</span>}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArgumentMap;
