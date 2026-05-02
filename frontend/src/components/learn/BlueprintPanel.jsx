import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth, BASE_URL } from '../../lib/supabase';

// Deep merge helper that ensures fields don't accidentally revert to null when the backend returns nulls due to partial LLM outputs
const mergeBlueprintState = (prev, incoming) => {
    if (!prev) return incoming;
    if (!incoming) return prev;

    const merged = { ...prev };
    
    // Arrays handling
    if (incoming.key_terms && Array.isArray(incoming.key_terms)) {
        incoming.key_terms.forEach(newTerm => {
            if (!newTerm.term) return;
            const existingIdx = merged.key_terms?.findIndex(t => t.term === newTerm.term);
            if (existingIdx !== undefined && existingIdx >= 0) {
                merged.key_terms[existingIdx] = { 
                    ...merged.key_terms[existingIdx], 
                    ...Object.fromEntries(Object.entries(newTerm).filter(([_, v]) => v !== null)) 
                };
            } else {
                merged.key_terms = [...(merged.key_terms || []), newTerm];
            }
        });
    }

    if (incoming.paragraphs && Array.isArray(incoming.paragraphs)) {
        merged.paragraphs = [...(merged.paragraphs || [])];
        incoming.paragraphs.forEach((p, idx) => {
            if (idx < merged.paragraphs.length) {
                merged.paragraphs[idx] = {
                    ...merged.paragraphs[idx],
                    ...Object.fromEntries(Object.entries(p).filter(([_, v]) => v !== null))
                };
            } else {
                merged.paragraphs.push(p);
            }
        });
    }
    
    // Counter argument
    if (incoming.counter_argument) {
        merged.counter_argument = {
            ...(merged.counter_argument || {}),
            ...Object.fromEntries(Object.entries(incoming.counter_argument).filter(([_, v]) => v !== null))
        };
    }
    
    // Insights
    if (incoming.unlocked_insights && Array.isArray(incoming.unlocked_insights)) {
        merged.unlocked_insights = incoming.unlocked_insights;
    }
    
    // Conclusion
    if (incoming.conclusion) {
        merged.conclusion = {
            ...(merged.conclusion || {}),
            ...Object.fromEntries(Object.entries(incoming.conclusion).filter(([_, v]) => v !== null))
        };
    }

    // Scalars
    if (incoming.thesis !== null && incoming.thesis !== undefined) merged.thesis = incoming.thesis;
    if (incoming.checklist) merged.checklist = incoming.checklist;
    if (incoming.conclusion_prompts) merged.conclusion_prompts = incoming.conclusion_prompts;
    if (incoming.session_quality) {
        merged.session_quality = { ...(merged.session_quality || {}), ...incoming.session_quality };
    }

    return merged;
};

