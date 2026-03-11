import { useState } from 'react';

export default function SummariseStage({ question, readingsRead, articleNotes, onBankReady }) {
    const [summary, setSummary] = useState("");
    const [followUpResponse, setFollowUpResponse] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null); // { question, tags, ready }
    const [isNotesExpanded, setIsNotesExpanded] = useState(true);

    const totalHighlights = articleNotes?.reduce((acc, note) => acc + (note.highlights ? note.highlights.length : 0), 0) || 0;
    const articlesWithHighlights = articleNotes?.filter(n => n.highlights && n.highlights.length > 0).length || 0;

    const groupedHighlights = {};
    if (articleNotes) {
        articleNotes.forEach(note => {
            if (note.highlights) {
                note.highlights.forEach(h => {
                    if (!groupedHighlights[h.tag]) {
                        groupedHighlights[h.tag] = [];
                    }
                    groupedHighlights[h.tag].push({ ...h, sourceTitle: note.article_title });
                });
            }
        });
    }

    const tagIcons = {
        'Key Argument': '✦',
        'Surprising Fact': '◈',
        'Use in Essay': '⚡',
        'Still Confused': '?'
    };

    const wordCount = summary.trim().split(/\s+/).filter(w => w.length > 0).length;

    const handleSubmit = async () => {
        if (wordCount < 10) return;
        setIsSubmitting(true);

        try {
            const body = {
                question,
                summary: summary + (followUpResponse ? "\n\nFollow-up: " + followUpResponse : ""),
                readings_read: readingsRead,
                article_notes: articleNotes || []
            };

            const response = await fetch('http://localhost:8000/api/learn/summarise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("Failed to get feedback");

            const data = await response.json();
            setFeedback({
                question: data.follow_up_question,
                tags: data.insight_tags || [],
                ready: data.ready_to_bank
            });
        } catch (err) {
            console.error(err);
            alert("Error connecting to Socra API.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBank = async () => {
        // Save to bank
        setIsSubmitting(true); // repurpose loading state for the save button
        try {
            const body = {
                question,
                summary,
                follow_up_response: followUpResponse,
                insight_tags: feedback?.tags || [],
                readings: readingsRead
            };

            const response = await fetch('http://localhost:8000/api/bank/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("Failed to save to bank");

            const data = await response.json();
            onBankReady(data.entry_id, body);
        } catch (err) {
            console.error(err);
            alert("Error saving to Knowledge Bank.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-12 py-12 px-6">
            {/* LEFT — Writing Area (60%) */}
            <div className="w-full md:w-[60%] flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Collapsible Reading Notes Panel */}
                {totalHighlights > 0 && (
                    <div className="mb-8 border border-[#2A2825] bg-[#141210]">
                        <button
                            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                            className="w-full flex justify-between items-center p-3 px-4 bg-[#1A1814] border-b border-[#2A2825] focus:outline-none hover:bg-[#1f1d18] transition-colors"
                        >
                            <span className="font-mono text-xs text-amber uppercase tracking-widest flex items-center">
                                <span className="mr-2">◈</span>
                                YOUR READING NOTES <span className="text-textMuted ml-3 lowercase normal-case text-[10px]">({totalHighlights} highlights across {articlesWithHighlights} articles)</span>
                            </span>
                            <span className="font-mono text-[10px] text-textMuted uppercase tracking-widest">
                                [ {isNotesExpanded ? 'collapse ▴' : 'expand ▾'} ]
                            </span>
                        </button>

                        {isNotesExpanded && (
                            <div className="p-4 space-y-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {Object.entries(groupedHighlights).map(([tag, hlts]) => (
                                    <div key={tag} className="space-y-2">
                                        <div className="font-mono text-[11px] text-amber/80 uppercase tracking-widest mb-3 flex items-center border-b border-[#2A2825] pb-1">
                                            <span className="mr-2">{tagIcons[tag]}</span>
                                            {tag === 'Key Argument' ? 'KEY ARGUMENTS' :
                                                tag === 'Surprising Fact' ? 'SURPRISING FACTS' :
                                                    tag === 'Use in Essay' ? 'USE IN ESSAY' :
                                                        'STILL CONFUSED'}
                                            <span className="ml-2 bg-[#2A2825] px-1.5 rounded-sm text-[9px]">{hlts.length}</span>
                                        </div>
                                        {hlts.map((h, i) => (
                                            <div key={i} className="pl-2 border-l-2 border-[#2A2825] mb-3">
                                                <p className="font-serif text-[14px] leading-relaxed text-textDefault/90 italic">
                                                    "{h.quote}" — <span className="font-mono text-[9px] uppercase tracking-widest text-textMuted/60 not-italic">{h.sourceTitle}</span>
                                                </p>
                                                {h.note && (
                                                    <p className="font-mono text-[11px] text-amber/60 mt-1 pl-2 border-l border-amber/20">
                                                        Note: {h.note}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-6">
                    <label className="font-mono text-xs text-textMuted uppercase tracking-[0.2em]">
                        Your Synthesis
                    </label>
                </div>

                <div className="flex-1 relative flex flex-col min-h-[400px]">
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="What did you learn? What surprised you? What would you use in an essay?"
                        className="flex-1 w-full bg-transparent border-b border-borderDark text-lg text-textDefault placeholder-textMuted/40 focus:outline-none focus:border-amber transition-colors duration-300 resize-none py-4 font-serif leading-relaxed"
                    />

                    <div className="flex justify-between items-center mt-4 pt-2">
                        <span className="font-mono text-xs text-textMuted uppercase">
                            {wordCount} words
                        </span>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || wordCount < 10}
                            className={`
                                font-mono text-xs tracking-widest uppercase transition-colors
                                ${wordCount >= 10 && !isSubmitting ? 'text-amber hover:text-amber/80' : 'text-textMuted/50 cursor-not-allowed'}
                            `}
                        >
                            {isSubmitting ? "Processing..." : "Submit for feedback →"}
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT — Live Feedback Panel (40%) */}
            <div className="w-full md:w-[40%] flex flex-col border-l border-borderDark/30 pl-12">
                {!feedback ? (
                    <div className="flex-1 flex flex-col justify-center items-center h-full opacity-60">
                        <p className="font-mono text-sm text-textMuted uppercase tracking-widest text-center">
                            Write your summary.
                            <br />
                            A question will follow.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-4">
                            <p className="font-serif text-lg text-textDefault leading-relaxed">
                                <span className="text-amber mr-2">◆</span>
                                {feedback.question}
                            </p>
                        </div>

                        {!feedback.ready && (
                            <div className="flex flex-col space-y-4 relative group">
                                <textarea
                                    value={followUpResponse}
                                    onChange={(e) => setFollowUpResponse(e.target.value)}
                                    placeholder="Respond to Socra..."
                                    className="w-full bg-transparent border-b border-borderDark text-sm text-textMuted focus:text-textDefault placeholder-textMuted/40 focus:outline-none focus:border-amber transition-colors duration-300 resize-none py-2 font-serif leading-relaxed h-24"
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || followUpResponse.trim().length === 0}
                                    className="self-end font-mono text-xs text-amber uppercase tracking-widest hover:text-amber/80 disabled:opacity-50"
                                >
                                    Push Deeper →
                                </button>
                            </div>
                        )}

                        {feedback.tags && feedback.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-4">
                                {feedback.tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="font-mono text-[10px] text-amber/80 border border-amber/30 px-3 py-1 uppercase tracking-widest animate-in fade-in slide-in-from-right-4"
                                        style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
                                    >
                                        [{tag}]
                                    </span>
                                ))}
                            </div>
                        )}

                        {feedback.ready && (
                            <div className="mt-8 p-6 border border-[#7A9E7E]/30 bg-[#7A9E7E]/5 flex flex-col items-start space-y-4 animate-in fade-in duration-700 delay-300">
                                <p className="font-mono text-sm text-[#7A9E7E] uppercase tracking-widest">
                                    Your summary is ready to save. →
                                </p>
                                <button
                                    onClick={handleBank}
                                    disabled={isSubmitting}
                                    className="px-6 py-3 bg-transparent border border-[#7A9E7E] text-[#7A9E7E] font-mono tracking-widest uppercase text-xs transition-all duration-300 hover:bg-[#7A9E7E]/10 focus:outline-none disabled:opacity-50 focus:ring-1 focus:ring-[#7A9E7E] group"
                                >
                                    {isSubmitting ? "Saving..." : (
                                        <span className="flex items-center space-x-2">
                                            <span>Add to Knowledge Bank</span>
                                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
