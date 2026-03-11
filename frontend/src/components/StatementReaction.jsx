import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export default function StatementReaction() {
    const navigate = useNavigate();
    const { themeName, statement, setSession } = useSession();
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // Custom question state
    const [customQuestion, setCustomQuestion] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    // If accessed directly without context, redirect to home
    useEffect(() => {
        if (!statement) {
            navigate('/');
        }
    }, [statement, navigate]);

    if (!statement) return null;

    const handleReaction = (reaction) => {
        setSelectedReaction(reaction);
        
        // Auto-advance after animation
        setTimeout(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setSession({ reaction });
                navigate('/mode');
            }, 300); // Wait for transition out
        }, 600); // 600ms pulse delay
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (customQuestion.trim().length < 5) return;
        
        setIsTransitioning(true);
        setTimeout(() => {
            setSession({
                source: 'custom_question',
                customQuestion: customQuestion.trim()
            });
            navigate('/mode');
        }, 300);
    };

    return (
        <div className={`min-h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-6 bg-background relative z-10 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'} animate-in fade-in slide-in-from-right-8 duration-400 ease-in-out`}>
            
            <div className="w-full flex justify-center mb-16 animate-in fade-in duration-700">
                <span className="font-mono text-xs text-textMuted uppercase tracking-widest">
                    {themeName}
                </span>
            </div>

            <div className="max-w-3xl w-full flex flex-col items-center space-y-12">
                
                {/* Statement Display */}
                <div className="relative w-full flex flex-col items-center animate-in fade-in zoom-in-98 duration-500 delay-100 fill-mode-both">
                    <div className="w-[200px] h-[1px] bg-amber/30 mb-10"></div>
                    
                    {/* Decorative giant quote mark in background */}
                    <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 font-display text-[120px] text-amber opacity-10 select-none z-0">
                        "
                    </div>
                    
                    <h2 className="font-display italic text-3xl md:text-[32px] text-textDefault text-center max-w-[600px] leading-relaxed relative z-10 tracking-wide">
                        {statement}
                    </h2>
                    
                    <div className="w-[200px] h-[1px] bg-amber/30 mt-10"></div>
                </div>

                <div className="text-center font-serif italic text-textMuted text-lg mb-2 animate-in fade-in duration-500 delay-300 fill-mode-both">
                    What is your instinctive reaction?
                </div>

                {/* Reaction Buttons */}
                <div className="flex flex-wrap justify-center gap-6 w-full">
                    {[
                        { label: "Agree", val: "agree" },
                        { label: "Disagree", val: "disagree" },
                        { label: "It's complicated", val: "complicated" }
                    ].map((btn, idx) => {
                        const isSelected = selectedReaction === btn.val;
                        return (
                            <button
                                key={btn.val}
                                onClick={() => !selectedReaction && handleReaction(btn.val)}
                                disabled={selectedReaction !== null}
                                className={`
                                    px-8 py-3 font-mono text-sm tracking-widest uppercase transition-all duration-200 focus:outline-none
                                    animate-in fade-in slide-in-from-bottom-2 fill-mode-both
                                    ${isSelected 
                                        ? 'bg-amber text-[#0D0C0A] border-amber scale-[1.02] shadow-[0_0_20px_rgba(200,150,62,0.3)]' 
                                        : 'bg-transparent border border-[#2A2825] text-textMuted hover:border-amber hover:text-amber disabled:opacity-50 disabled:hover:border-[#2A2825] disabled:hover:text-textMuted'
                                    }
                                `}
                                style={{ animationDelay: `${400 + (idx * 80)}ms` }}
                            >
                                {btn.label}
                            </button>
                        );
                    })}
                </div>

                {/* Subtle Input Input */}
                <div className="pt-16 w-full max-w-xl animate-in fade-in duration-1000 delay-700 fill-mode-both">
                    <form onSubmit={handleCustomSubmit} className="flex flex-col items-center space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                        <label className="font-mono text-[10px] text-textMuted uppercase tracking-widest">
                            Or enter your own GP question instead
                        </label>
                        <div className="relative w-[300px]">
                            <input
                                type="text"
                                value={customQuestion}
                                onChange={(e) => setCustomQuestion(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Type a specific question..."
                                className="w-full bg-transparent border-b border-borderDark text-sm text-textDefault placeholder-textMuted/40 focus:outline-none focus:border-amber transition-colors duration-300 py-2 text-center font-serif"
                            />
                            {isFocused && (
                                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber animate-pulse"></div>
                            )}
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}
