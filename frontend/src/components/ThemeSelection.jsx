import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { THEMES } from '../data/themes';
import { useSession } from '../context/SessionContext';

export default function ThemeSelection() {
    const navigate = useNavigate();
    const { setSession, clearSession } = useSession();
    
    // Original input state (the escape hatch)
    const [showInput, setShowInput] = useState(false);
    const [question, setQuestion] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    
    useEffect(() => {
        // Clear session when hitting the landing screen
        clearSession();
    }, []);

    const handleThemeSelect = (theme) => {
        setSession({
            theme: theme.id,
            themeName: theme.name,
            source: 'theme_conflict'
        });
        
        navigate(`/conflicts/${theme.id}`);
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (question.trim().length < 5) return;
        
        setSession({
            source: 'custom_question',
            customQuestion: question.trim()
        });
        
        navigate('/mode');
    };

    return (
        <div className="min-h-[calc(100vh-64px)] w-full flex flex-col items-center py-16 px-6 bg-background relative z-10 animate-in fade-in slide-in-from-right-8 duration-400 ease-in-out">
            <div className="max-w-5xl w-full flex flex-col items-center space-y-16">
                
                {/* Header text */}
                <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="font-display text-5xl md:text-6xl text-amber tracking-tight">
                        SOCRA
                    </h1>
                    <p className="font-serif italic text-textMuted text-lg md:text-xl">
                        Where would you like to begin today?
                    </p>
                </div>

                {/* Theme Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-[900px]">
                    {THEMES.map((theme, idx) => (
                        <div 
                            key={theme.id}
                            onClick={() => handleThemeSelect(theme)}
                            className="group bg-[#141210] border border-[#2A2825] p-6 flex flex-col items-start cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:border-l-[3px] hover:border-l-amber hover:bg-[#1A1814] hover:shadow-[0_8px_30px_rgba(200,150,62,0.05)] animate-in fade-in slide-in-from-bottom-4"
                            style={{ 
                                animationDelay: `${idx * 60}ms`,
                                animationFillMode: 'both',
                                height: '180px'
                            }}
                        >
                            {/* Icon Container */}
                            <div className="w-8 h-8 flex items-center justify-center bg-amber/5 border border-amber/10 mb-4 transition-colors group-hover:bg-amber/10 group-hover:border-amber/20 group-hover:shadow-[0_0_15px_rgba(200,150,62,0.15)]">
                                <span className="text-[14px] leading-none">{theme.icon}</span>
                            </div>
                            
                            {/* Texts */}
                            <h3 className="font-display text-xl text-textDefault mb-2 transition-colors group-hover:text-amber">
                                {theme.name}
                            </h3>
                            <p className="font-serif italic text-[13px] text-[#6B6560] leading-relaxed">
                                {theme.descriptor}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Escape Hatch */}
                <div className="pt-8 w-full max-w-3xl flex flex-col items-center animate-in fade-in duration-1000 delay-500">
                    {!showInput ? (
                        <button 
                            onClick={() => setShowInput(true)}
                            className="font-mono text-[11px] text-textMuted/40 uppercase tracking-widest hover:text-textMuted transition-colors focus:outline-none"
                        >
                            Already have a question in mind? Enter it directly.
                        </button>
                    ) : (
                        <form onSubmit={handleCustomSubmit} className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="relative group w-full">
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder="Enter your General Paper question..."
                                    className="w-full bg-transparent border-b border-borderDark text-lg md:text-xl text-textDefault placeholder-textMuted/30 focus:outline-none focus:border-amber transition-colors duration-300 resize-none py-3 text-center font-serif leading-relaxed"
                                    rows={1}
                                />
                                {isFocused && (
                                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber animate-pulse"></div>
                                )}
                            </div>
                            
                            <div className="flex justify-center flex-col items-center gap-4">
                                <button
                                    type="submit"
                                    disabled={question.trim().length < 5}
                                    className="px-6 py-2 bg-transparent border border-amber text-amber font-mono tracking-widest uppercase text-[11px] transition-all duration-300 hover:bg-amber/10 focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                >
                                    Proceed →
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInput(false)}
                                    className="font-mono text-[10px] text-textMuted/40 uppercase tracking-widest hover:text-textMuted focus:outline-none"
                                >
                                    ✕ Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
