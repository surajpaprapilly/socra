import { useState } from 'react';

export default function FinalBlueprint({ insights }) {
    // This represents the final 1-page summary modal

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-8 animate-fade-in">
            <div className="max-w-2xl w-full border border-amber/20 bg-[#11100D] p-12 shadow-2xl relative overflow-hidden">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-amber/40"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-amber/40"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-amber/40"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-amber/40"></div>

                <div className="text-center mb-10">
                    <h2 className="font-display text-4xl text-amber mb-2">Inquiry Complete</h2>
                    <p className="font-mono text-xs uppercase tracking-widest text-textMuted">Your structural progression</p>
                </div>

                <div className="space-y-6 font-serif text-lg text-textDefault/90">
                    <div className="border-l-2 border-borderDark pl-4">
                        <span className="block font-mono text-[10px] text-textMuted uppercase tracking-widest mb-1">Position & Tension</span>
                        <p>You established a foundational stance and navigated rigorous counter-challenges.</p>
                    </div>

                    <div className="border-l-2 border-borderDark pl-4">
                        <span className="block font-mono text-[10px] text-textMuted uppercase tracking-widest mb-1">Perspectives Synthesized</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {insights.length > 0 ? insights.map((insight, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 bg-sage/10 text-sage text-xs font-mono">
                                    {insight}
                                </span>
                            )) : (
                                <span className="text-sm text-textMuted italic">No distinct alternate lenses introduced.</span>
                            )}
                        </div>
                    </div>

                    <div className="border-l-2 border-amber/50 pl-4 mt-8">
                        <span className="block font-mono text-[10px] text-amber uppercase tracking-widest mb-1">The Synthesis</span>
                        <p className="italic text-textDefault">You have successfully reached the final stage of structural debate. You possess the blueprint; now you must write the essay.</p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-transparent border border-borderDark text-textDefault font-mono tracking-widest uppercase text-xs hover:border-amber hover:text-amber transition-colors"
                    >
                        Begin New Inquiry
                    </button>
                </div>
            </div>
        </div>
    );
}
