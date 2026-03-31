import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export default function ModeChoice() {
    const navigate = useNavigate();
    const { statement, reaction, source, customQuestion } = useSession();
    const [showCards, setShowCards] = useState(false);

    // If accessed directly without context, redirect to home
    useEffect(() => {
        if (source === 'statement' && (!statement || !reaction)) {
            navigate('/');
        } else if (source === 'custom_question' && !customQuestion) {
            navigate('/');
        } else {
            // Trigger stagger animation
            setTimeout(() => setShowCards(true), 50);
        }
    }, [statement, reaction, source, customQuestion, navigate]);

    if ((source === 'statement' && (!statement || !reaction)) || 
        (source === 'custom_question' && !customQuestion)) {
        return null;
    }

    const handleLearnMode = () => {
        const questionToPass = source === 'statement' ? statement : customQuestion;
        navigate('/learn', { state: { question: questionToPass } });
    };

    const handleTestMode = () => {
        const questionToPass = source === 'statement' ? statement : customQuestion;
        // The App wrapper intercepts this for initializing the session 
        // We'll pass it to a new route that App.jsx handles, or assume App.jsx logic
        navigate('/test/init', { state: { question: questionToPass } });
    };

    let introText = "";
    if (source === 'statement') {
        introText = (
            <>
                You instinctively <span className="text-amber">
                    {reaction === 'complicated' ? 'found it complicated' : reaction + 'd'}
                </span>.
                <br />
                How do you want to develop that?
            </>
        );
    } else {
        introText = (
            <>
                You asked: <span className="text-amber italic">"{customQuestion}"</span>.
                <br />
                How do you want to proceed?
            </>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-6 bg-background relative z-10">
            <div className="max-w-4xl w-full flex flex-col items-center">

                <div className="w-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mb-16 text-center max-w-2xl">
                        <h2 className="font-serif text-2xl md:text-3xl text-textMuted leading-relaxed">
                            {introText}
                        </h2>
                    </div>

                    <div className="w-full flex flex-col md:flex-row gap-8 justify-center max-w-3xl">
                        {/* LEARN FIRST */}
                        <div
                            onClick={handleLearnMode}
                            className={`w-full md:w-[48%] bg-[#141210] border border-[#2A2825] p-8 cursor-pointer shadow-lg
                                transition-all duration-300 hover:-translate-y-1 hover:border-l-[3px] hover:border-l-amber hover:bg-[#1A1815] group
                                ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} flex flex-col justify-between`}
                            style={{ transitionDelay: '100ms' }}
                        >
                            <div className="space-y-6">
                                <h3 className="font-display text-2xl flex items-center gap-3 tracking-wide">
                                    <span className="text-amber text-[18px]">◈</span> LEARN FIRST
                                </h3>
                                
                                <p className="font-serif text-[15px] text-[#A39E98] leading-relaxed">
                                    Read perspectives before you argue. Build your saved blueprints first.
                                </p>
                                
                                <div className="pt-2">
                                    <p className="font-mono text-[11px] text-[#6B6560] uppercase tracking-widest leading-loose bg-[#0D0C0A] px-3 py-2 border border-[#2A2825]/50 inline-block">
                                        Best if this topic is new to you
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-12 font-mono text-sm tracking-widest uppercase flex justify-between items-end">
                                <span className="text-amber group-hover:translate-x-2 transition-transform duration-300">
                                    [ Enter Learn Mode → ]
                                </span>
                                <span className="text-textMuted/50 text-xs">
                                    ~20 mins
                                </span>
                            </div>
                        </div>

                        {/* THINK IT THROUGH */}
                        <div
                            onClick={handleTestMode}
                            className={`w-full md:w-[48%] bg-[#141210] border border-[#2A2825] p-8 cursor-pointer shadow-lg
                                transition-all duration-300 hover:-translate-y-1 hover:border-l-[3px] hover:border-l-amber hover:bg-[#1A1815] group
                                ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} flex flex-col justify-between`}
                            style={{ transitionDelay: '200ms' }}
                        >
                            <div className="space-y-6">
                                <h3 className="font-display text-2xl flex items-center gap-3 tracking-wide">
                                    <span className="text-textDefault text-[18px]">◆</span> THINK IT THROUGH
                                </h3>
                                
                                <p className="font-serif text-[15px] text-[#A39E98] leading-relaxed">
                                    Defend your instinct right now. No readings, no hints — just you and the question.
                                </p>
                                
                                <div className="pt-2">
                                    <p className="font-mono text-[11px] text-[#6B6560] uppercase tracking-widest leading-loose bg-[#0D0C0A] px-3 py-2 border border-[#2A2825]/50 inline-block">
                                        Best if you already have views
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-12 font-mono text-sm tracking-widest uppercase flex justify-between items-end">
                                <span className="text-textMuted group-hover:text-amber group-hover:translate-x-2 transition-all duration-300">
                                    [ Enter Test Mode → ]
                                </span>
                                <span className="text-textMuted/50 text-xs">
                                    ~15 mins
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/')}
                        className={`mt-16 font-mono text-xs text-textMuted/40 uppercase tracking-widest hover:text-textMuted transition-all duration-300 ${showCards ? 'opacity-100' : 'opacity-0'}`}
                        style={{ transitionDelay: '400ms' }}
                    >
                        ← Start over
                    </button>
                </div>
            </div>
        </div>
    );
}
