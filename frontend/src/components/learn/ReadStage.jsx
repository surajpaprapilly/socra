import { useState, useEffect } from 'react';
import ArticleTile from './ArticleTile';
import { fetchWithAuth } from '../../lib/supabase';

export default function ReadStage({ question, onComplete }) {
    const [readings, setReadings] = useState([]);
    const [completedUrls, setCompletedUrls] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchReadings = async () => {
            try {
                const response = await fetchWithAuth('http://localhost:8000/api/learn/readings', {
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

    const handleMarkDone = (url) => {
        const newCompleted = new Set(completedUrls);
        newCompleted.add(url);
        setCompletedUrls(newCompleted);
    };

    const handleContinue = () => {
        if (completedUrls.size >= 2) {
            onComplete();
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
            <div className="max-w-[720px] w-full flex flex-col pt-12">
                <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="font-display text-4xl text-amber italic mb-6 leading-tight">
                        "{question}"
                    </h2>
                    <p className="font-mono text-textMuted text-sm uppercase tracking-widest">
                        Before you argue, read. Select at least 2 articles.
                    </p>
                </div>

                <div className="space-y-6 mb-16">
                    {readings.map((reading, idx) => (
                        <ArticleTile
                            key={idx}
                            reading={reading}
                            onMarkDone={() => handleMarkDone(reading.url)}
                            delay={idx * 80}
                        />
                    ))}
                </div>

                <div className="flex justify-center pb-24 animate-in fade-in duration-1000 delay-500">
                    <button
                        onClick={handleContinue}
                        disabled={completedUrls.size < 2}
                        className={`
                            px-8 py-3 font-mono tracking-widest uppercase text-sm border transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-amber
                            ${completedUrls.size >= 2
                                ? 'bg-transparent border-amber text-amber hover:bg-amber/10'
                                : 'bg-transparent border-borderDark text-textMuted/50 cursor-not-allowed'
                            }
                        `}
                    >
                        I've read enough. Proceed to Test Mode →
                    </button>
                </div>
            </div>
        </div>
    );
}
