import { useState, useEffect, useRef } from 'react';
import TagDropdown from '../ui/TagDropdown';

const FALLBACK_PROMPTS = [
    "What is the author's central argument?",
    "Find one specific piece of evidence worth keeping.",
    "Which sentence would you quote in a GP essay?"
];

export default function ArticleTile({
    reading,
    question,
    initialNotes,
    onNotesUpdate,
    onMarkDone,
    delay = 0
}) {
    // Top-level UI phases
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Data State
    const [freeNotes, setFreeNotes] = useState(initialNotes?.free_notes || "");
    const [highlights, setHighlights] = useState(initialNotes?.highlights || []);
    const [prompts, setPrompts] = useState(null);
    const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
    const [promptsError, setPromptsError] = useState(false);

    // Interaction states
    const [showZeroNotesGate, setShowZeroNotesGate] = useState(false);
    const [showInactivityNudge, setShowInactivityNudge] = useState(false);

    // Timers
    const inactivityTimerRef = useRef(null);

    const wordCount = freeNotes.trim().split(/\s+/).filter(w => w.length > 0).length;

    // --- EFFECT: Sync Notes Upwards ---
    useEffect(() => {
        onNotesUpdate(reading.url, {
            article_title: reading.title,
            article_source: reading.source,
            free_notes: freeNotes,
            // Only send highlights that have actual quote content
            highlights: highlights.filter(h => h.quote.trim().length > 0)
        });
    }, [freeNotes, highlights]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- EFFECT: Fetch Prompts ---
    useEffect(() => {
        if (isExpanded && !prompts && !isLoadingPrompts && !promptsError) {
            let isMounted = true;
            setIsLoadingPrompts(true);

            const fetchPrompts = async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

                try {
                    const response = await fetch('http://localhost:8000/api/learn/reading-prompts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            question,
                            article_title: reading.title,
                            article_source: reading.source,
                            why_relevant: reading.why_relevant
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error("API Error");

                    const data = await response.json();
                    if (isMounted) {
                        setPrompts(data.prompts);
                        setIsLoadingPrompts(false);
                    }
                } catch (err) {
                    // Timeout or any other error
                    if (isMounted) {
                        setPrompts(FALLBACK_PROMPTS);
                        setPromptsError(true);
                        setIsLoadingPrompts(false);
                    }
                }
            };
            fetchPrompts();

            return () => { isMounted = false; };
        }
    }, [isExpanded, prompts, isLoadingPrompts, promptsError, question, reading]);

    // --- EFFECT: Inactivity Timer ---
    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        setShowInactivityNudge(false);

        // Only care about inactivity if they haven't written anything yet
        if (isExpanded && wordCount === 0 && highlights.length === 0 && !isReadOnly && !isDone) {
            inactivityTimerRef.current = setTimeout(() => {
                setShowInactivityNudge(true);
            }, 3 * 60 * 1000); // 3 minutes
        }
    };

    useEffect(() => {
        resetInactivityTimer();
        return () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        };
    }, [isExpanded, isReadOnly, isDone, wordCount, highlights.length]);

    // --- HANDLERS ---
    const expandArticle = () => {
        window.open(reading.url, '_blank', 'noopener,noreferrer');
        setIsExpanded(true);
        setIsReadOnly(false);
        setShowZeroNotesGate(false);
    };

    const handleCollapse = () => {
        setIsExpanded(false);
    };

    const handleAddHighlight = () => {
        resetInactivityTimer();
        setHighlights([...highlights, { tag: 'Key Argument', quote: '', note: '' }]);
    };

    const updateHighlight = (index, field, value) => {
        resetInactivityTimer();
        const newHighlights = [...highlights];
        newHighlights[index][field] = value;
        setHighlights(newHighlights);
    };

    const removeHighlight = (index) => {
        resetInactivityTimer();
        const newHighlights = highlights.filter((_, i) => i !== index);
        setHighlights(newHighlights);
    };

    const handleDoneClick = () => {
        if (wordCount === 0 && highlights.filter(h => h.quote.trim().length > 0).length === 0) {
            setShowZeroNotesGate(true);
        } else {
            completeTile();
        }
    };

    const completeTile = () => {
        setIsDone(true);
        setIsExpanded(false);
        setShowZeroNotesGate(false);
        onMarkDone();
    };

    const openReviewMode = () => {
        setIsExpanded(true);
        setIsReadOnly(true);
    };

    // --- RENDER PHASES ---

    if (!isExpanded && !isDone) {
        // DEFAULT COMPACT CARD
        return (
            <div
                className={`
                    bg-[#141210] border border-[#2A2825] p-6 relative transition-all duration-300
                    hover:border-borderDark cursor-pointer animate-in fade-in slide-in-from-bottom-4 group
                `}
                style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
                onClick={expandArticle}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="font-mono text-xs text-textMuted uppercase tracking-widest flex items-center space-x-3">
                        <span className="text-textDefault">{reading.source}</span>
                        <span>•</span>
                        <span>{reading.estimated_minutes}</span>
                    </div>
                </div>

                <h3 className="font-display text-2xl text-textDefault mb-3 group-hover:text-amber transition-colors">
                    {reading.title}
                </h3>

                <p className="font-serif text-sm text-amber/70 leading-relaxed mb-4">
                    {reading.why_relevant}
                </p>

                <div className="font-mono text-xs text-amber uppercase tracking-widest group-hover:underline group-hover:underline-offset-4 transition-all inline-block">
                    [ Read & Note → ]
                </div>
            </div>
        );
    }

    if (!isExpanded && isDone) {
        // COMPLETED STATE (Summary)
        return (
            <div className={`bg-[#141210] border border-[#2A2825] border-l-[3px] border-l-amber p-4 relative animate-in fade-in duration-300`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <span className="text-[#7A9E7E] text-lg">✓</span>
                        <h3 className="font-display text-lg text-textDefault">
                            {reading.title} <span className="font-mono text-xs text-textMuted uppercase tracking-widest ml-2">{reading.source} · {reading.estimated_minutes}</span>
                        </h3>
                    </div>
                </div>

                <div className="mt-3 ml-7 flex items-center space-x-4">
                    <span className="font-mono text-xs text-textMuted lowercase tracking-widest">
                        {highlights.length} highlights · {wordCount} words of notes
                    </span>
                    <button
                        onClick={openReviewMode}
                        className="font-mono text-xs text-amber uppercase tracking-widest hover:underline underline-offset-4 focus:outline-none"
                    >
                        [ Review notes ]
                    </button>
                </div>
            </div>
        );
    }

    // EXPANDED WORKSPACE
    return (
        <div className={`
            bg-[#141210] border border-[#2A2825] border-l-[3px] border-l-amber overflow-hidden flex flex-col
            transition-all duration-400 ease-out origin-top animate-in slide-in-from-top-2
        `}>
            {/* SECTION 1 - Header */}
            <div className="p-4 border-b border-[#2A2825] flex justify-between items-center bg-[#1A1814]">
                <div>
                    <div className="font-mono text-xs text-textMuted uppercase tracking-widest flex items-center space-x-2 mb-1">
                        <a href={reading.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber transition-colors">
                            ↗ Opened in new tab
                        </a>
                        <span>·</span>
                        <span>{reading.source}</span>
                        <span>·</span>
                        <span>{reading.estimated_minutes}</span>
                    </div>
                    <h3 className="font-display text-xl text-textDefault leading-tight">
                        {reading.title}
                    </h3>
                </div>
                <div className="flex items-center space-x-4">
                    {isReadOnly && (
                        <button
                            onClick={() => setIsReadOnly(false)}
                            className="font-mono text-xs text-amber uppercase border border-amber/30 px-3 py-1 hover:bg-amber/10 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={handleCollapse}
                        className="font-mono text-xs text-textMuted hover:text-textDefault transition-colors focus:outline-none uppercase"
                    >
                        [ ✕ collapse ]
                    </button>
                </div>
            </div>

            {/* SECTION 2 - Reading Brief */}
            <div className="p-6 pb-8 border-b border-[#2A2825]/50 bg-gradient-to-b from-[#1A1814] to-transparent">
                <div className="font-mono text-xs text-amber uppercase tracking-widest mb-4">
                    ◆ AS YOU READ, LOOK FOR:
                </div>

                {isLoadingPrompts ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex">
                                <span className="font-serif text-sm text-amber/40 w-6 italic">{i}.</span>
                                <div className="h-4 bg-amber/10 w-3/4 rounded animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {(prompts || []).map((prompt, i) => (
                            <div key={i} className="flex items-start">
                                <span className="font-serif text-sm text-textMuted w-6 italic mt-0.5">{i + 1}.</span>
                                <span className="font-serif text-[15px] text-textDefault leading-relaxed italic opacity-90">{prompt}</span>
                            </div>
                        ))}
                        {promptsError && (
                            <div className="mt-4 font-mono text-xs text-textMuted border-l-2 border-textMuted pl-2 opacity-50">
                                Using general prompts — specific prompts unavailable
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SECTION 3 - Free Notes */}
            <div className="p-6 relative group">
                <div className="font-mono text-xs text-textMuted uppercase tracking-widest mb-3">
                    Your Notes
                </div>

                <div className="relative">
                    <textarea
                        value={freeNotes}
                        onChange={(e) => {
                            setFreeNotes(e.target.value);
                            resetInactivityTimer();
                        }}
                        readOnly={isReadOnly}
                        placeholder={isReadOnly ? "" : "Paste or type anything worth keeping from this article..."}
                        className={`
                            w-full min-h-[140px] bg-transparent resize-y font-serif text-lg leading-relaxed text-textDefault
                            placeholder-textMuted/30 focus:outline-none transition-colors border-b-2 border-transparent pb-4
                            ${!isReadOnly ? 'focus:border-amber/50' : ''}
                        `}
                    />
                    <div className="font-mono text-[#555] text-xs lowercase mt-2 absolute bottom-2 right-0 bg-[#141210] pl-2">
                        {wordCount} words
                    </div>
                </div>
            </div>

            {/* SECTION 5 - Inactivity Nudge (Conditional) */}
            {showInactivityNudge && (
                <div className="px-6 py-4 animate-in fade-in duration-700">
                    <p className="font-serif italic text-amber/60 text-sm leading-relaxed border-l-[2px] border-amber/30 pl-4 py-1">
                        <span className="text-amber mr-2">◆</span>
                        Still reading? No rush.<br />
                        When something strikes you, come back and note it here.<br />
                        Even one sentence is enough.
                    </p>
                </div>
            )}

            {/* SECTION 4 - Highlights */}
            <div className="p-6 pt-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="font-mono text-xs text-textMuted uppercase tracking-widest">
                        Your Highlights
                    </div>
                    {!isReadOnly && (
                        <button
                            onClick={handleAddHighlight}
                            className="font-mono text-xs text-amber uppercase hover:text-amber/80 transition-colors focus:outline-none"
                        >
                            [ + Add highlight ]
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {highlights.map((hlt, idx) => (
                        <div
                            key={idx}
                            className="bg-[#1A1814] border border-[#2A2825] p-4 relative animate-in slide-in-from-top-4 duration-200"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <TagDropdown
                                    value={hlt.tag}
                                    onChange={(val) => updateHighlight(idx, 'tag', val)}
                                    onInteract={resetInactivityTimer}
                                    disabled={isReadOnly}
                                />
                                {!isReadOnly && (
                                    <button
                                        onClick={() => removeHighlight(idx)}
                                        className="text-textMuted hover:text-amber transition-colors w-6 h-6 flex items-center justify-center font-mono text-sm leading-none"
                                        title="Remove highlight"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <div className="border border-[#2A2825] bg-[#141210] mb-3 relative group">
                                <textarea
                                    value={hlt.quote}
                                    onChange={(e) => updateHighlight(idx, 'quote', e.target.value)}
                                    readOnly={isReadOnly}
                                    placeholder={isReadOnly ? "" : "Paste the sentence from the article..."}
                                    className="w-full bg-transparent p-3 font-serif text-[15px] leading-relaxed text-amber focus:outline-none focus:bg-[#1A150D]/30 transition-colors resize-y min-h-[80px]"
                                />
                            </div>

                            {(hlt.note || !isReadOnly) && (
                                <>
                                    <div className="font-mono text-[10px] text-textMuted uppercase mb-1">
                                        Why it matters (optional)
                                    </div>
                                    <div className="border border-[#2A2825] bg-[#141210]">
                                        <textarea
                                            value={hlt.note}
                                            onChange={(e) => updateHighlight(idx, 'note', e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full bg-transparent p-2 font-mono text-xs text-textMuted focus:text-textDefault focus:outline-none resize-y min-h-[40px]"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {highlights.length === 0 && (
                        <div className="text-center py-6 border border-dashed border-[#2A2825] opacity-50">
                            <span className="font-mono text-xs text-textMuted">No highlights added yet.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 6 - Done Button / Gate */}
            <div className="mt-4 pb-0 bg-[#0D0C0A]">
                {showZeroNotesGate ? (
                    <div className="p-4 flex flex-col items-center bg-[#1A1814] border-t border-amber/30 animate-in fade-in zoom-in-95 duration-250">
                        <p className="font-serif italic text-amber text-center mb-4 text-[15px]">
                            You haven't noted anything yet.<br />
                            One extracted sentence now saves you ten minutes later.
                        </p>
                        <div className="flex space-x-6 font-mono text-xs uppercase tracking-widest">
                            <button
                                onClick={() => setShowZeroNotesGate(false)}
                                className="text-amber hover:underline underline-offset-4"
                            >
                                [ Go back and find one thing ]
                            </button>
                            <button
                                onClick={completeTile}
                                className="text-textMuted hover:text-textDefault hover:underline underline-offset-4"
                            >
                                Continue anyway →
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={isReadOnly ? handleCollapse : handleDoneClick}
                        className="w-full p-4 font-mono text-sm tracking-widest uppercase bg-[#C8963E] text-[#0D0C0A] hover:brightness-110 transition-all focus:outline-none"
                    >
                        {isReadOnly ? "Close ✕" : "✓ Done with this article →"}
                    </button>
                )}
            </div>
        </div>
    );
}
