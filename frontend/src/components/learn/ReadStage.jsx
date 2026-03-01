import { useState, useEffect } from 'react';

export default function ReadStage({ question, onComplete }) {
    const [readings, setReadings] = useState([]);
    const [checkedUrls, setCheckedUrls] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchReadings = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/learn/readings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question })
                });

                if (!response.ok) throw new Error("Failed to fetch readings");

                const data = await response.json();
                if (isMounted) {
                    setReadings(data.readings || []);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setError("Could not load readings. Please try again.");
                    setIsLoading(false);
                }
            }
        };

        fetchReadings();
        return () => { isMounted = false; };
    }, [question]);

    const toggleCheck = (url) => {
        const newChecked = new Set(checkedUrls);
        if (newChecked.has(url)) newChecked.delete(url);
        else newChecked.add(url);
        setCheckedUrls(newChecked);
    };

    const handleContinue = () => {
        if (checkedUrls.size >= 2) {
            const selectedReadings = readings.filter(r => checkedUrls.has(r.url));
            onComplete(selectedReadings);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 w-full max-w-3xl flex flex-col items-center pt-24 space-y-8 animate-pulse">
                <div className="h-8 w-3/4 bg-borderDark rounded-none"></div>
                <div className="h-4 w-1/2 bg-borderDark/50 rounded-none mb-12"></div>

                {[1, 2, 3].map(i => (
                    <div key={i} className="w-full bg-[#141210] border border-[#2A2825] p-6 h-32"></div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 w-full max-w-3xl flex flex-col items-center pt-24 text-center">
                <p className="text-amber font-mono">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full flex flex-col items-center py-12 px-6">
            <div className="max-w-[720px] w-full flex flex-col">
                <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="font-display text-4xl text-amber italic mb-6 leading-tight">
                        "{question}"
                    </h2>
                    <p className="font-mono text-textMuted text-sm uppercase tracking-widest">
                        Before you argue, read. Select at least 2 articles.
                    </p>
                </div>

                <div className="space-y-6 mb-16">
                    {readings.map((reading, idx) => {
                        const isChecked = checkedUrls.has(reading.url);
                        return (
                            <div
                                key={idx}
                                className={`
                                    bg-[#141210] border border-[#2A2825] p-6 relative transition-all duration-300
                                    animate-in fade-in slide-in-from-bottom-8 
                                    ${isChecked ? 'border-l-[3px] border-l-amber' : 'hover:border-borderDark'}
                                `}
                                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="font-mono text-xs text-textMuted uppercase tracking-widest flex items-center space-x-3">
                                        <span className="text-textDefault">{reading.source}</span>
                                        <span>•</span>
                                        <span>{reading.estimated_minutes}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleCheck(reading.url)}
                                        className="w-5 h-5 flex items-center justify-center text-lg focus:outline-none transition-colors"
                                    >
                                        {isChecked ? (
                                            <span className="text-amber">●</span>
                                        ) : (
                                            <span className="text-textMuted/40 hover:text-amber/50">○</span>
                                        )}
                                    </button>
                                </div>

                                <h3 className="font-display text-2xl text-textDefault mb-3">
                                    {reading.title}
                                </h3>

                                <p className="font-serif text-sm text-amber/70 leading-relaxed mb-6">
                                    {reading.why_relevant}
                                </p>

                                <a
                                    href={reading.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-amber uppercase tracking-widest hover:underline hover:underline-offset-4 transition-all"
                                >
                                    [ Open Article → ]
                                </a>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-center pb-24 animate-in fade-in duration-1000 delay-500">
                    <button
                        onClick={handleContinue}
                        disabled={checkedUrls.size < 2}
                        className={`
                            px-8 py-3 font-mono tracking-widest uppercase text-sm border transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-amber
                            ${checkedUrls.size >= 2
                                ? 'bg-transparent border-amber text-amber hover:bg-amber/10'
                                : 'bg-transparent border-borderDark text-textMuted/50 cursor-not-allowed'
                            }
                        `}
                    >
                        I've read enough. Now I'll summarise. →
                    </button>
                </div>
            </div>
        </div>
    );
}
