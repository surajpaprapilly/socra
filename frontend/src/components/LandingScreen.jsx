import { useState } from 'react';

const ghostExamples = [
    "Is the pursuit of economic growth incompatible with environmental sustainability?",
    "To what extent should the state regulate what individuals say online?",
    "Has the feminist movement achieved its goals in the developing world?"
];

export default function LandingScreen({ onStart }) {
    const [question, setQuestion] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (question.trim().length < 5) return;
        setIsLoading(true);
        onStart(question.trim());
    };

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-background relative z-10">
            <div className="max-w-3xl w-full text-center space-y-12">
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
                        disabled={isLoading || question.trim().length < 5}
                        className={`
              px-8 py-3 bg-transparent border border-amber text-amber font-mono tracking-widest uppercase text-sm
              transition-all duration-300 hover:bg-amber/10 focus:outline-none focus:ring-1 focus:ring-amber
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent
            `}
                    >
                        {isLoading ? "Initiating..." : "Begin Inquiry"}
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
        </div>
    );
}
