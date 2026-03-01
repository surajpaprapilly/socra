import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BankView() {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTag, setActiveTag] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState(new Set());
    const navigate = useNavigate();

    useEffect(() => {
        fetchBankData();
    }, []);

    const fetchBankData = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/bank');
            if (response.ok) {
                const data = await response.json();
                setEntries(data.entries || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (id) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedIds(newExpanded);
    };

    const filteredEntries = entries.filter(entry => {
        const matchesTag = activeTag ? entry.insight_tags.includes(activeTag) : true;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === "" ||
            entry.gp_question.toLowerCase().includes(searchLower) ||
            entry.summary.toLowerCase().includes(searchLower);
        return matchesTag && matchesSearch;
    });

    const uniqueTags = new Set();
    entries.forEach(e => e.insight_tags.forEach(t => uniqueTags.add(t)));

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-64px)] flex justify-center items-center">
                <span className="animate-pulse text-amber tracking-widest font-mono uppercase text-sm">Loading Repository...</span>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center p-12 animate-in fade-in duration-700">
                <h1 className="font-display text-4xl text-textDefault mb-2">
                    Knowledge Bank
                </h1>
                <p className="font-mono text-textMuted text-xs uppercase tracking-widest mb-16">
                    0 entries across 0 topics
                </p>

                <div className="text-center space-y-8">
                    <p className="font-serif text-textMuted/60 leading-relaxed max-w-sm">
                        Your Knowledge Bank is empty.<br />
                        Start with Learn Mode to begin building it.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-3 bg-transparent border border-amber text-amber font-mono tracking-widest uppercase text-xs transition-all duration-300 hover:bg-amber/10 focus:outline-none focus:ring-1 focus:ring-amber"
                    >
                        [ Explore a GP question → ]
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center py-12 px-6">
            <div className="max-w-[800px] w-full flex flex-col space-y-12">

                <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    <h1 className="font-display text-4xl md:text-5xl text-textDefault tracking-tight">
                        Knowledge Bank
                    </h1>
                    <p className="font-mono text-textMuted text-xs uppercase tracking-[0.2em]">
                        {entries.length} entries across {uniqueTags.size} topics
                    </p>
                </div>

                <div className="flex flex-col space-y-6 pt-4 animate-in fade-in duration-1000">
                    <div className="w-full relative group">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search your synthesised knowledge..."
                            className="w-full bg-transparent border-b border-borderDark text-sm text-textDefault placeholder-textMuted/40 focus:outline-none focus:border-amber transition-colors duration-300 py-3 font-mono"
                        />
                    </div>

                    {activeTag && (
                        <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-textMuted uppercase">Filtering by:</span>
                            <button
                                onClick={() => setActiveTag(null)}
                                className="font-mono text-[10px] bg-amber/10 text-amber border border-amber/30 px-3 py-1 uppercase tracking-widest flex items-center space-x-2 hover:bg-amber/20 transition-colors"
                            >
                                <span>[{activeTag}]</span>
                                <span className="text-xs">✕</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-8 pb-24">
                    {filteredEntries.map((entry, idx) => {
                        const isExpanded = expandedIds.has(entry.id);
                        const dateSlug = new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                        return (
                            <div
                                key={entry.id}
                                className="bg-[#141210] border border-[#2A2825] p-6 md:p-8 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 overflow-hidden relative"
                                style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                            >
                                <div className="flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-widest text-textMuted/60">
                                    <span>{dateSlug}</span>
                                    <span>{entry.insight_tags.length} tags</span>
                                </div>

                                <h3 className="font-display text-2xl text-amber italic mb-6 leading-relaxed">
                                    "{entry.gp_question}"
                                </h3>

                                <div className={`font-serif text-sm text-textDefault leading-relaxed mb-6 transition-all duration-500 ${isExpanded ? '' : 'line-clamp-2 text-textMuted'}`}>
                                    {entry.summary}
                                </div>

                                {isExpanded && entry.follow_up_response && (
                                    <div className="pl-6 border-l border-amber/30 mb-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <p className="font-serif text-sm text-textMuted leading-relaxed">
                                            <span className="text-amber">◆ </span>
                                            <span className="italic text-textMuted/70">Follow-up synthesis:</span>
                                        </p>
                                        <p className="font-serif text-sm text-textDefault leading-relaxed">
                                            {entry.follow_up_response}
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {entry.insight_tags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={(e) => { e.stopPropagation(); setActiveTag(tag); }}
                                            className={`font-mono text-[10px] px-2 py-1 uppercase tracking-widest transition-colors ${activeTag === tag ? 'bg-amber text-[#141210]' : 'text-amber/80 border border-amber/30 hover:bg-amber/10'}`}
                                        >
                                            [{tag}]
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mt-8 pt-6 border-t border-borderDark/30">
                                    <div className="flex flex-col space-y-3 mb-2 md:mb-0">
                                        <span className="font-mono text-[10px] text-textMuted uppercase tracking-widest">
                                            Sources Consulted:
                                        </span>
                                        <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs font-mono text-textMuted">
                                            {entry.readings.map((r, i) => (
                                                <span key={i} className="flex items-center">
                                                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber transition-colors underline decoration-borderDark underline-offset-4">
                                                        {r.source}
                                                    </a>
                                                    {i < entry.readings.length - 1 && <span className="mx-2 opacity-50">·</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleExpand(entry.id)}
                                        className="font-mono text-xs text-amber uppercase tracking-widest hover:text-amber/80 transition-colors whitespace-nowrap self-start md:self-end"
                                    >
                                        {isExpanded ? "[ Collapse entry ↑ ]" : "[ Read full entry → ]"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
