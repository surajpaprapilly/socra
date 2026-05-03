import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CONFLICTS } from '../../data/conflicts';
import { THEMES } from '../../data/themes';
import { useSession } from '../../context/SessionContext';
import ArticleTile from '../learn/ArticleTile';
import GPQuestionPicker from './GPQuestionPicker';
import { fetchWithAuth, BASE_URL } from '../../lib/supabase';

export default function ConflictReading() {
    const { conflictId } = useParams();
    const navigate = useNavigate();
    const { setSession } = useSession();

    const conflict = CONFLICTS.find(c => c.id === conflictId);
    const theme = THEMES.find(t => t.id === conflict?.themeId);

    const [readings, setReadings] = useState({ side_a: [], side_b: [], singapore: [] });
    const [completedUrls, setCompletedUrls] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (!conflict || !theme) return;

        let isMounted = true;
        const fetchReadings = async () => {
            try {
                const response = await fetchWithAuth(`${BASE_URL}/api/learn/conflict-readings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conflict_id: conflict.id,
                        theme: theme.name,
                        side_a: conflict.sideA,
                        side_b: conflict.sideB,
                        search_query: conflict.searchQuery
                    })
                });

                if (!response.ok) throw new Error("Failed to fetch conflict readings");

                const data = await response.json();
                if (isMounted) {
                    setReadings({
                        side_a: data.side_a_articles || [],
                        side_b: data.side_b_articles || [],
                        singapore: data.singapore_articles || []
                    });
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
    }, [conflict, theme]);

    if (!conflict || !theme) {
        return <div className="p-8 text-amber font-mono text-center">Conflict not found.</div>;
    }

    const handleMarkDone = (url) => {
        const newCompleted = new Set(completedUrls);
        newCompleted.add(url);
        setCompletedUrls(newCompleted);
    };

    const handleContinue = () => {
        if (completedUrls.size >= 1) {
            setShowPicker(true);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 w-full max-w-[780px] mx-auto flex flex-col items-center pt-24 space-y-8 animate-pulse">
                <div className="h-8 w-3/4 bg-borderDark rounded-none"></div>
                <div className="h-4 w-1/2 bg-borderDark/50 rounded-none mb-12"></div>
                
                <div className="flex w-full gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="w-full bg-[#141210] border border-[#2A2825] p-6 h-32"></div>
                        <div className="w-full bg-[#141210] border border-[#2A2825] p-6 h-32"></div>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="w-full bg-[#141210] border border-[#2A2825] p-6 h-32"></div>
                        <div className="w-full bg-[#141210] border border-[#2A2825] p-6 h-32"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col items-center pt-24 text-center">
                <p className="text-amber font-mono">{error}</p>
            </div>
        );
    }

    // ── Question picker screen ──────────────────────────────────────────────
    if (showPicker) {
        return (
            <div className="w-full min-h-[calc(100vh-64px)] flex flex-col bg-background">
                <GPQuestionPicker
                    conflict={conflict}
                    onBack={() => setShowPicker(false)}
                />
            </div>
        );
    }

    return (
        <div className="w-full flex justify-center py-12 px-6">
            <div className="max-w-[780px] w-full flex flex-col animate-in fade-in duration-500">
                
                {/* Header */}
                <div className="w-full flex flex-col items-center mb-16 text-center">
                    <button 
                        onClick={() => navigate(`/conflicts/${theme.id}`)}
                        className="self-start font-mono text-sm text-textMuted hover:text-white transition-colors mb-8"
                    >
                        ← Back to conflicts
                    </button>
                    
                    <div className="flex items-center justify-center w-full mb-6">
                        <span className="font-mono text-xs uppercase tracking-widest text-amber">{conflict.sideA}</span>
                        <span className="font-serif italic text-sm text-amber mx-3">vs</span>
                        <span className="font-mono text-xs uppercase tracking-widest text-[#6B6560]">{conflict.sideB}</span>
                    </div>

                    <h2 className="font-display text-[26px] text-white leading-tight mb-4">
                        {conflict.title}
                    </h2>
                    
                    <p className="font-serif italic text-[15px] text-amber/70 mb-6">
                        "{conflict.descriptor}"
                    </p>
                    
                    <div className="w-[120px] h-[1px] bg-amber/50 mx-auto"></div>
                </div>

                {/* Two-column layout */}
                <div className="flex flex-col md:flex-row gap-6 mb-16 relative">
                    {/* Left Column (Side A) */}
                    <div className="flex-1 flex flex-col space-y-4">
                        <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-amber/70 mb-2">
                            UNDERSTANDING {conflict.sideA}
                        </div>
                        {readings.side_a.map((reading, idx) => (
                            <ArticleTile
                                key={`a-${idx}`}
                                reading={reading}
                                onMarkDone={() => handleMarkDone(reading.url)}
                                delay={idx * 80}
                            />
                        ))}
                    </div>
                    
                    {/* Vertical Divider (Hidden on mobile) */}
                    <div className="hidden md:block w-[1px] bg-[#2A2825] my-8 absolute left-1/2 -translate-x-1/2 top-0 bottom-0"></div>

                    {/* Right Column (Side B) */}
                    <div className="flex-1 flex flex-col space-y-4">
                        <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-textMuted mb-2">
                            UNDERSTANDING {conflict.sideB}
                        </div>
                        {readings.side_b.map((reading, idx) => (
                            <ArticleTile
                                key={`b-${idx}`}
                                reading={reading}
                                onMarkDone={() => handleMarkDone(reading.url)}
                                delay={idx * 80 + 200}
                            />
                        ))}
                    </div>
                </div>

                {/* Singapore Section */}
                {readings.singapore.length > 0 && (
                    <div className="w-full flex flex-col mb-16 animate-in slide-in-from-bottom-4 delay-500 fill-mode-both">
                        <div className="flex items-center justify-center w-full mb-6">
                            <div className="flex-1 h-[1px] bg-[#7A9E7E]/30"></div>
                            <div className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#7A9E7E] flex items-center gap-2">
                                <span>🇸🇬</span>
                                <span>The Singapore Angle</span>
                            </div>
                            <div className="flex-1 h-[1px] bg-[#7A9E7E]/30"></div>
                        </div>
                        
                        <div className="flex flex-col space-y-4 w-full">
                            {readings.singapore.map((reading, idx) => (
                                <div key={`sg-${idx}`} className="w-full">
                                    <ArticleTile
                                        reading={reading}
                                        onMarkDone={() => handleMarkDone(reading.url)}
                                        delay={idx * 80}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA Button */}
                <div className="flex justify-center pb-24 animate-in fade-in duration-1000 delay-500">
                    <button
                        onClick={handleContinue}
                        disabled={completedUrls.size < 1}
                        className={`
                            w-full md:w-auto px-8 py-4 font-mono tracking-widest uppercase text-[13px] transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-amber
                            ${completedUrls.size >= 1
                                ? 'bg-amber text-[#0D0C0A] hover:brightness-110 cursor-pointer shadow-[0_4px_20px_rgba(200,150,62,0.2)]'
                                : 'bg-[#141210] border border-borderDark text-textMuted/40 cursor-not-allowed pointer-events-none'
                            }
                        `}
                    >
                        I've read enough — proceed to Test Mode →
                    </button>
                </div>
                
            </div>
        </div>
    );
}