export default function BlueprintPanel({
    sessionId,
    initialQuestion,
    onMilestoneReached,
    deepDiveMode = false,
    activeDeepDive = null,
    onDeepDiveSelect = null,
}) {
    const [blueprint, setBlueprint] = useState(null);
    const [isPolling, setIsPolling] = useState(true);
    const [exportError, setExportError] = useState(false);
    const previousSqRef = useRef(null);
    
    // Local checklist state for interactivity
    const [localChecklist, setLocalChecklist] = useState([
        { label: "Define key terms", completed: false },
        { label: "Establish clear thesis", completed: false },
        { label: "First supporting argument", completed: false },
        { label: "Second supporting argument", completed: false },
        { label: "Address counter-argument", completed: false },
        { label: "Synthesize conclusion", completed: false }
    ]);

    useEffect(() => {
        if (blueprint?.checklist) {
            setLocalChecklist(blueprint.checklist);
        }
    }, [blueprint?.checklist]);

    const toggleChecklist = (idx) => {
        setLocalChecklist(prev => {
            const copy = [...prev];
            copy[idx].completed = !copy[idx].completed;
            return copy;
        });
    };

    useEffect(() => {
        if (!sessionId || !isPolling) return;

        const fetchBp = async () => {
            try {
                const res = await fetchWithAuth(`${BASE_URL}/api/blueprint/${sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    setBlueprint(prev => mergeBlueprintState(prev, data));

                    if (data.session_quality) {
                        const sq = data.session_quality;

                        // Stop polling when fully complete (all deep dives done)
                        if (sq.question_autopsy_complete && sq.both_sides_argued && sq.thesis_refined && sq.analytical_links_count >= 3) {
                            setIsPolling(false);
                        }

                        // Detect flag transitions and fire milestone events.
                        // On the very first poll, just snapshot the state — don't fire cards
                        // for flags that were already true (e.g. on session resume).
                        const prev = previousSqRef.current;
                        if (prev === null) {
                            previousSqRef.current = { ...sq };
                        } else if (onMilestoneReached) {
                            // question_autopsy_complete and argument_sketch_complete fire from
                            // ChatInterface SSE metadata (more authoritative than this flag).
                            if (!prev.both_sides_argued && sq.both_sides_argued)
                                onMilestoneReached('both_sides_argued');
                            if (!prev.thesis_refined && sq.thesis_refined)
                                onMilestoneReached('thesis_refined');
                            if ((prev.analytical_links_count || 0) < 3 && (sq.analytical_links_count || 0) >= 3)
                                onMilestoneReached('analytical_links_count');
                            previousSqRef.current = { ...sq };
                        }
                    }
                }
            } catch (err) {
                // Fail silently and retry on next interval as requested
            }
        };

        // Poll every 3 seconds
        const interval = setInterval(fetchBp, 3000);
        return () => clearInterval(interval);
    }, [sessionId, isPolling]);

    const handleExport = async () => {
        setExportError(false);
        try {
            const res = await fetchWithAuth(`${BASE_URL}/api/blueprint/${sessionId}/export`);
            if (!res.ok) throw new Error("Export failed");
            const data = await res.json();
            
            // Generate PDF using window.jspdf
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            let y = 20;
            const leftMargin = 20;
            const maxWidth = 170;
            
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            const splitTitle = doc.splitTextToSize(`Question: ${initialQuestion || data.question || "Unknown"}`, maxWidth);
            doc.text(splitTitle, leftMargin, y);
            y += (splitTitle.length * 7) + 10;
            
            doc.setFontSize(12);
            
            // Helper to render text with word wrap
            const renderSection = (title, textLines) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFont("helvetica", "bold");
                doc.text(title, leftMargin, y);
                y += 7;
                
                doc.setFont("helvetica", "normal");
                textLines.forEach(line => {
                    if (!line) return;
                    const splitLine = doc.splitTextToSize(line, maxWidth);
                    if (y + (splitLine.length * 7) > 280) { doc.addPage(); y = 20; }
                    doc.text(splitLine, leftMargin, y);
                    y += (splitLine.length * 7);
                });
                y += 10;
            };

            // Key terms
            if (data.key_terms?.length) {
                const termLines = data.key_terms.map(t => `• ${t.term}: ${t.definition || "Not defined"}`);
                renderSection("Key Terms definitions", termLines);
            }
            
            // Thesis
            if (data.thesis) {
                renderSection("Thesis", [data.thesis]);
            }
            
            // Paragraphs
            if (data.paragraphs?.length) {
                data.paragraphs.forEach((p, idx) => {
                    const pLines = [
                        `Topic Sentence: ${p.topic_sentence || ""}`,
                        `Point: ${p.point || ""}`,
                        `Explanation: ${p.explanation || ""}`,
                        `Example: ${p.example || ""}`,
                        `Link: ${p.link || ""}`
                    ];
                    renderSection(`Paragraph ${idx + 1}: ${p.title || "Argument"}`, pLines);
                });
            }
            
            // Counter-argument
            if (data.counter_argument) {
                renderSection("Counter Argument", [
                    `Their Claim: ${data.counter_argument.their_claim || ""}`,
                    `Its Merit: ${data.counter_argument.its_merit || ""}`,
                    `Student Response: ${data.counter_argument.student_response || ""}`
                ]);
            }

            // Conclusion
            if (data.conclusion) {
                renderSection("Conclusion", [
                    `Synthesis: ${data.conclusion.synthesis || ""}`,
                    `Qualification: ${data.conclusion.qualification || ""}`,
                    `Lasting Impression: ${data.conclusion.lasting_impression || ""}`
                ]);
            }

            const safeTitle = (initialQuestion || "essay").split(" ").slice(0, 4).join("-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`socra-blueprint-${safeTitle}-${dateStr}.pdf`);
            
        } catch (e) {
            console.error(e);
            setExportError(true);
        }
    };

    if (!blueprint) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 animate-fade-in">
                <span className="font-display text-4xl text-textDefault tracking-wide mb-6">Socra</span>
                <p className="font-mono text-sm text-textMuted uppercase tracking-widest leading-loose">
                    Your blueprint will build here as you think.
                </p>
            </div>
        );
    }

    // Prepare arrays up to max length for skeletons
    const paragraphs = [...(blueprint.paragraphs || [])];
    while(paragraphs.length < 3) paragraphs.push({});

    const sq = blueprint.session_quality || {};

    const isKnown = (v) => !!v && v !== '<UNKNOWN>';

    return (
        <div className="flex flex-col h-full">
            {/* Header — shrink-0, never scrolls away */}
            <div className="shrink-0 bg-[#11100D]/95 backdrop-blur-md z-30 px-8 py-6 border-b border-borderDark/40 flex items-start justify-between">
                <h2 className="font-serif text-lg leading-relaxed text-textDefault max-w-[90%]">
                    {initialQuestion || blueprint.question}
                </h2>
                {isPolling && (
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                )}
            </div>

            {/* Scrollable content — only this region scrolls */}
            <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-8 flex flex-col space-y-12">
                {/* Unlocked Insights Badges */}
                {blueprint.unlocked_insights && blueprint.unlocked_insights.length > 0 && (
                    <div className="flex flex-col space-y-4 animate-fade-in">
                        <h3 className="font-mono text-xs uppercase text-amber/80 tracking-wider flex items-center">
                            <span className="mr-2">✦</span> Earned Insights
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {blueprint.unlocked_insights.map((insight, idx) => (
                                <div key={idx} className="flex items-center px-3 py-1.5 bg-amber/10 border border-amber/30 text-amber text-xs font-mono shadow-[0_0_8px_rgba(212,175,55,0.15)]">
                                    {insight}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Key Terms */}
                <div className="flex flex-col space-y-4">
                    <h3 className="font-mono text-xs uppercase text-textMuted tracking-wider">Key Terms</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {blueprint.key_terms && blueprint.key_terms.length > 0 ? blueprint.key_terms.map((t, idx) => (
                            <div key={idx} className={`p-4 border ${t.definition ? 'border-borderDark bg-background/30' : 'border-borderDark/20 bg-transparent'} transition-all animate-fade-in`}>
                                <div className="font-display text-textDefault mb-2">{t.term}</div>
                                {t.definition ? (
                                    <div className="font-mono text-sm text-textMuted leading-relaxed animate-fade-in">{t.definition}</div>
                                ) : (
                                    <div className="font-mono text-xs text-textMuted/40 italic">Waiting for definition...</div>
                                )}
                            </div>
                        )) : (
                            <div className="font-mono text-xs text-textMuted/40 italic">Identifying loaded terms...</div>
                        )}
                    </div>
                </div>

                {/* 3. Thesis */}
                <div className="flex flex-col space-y-4">
                    <h3 className="font-mono text-xs uppercase text-textMuted tracking-wider">Thesis</h3>
                    <div className="p-6 border border-amber/30 bg-amber/5">
                        {blueprint.thesis ? (
                            <div className="font-serif text-xl leading-relaxed text-amber animate-fade-in">{blueprint.thesis}</div>
                        ) : (
                            <div className="font-serif text-lg text-amber/40 animate-pulse italic">Thesis forming...</div>
                        )}
                    </div>
                </div>

                {/* 4. Paragraph Skeletons */}
                <div className="flex flex-col space-y-6">
                    <h3 className="font-mono text-xs uppercase text-textMuted tracking-wider">Paragraph Skeletons</h3>
                    {paragraphs.map((p, idx) => {
                        const key = `para_${idx}`;
                        const isActive = activeDeepDive === key;
                        const isDone = isKnown(p.point) && isKnown(p.explanation) && isKnown(p.example) && isKnown(p.link);
                        const isClickable = deepDiveMode && !isDone && !isActive && onDeepDiveSelect && !!p.topic_sentence;
                        const message = `Let's go deeper on Paragraph ${idx + 1}: "${p.topic_sentence}"`;

                        let ringClass = 'border-borderDark/40';
                        if (isActive)                               ringClass = 'border-amber ring-2 ring-amber/60';
                        else if (isDone)                            ringClass = 'border-green-500/40';
                        else if (deepDiveMode && p.topic_sentence)  ringClass = 'border-amber/50 animate-pulse';

                        return (
                        <div
                            key={idx}
                            className={`flex flex-col border bg-background/20 overflow-hidden transition-all ${ringClass} ${isClickable ? 'cursor-pointer hover:border-amber hover:bg-amber/5' : ''}`}
                            onClick={() => isClickable && onDeepDiveSelect(key, message)}
                        >
                            <div className="bg-borderDark/20 px-4 py-2 font-mono text-xs text-textMuted uppercase tracking-wider flex items-center justify-between">
                                <span>Argument {idx + 1} {p.title ? `- ${p.title}` : ''}</span>
                                {isActive && <span className="text-amber/80 text-[10px] tracking-widest normal-case">Exploring...</span>}
                                {isDone && <span className="text-green-500/70 text-[10px] tracking-widest normal-case">✓ Done</span>}
                                {isClickable && <span className="text-amber/60 text-[10px] tracking-widest normal-case">Explore →</span>}
                            </div>
                            <div className="p-4 flex flex-col space-y-4 font-mono text-sm">
                                {/* Topic Sentence */}
                                <div className="pl-4 border-l-2 border-green-500/70">
                                    <span className="text-xs uppercase text-green-500/70 block mb-1">Topic Sentence</span>
                                    {p.topic_sentence ? <span className="text-textDefault animate-fade-in">{p.topic_sentence}</span> : <div className="h-4 bg-borderDark/20 w-3/4 rounded animate-pulse"></div>}
                                </div>
                                {/* Point */}
                                <div className="pl-4 border-l-2 border-borderDark/40">
                                    <span className="text-xs uppercase text-textMuted block mb-1">Point / Premise</span>
                                    {p.point ? <span className="text-textDefault animate-fade-in">{p.point}</span> : <div className="h-4 bg-borderDark/20 w-1/2 rounded pb-1"></div>}
                                </div>
                                {/* Explanation */}
                                <div className="pl-4 border-l-2 border-borderDark/40">
                                    <span className="text-xs uppercase text-textMuted block mb-1">Explanation</span>
                                    {p.explanation ? <span className="text-textDefault animate-fade-in">{p.explanation}</span> : <div className="h-4 bg-borderDark/20 w-full rounded pb-1"></div>}
                                </div>
                                {/* Example */}
                                <div className="pl-4 border-l-2 border-borderDark/40">
                                    <span className="text-xs uppercase text-textMuted block mb-1">Evidence / Example</span>
                                    {p.example ? <span className="text-textDefault animate-fade-in">{p.example}</span> : <div className="h-4 bg-borderDark/20 w-2/3 rounded pb-1"></div>}
                                </div>
                                {/* Link */}
                                <div className="pl-4 border-l-2 border-purple-500/70">
                                    <span className="text-xs uppercase text-purple-500/70 block mb-1">Analytical Link</span>
                                    {p.link ? <span className="text-textDefault animate-fade-in">{p.link}</span> : <div className="h-4 bg-borderDark/20 w-5/6 rounded animate-pulse"></div>}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>

                {/* 5. Counter-argument */}
                {(() => {
                    const key = 'counter';
                    const isActive = activeDeepDive === key;
                    const isDone = isKnown(blueprint.counter_argument?.their_claim) && isKnown(blueprint.counter_argument?.its_merit) && isKnown(blueprint.counter_argument?.student_response);
                    const isClickable = deepDiveMode && !isDone && !isActive && onDeepDiveSelect;
                    const message = "Let's develop the counter-argument — concede what's right and build the rebuttal.";

                    let ringClass = 'border-borderDark/40';
                    if (isActive)       ringClass = 'border-amber ring-2 ring-amber/60';
                    else if (isDone)    ringClass = 'border-green-500/40';
                    else if (deepDiveMode) ringClass = 'border-amber/50 animate-pulse';

                    return (
                    <div className="flex flex-col space-y-4">
                        <h3 className="font-mono text-xs uppercase text-textMuted tracking-wider flex items-center justify-between">
                            <span>Counter Argument</span>
                            {isActive && <span className="text-amber/80 text-[10px] normal-case">Exploring...</span>}
                            {isDone && <span className="text-green-500/70 text-[10px] normal-case">✓ Done</span>}
                            {isClickable && <span className="text-amber/60 text-[10px] normal-case">Explore →</span>}
                        </h3>
                        <div
                            className={`flex flex-col border bg-background/20 p-4 space-y-4 font-mono text-sm transition-all ${ringClass} ${isClickable ? 'cursor-pointer hover:border-amber hover:bg-amber/5' : ''}`}
                            onClick={() => isClickable && onDeepDiveSelect(key, message)}
                        >
                            <div className="pl-4 border-l-2 border-red-500/50">
                                <span className="text-xs uppercase text-red-500/50 block mb-1">Their Claim</span>
                                {blueprint.counter_argument?.their_claim ? <span className="text-textDefault animate-fade-in">{blueprint.counter_argument.their_claim}</span> : <div className="h-4 bg-borderDark/20 w-3/4 rounded"></div>}
                            </div>
                            <div className="pl-4 border-l-2 border-red-400/30">
                                <span className="text-xs uppercase text-textMuted block mb-1">Its Merit</span>
                                {blueprint.counter_argument?.its_merit ? <span className="text-textDefault animate-fade-in">{blueprint.counter_argument.its_merit}</span> : <div className="h-4 bg-borderDark/20 w-1/2 rounded"></div>}
                            </div>
                            <div className="pl-4 border-l-2 border-amber/50">
                                <span className="text-xs uppercase text-amber/50 block mb-1">Your Response</span>
                                {blueprint.counter_argument?.student_response ? <span className="text-textDefault animate-fade-in">{blueprint.counter_argument.student_response}</span> : <div className="h-4 bg-borderDark/20 w-full rounded"></div>}
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {/* 6. Conclusion */}
                {(() => {
                    const key = 'conclusion';
                    const isActive = activeDeepDive === key;
                    const isDone = isKnown(blueprint.conclusion?.synthesis) && isKnown(blueprint.conclusion?.qualification) && isKnown(blueprint.conclusion?.lasting_impression);
                    const isClickable = deepDiveMode && !isDone && !isActive && onDeepDiveSelect;
                    const message = "Let's build a strong conclusion — synthesis, honest qualification, and a lasting impression.";

                    let ringClass = 'border-borderDark/40';
                    if (isActive)       ringClass = 'border-amber ring-2 ring-amber/60';
                    else if (isDone)    ringClass = 'border-green-500/40';
                    else if (deepDiveMode) ringClass = 'border-amber/50 animate-pulse';

                    return (
                    <div className="flex flex-col space-y-4">
                        <h3 className="font-mono text-xs uppercase text-textMuted tracking-wider flex items-center justify-between">
                            <span>Conclusion</span>
                            {isActive && <span className="text-amber/80 text-[10px] normal-case">Exploring...</span>}
                            {isDone && <span className="text-green-500/70 text-[10px] normal-case">✓ Done</span>}
                            {isClickable && <span className="text-amber/60 text-[10px] normal-case">Explore →</span>}
                        </h3>
                        <div
                            className={`flex flex-col border bg-background/20 p-4 space-y-4 font-mono text-sm transition-all ${ringClass} ${isClickable ? 'cursor-pointer hover:border-amber hover:bg-amber/5' : ''}`}
                            onClick={() => isClickable && onDeepDiveSelect(key, message)}
                        >
                            <div className="pl-4 border-l-2 border-amber/50">
                                <span className="text-xs uppercase text-amber/50 block mb-1">Synthesis</span>
                                {blueprint.conclusion?.synthesis
                                    ? <span className="text-textDefault animate-fade-in">{blueprint.conclusion.synthesis}</span>
                                    : <div className="h-4 bg-borderDark/20 w-full rounded animate-pulse"></div>}
                            </div>
                            <div className="pl-4 border-l-2 border-borderDark/40">
                                <span className="text-xs uppercase text-textMuted block mb-1">Qualification</span>
                                {blueprint.conclusion?.qualification
                                    ? <span className="text-textDefault animate-fade-in">{blueprint.conclusion.qualification}</span>
                                    : <div className="h-4 bg-borderDark/20 w-3/4 rounded"></div>}
                            </div>
                            <div className="pl-4 border-l-2 border-purple-500/70">
                                <span className="text-xs uppercase text-purple-500/70 block mb-1">Lasting Impression</span>
                                {blueprint.conclusion?.lasting_impression
                                    ? <span className="text-textDefault animate-fade-in">{blueprint.conclusion.lasting_impression}</span>
                                    : <div className="h-4 bg-borderDark/20 w-5/6 rounded animate-pulse"></div>}
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {/* 7. Examiner Checklist */}
                <div className="flex flex-col space-y-4">
                    <h3 className="font-mono text-xs uppercase text-textMuted tracking-wider">Examiner Checklist</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {localChecklist.map((item, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => toggleChecklist(idx)}
                                className={`flex items-center space-x-3 p-3 text-left border transition-colors ${item.completed ? 'border-green-500/30 bg-green-500/5 text-green-500' : 'border-borderDark/30 hover:border-borderDark text-textMuted'}`}
                            >
                                <div className={`w-4 h-4 rounded-sm flex items-center justify-center border ${item.completed ? 'border-green-500 bg-green-500 text-background' : 'border-borderDark/50'}`}>
                                    {item.completed && <span className="text-[10px]">✓</span>}
                                </div>
                                <span className="font-mono text-xs tracking-wider">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 8. Session Quality Pill Row */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-borderDark/20">
                    <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest rounded ${sq.question_autopsy_complete ? 'bg-green-500/20 text-green-400' : 'bg-borderDark/20 text-textMuted'}`}>
                        Autopsy
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest rounded ${sq.argument_sketch_complete ? 'bg-amber/20 text-amber' : 'bg-borderDark/20 text-textMuted'}`}>
                        Skeleton
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest rounded ${sq.thesis_refined ? 'bg-green-500/20 text-green-400' : 'bg-borderDark/20 text-textMuted'}`}>
                        Refined Thesis
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest rounded ${sq.both_sides_argued ? 'bg-green-500/20 text-green-400' : 'bg-borderDark/20 text-textMuted'}`}>
                        Balanced
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-mono uppercase tracking-widest rounded ${(sq.analytical_links_count || 0) >= 3 ? 'bg-green-500/20 text-green-400' : 'bg-borderDark/20 text-textMuted'}`}>
                        Links: {sq.analytical_links_count || 0} / 3
                    </span>
                </div>
            </div>
            </div>{/* end scrollable content */}

            {/* Download button — shrink-0 footer, always visible at panel bottom */}
            <div
                className="shrink-0 bg-[#11100D]/95 backdrop-blur-md border-t border-borderDark/40 px-6 pt-6"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
                <button
                    onClick={handleExport}
                    className="w-full py-4 bg-textDefault text-background font-display uppercase tracking-widest hover:bg-amber transition-colors flex flex-col items-center justify-center"
                >
                    <span>Download Blueprint</span>
                </button>
                {exportError && <div className="text-center mt-2 text-red-500 font-mono text-xs animate-fade-in">Export failed — please try again.</div>}
            </div>
        </div>
    );
}

