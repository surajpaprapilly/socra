import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ghostExamples = [
    "Is the pursuit of economic growth incompatible with environmental sustainability?",
    "To what extent should the state regulate what individuals say online?",
    "Has the feminist movement achieved its goals in the developing world?"
];

export default function LandingScreen({ onStartTest }) {
    const [question, setQuestion] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState('input'); // 'input' | 'mode-select'

    // Animation states for mode cards
    const [showCards, setShowCards] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (question.trim().length < 5) return;
        setStep('mode-select');
    };

    useEffect(() => {
        if (step === 'mode-select') {
            // Trigger animation
            setTimeout(() => setShowCards(true), 50);
        } else {
            setShowCards(false);
        }
    }, [step]);

    const handleSelectTest = () => {
        setIsLoading(true);
        onStartTest(question.trim());
    };

    const handleSelectLearn = () => {
        // Navigate to learn mode, passing the question via state
        navigate('/learn', { state: { question: question.trim() } });
    };

    return (
        <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-6 bg-background relative z-10">
            <div className="max-w-4xl w-full flex flex-col items-center">

                {step === 'input' ? (
                    <div className="w-full max-w-3xl text-center space-y-12 animate-in fade-in duration-500">
                        <div className="space-y-4">
                            <h1 className="font-display text-5xl md:text-7xl text-textDefault tracking-tight">
                                Think. Don't just answer.
                            </h1>
                            <p className="font-mono text-textMuted text-lg md:text-xl tracking-wide uppercase">
                                gp is a skill. here's how you build it.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8 w-full">
                            <div className="relative group w-full">
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder="Enter your General Paper question..."
                                    className="w-full bg-transparent border-b border-borderDark text-xl md:text-2xl text-textDefault placeholder-textMuted/50 focus:outline-none focus:border-amber transition-colors duration-300 resize-none py-4 text-center font-serif leading-relaxed"
                                    rows={2}
                                />
                                {isFocused && (
                                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber animate-pulse"></div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={question.trim().length < 5}
                                className={`
                                    px-8 py-3 bg-transparent border border-amber text-amber font-mono tracking-widest uppercase text-sm
                                    transition-all duration-300 hover:bg-amber/10 focus:outline-none focus:ring-1 focus:ring-amber
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent
                                `}
                            >
                                Begin Inquiry
                            </button>
                        </form>

                        <div className="pt-12 space-y-4">
                            <div className="flex flex-col space-y-3 items-center">
                                {ghostExamples.map((ex, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setQuestion(ex)}
                                        className="text-sm font-serif text-textMuted/40 hover:text-textMuted transition-colors duration-200 cursor-pointer"
                                    >
                                        "{ex}"
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Session Expectation Banner */}
                        <div className="pt-8 opacity-60">
                            <div className="inline-flex items-center space-x-2 border border-borderDark/50 px-4 py-2 bg-background/50 rounded-none">
                                <span className="text-amber">✦</span>
                                <span className="text-xs font-mono uppercase tracking-widest text-textMuted">This session has 5 stages. Most students finish in 12–15 minutes.</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-400">
                        <div className="mb-12 text-center max-w-2xl">
                            <h2 className="font-display text-3xl text-amber italic">
                                "{question}"
                            </h2>
                            <button
                                onClick={() => setStep('input')}
                                className="mt-4 text-sm font-mono text-textMuted hover:text-amber transition-colors opacity-70"
                            >
                                ← Edit question
                            </button>
                        </div>

                        <div className="w-full flex flex-col md:flex-row gap-6 justify-center max-w-4xl">
                            {/* Left Card: LEARN MODE */}
                            <div
                                onClick={handleSelectLearn}
                                className={`w-full md:w-[45%] bg-[#141210] border border-[#2A2825] p-8 cursor-pointer 
                                    transition-all duration-300 hover:-translate-y-1 hover:border-l-[3px] hover:border-l-amber hover:bg-[#1A1815] group
                                    ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} flex flex-col justify-between`}
                                style={{ transitionDelay: '0ms' }}
                            >
                                <div className="space-y-4">
                                    <h3 className="font-display text-2xl flex items-center gap-3">
                                        <span className="text-amber">◈</span> LEARN MODE
                                    </h3>
                                    <p className="font-serif text-[14px] text-textMuted leading-relaxed">
                                        Explore the question.
                                        <br />
                                        Read. Summarise. Build your knowledge before you argue.
                                    </p>
                                    <p className="font-mono text-[11px] text-textMuted/50 uppercase tracking-widest pt-2">
                                        Best for: first encounter with a topic
                                    </p>
                                </div>
                                <div className="mt-12 text-amber font-mono text-sm tracking-widest uppercase group-hover:translate-x-2 transition-transform duration-300">
                                    [ Enter Learn Mode → ]
                                </div>
                            </div>

                            {/* Right Card: TEST MODE */}
                            <div
                                onClick={handleSelectTest}
                                className={`w-full md:w-[45%] bg-[#141210] border border-[#2A2825] p-8 cursor-pointer 
                                    transition-all duration-300 hover:-translate-y-1 hover:border-l-[3px] hover:border-l-amber hover:bg-[#1A1815] group
                                    ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} flex flex-col justify-between`}
                                style={{ transitionDelay: '100ms' }}
                            >
                                <div className="space-y-4">
                                    <h3 className="font-display text-2xl flex items-center gap-3">
                                        <span className="text-textDefault">◆</span> TEST MODE
                                    </h3>
                                    <p className="font-serif text-[14px] text-textMuted leading-relaxed">
                                        No hints. No readings.
                                        <br />
                                        Just your thinking against the question.
                                    </p>
                                    <p className="font-mono text-[11px] text-textMuted/50 uppercase tracking-widest pt-2">
                                        Best for: exam practice
                                    </p>
                                </div>
                                <div className="mt-12 text-amber font-mono text-sm tracking-widest uppercase flex items-center gap-2">
                                    {isLoading ? (
                                        <span className="animate-pulse">Loading...</span>
                                    ) : (
                                        <span className="group-hover:translate-x-2 transition-transform duration-300">[ Begin Inquiry → ]</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
