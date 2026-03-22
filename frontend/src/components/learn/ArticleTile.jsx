import { useState } from 'react';

const SINGAPORE_DOMAINS = [
    "straitstimes.com",
    "channelnewsasia.com",
    "todayonline.com",
    "mothership.sg",
    "ips.nus.edu.sg"
];

export default function ArticleTile({
    reading,
    onMarkDone,
    delay = 0
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDone, setIsDone] = useState(false);

    const expandArticle = () => {
        window.open(reading.url, '_blank', 'noopener,noreferrer');
        setIsExpanded(true);
    };

    const handleCollapse = () => {
        setIsExpanded(false);
    };

    const completeTile = () => {
        setIsDone(true);
        setIsExpanded(false);
        onMarkDone();
    };

    const isSgSource = SINGAPORE_DOMAINS.some(domain => reading.url?.includes(domain));

    if (!isExpanded && !isDone) {
        return (
            <div
                className={`
                    bg-[#141210] border border-[#2A2825] p-6 relative transition-all duration-300
                    hover:-translate-y-1 hover:border-l-[3px] hover:border-l-amber hover:bg-[#1A1815] cursor-pointer animate-in fade-in slide-in-from-bottom-4 group
                `}
                style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
                onClick={expandArticle}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="font-mono text-xs text-textMuted uppercase tracking-widest flex items-center space-x-3 flex-wrap gap-y-2">
                        <span className="text-textDefault">{reading.source}</span>
                        {isSgSource && (
                            <span className="bg-[#2A2825]/50 text-amber px-2 py-0.5 border border-[#2A2825]">
                                🇸🇬 SG PERSPECTIVE
                            </span>
                        )}
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
                    [ Read Article → ]
                </div>
            </div>
        );
    }

    if (!isExpanded && isDone) {
        return (
            <div className={`bg-[#141210] border border-[#2A2825] border-l-[3px] border-l-amber p-4 relative animate-in fade-in duration-300 mb-4`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <span className="text-[#7A9E7E] text-lg">✓</span>
                        <h3 className="font-display text-lg text-textDefault">
                            {reading.title} 
                            <span className="font-mono text-xs text-textMuted uppercase tracking-widest ml-3 inline-flex items-center space-x-2 border-l border-[#2A2825] pl-3">
                                <span>{reading.source}</span>
                                {isSgSource && <span className="text-amber">🇸🇬</span>}
                            </span>
                        </h3>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`
            bg-[#141210] border border-[#2A2825] border-l-[3px] border-l-amber overflow-hidden flex flex-col mb-4
            transition-all duration-400 ease-out origin-top animate-in slide-in-from-top-2
        `}>
            <div className="p-4 border-b border-[#2A2825] flex justify-between items-center bg-[#1A1814]">
                <div>
                    <div className="font-mono text-xs text-textMuted uppercase tracking-widest flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                        <a href={reading.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber transition-colors">
                            ↗ Opened in new tab
                        </a>
                        <span>·</span>
                        <span>{reading.source}</span>
                        {isSgSource && (
                            <>
                                <span>·</span>
                                <span className="text-amber">🇸🇬 SG PERSPECTIVE</span>
                            </>
                        )}
                        <span>·</span>
                        <span>{reading.estimated_minutes}</span>
                    </div>
                    <h3 className="font-display text-xl text-textDefault leading-tight">
                        {reading.title}
                    </h3>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleCollapse}
                        className="font-mono text-xs text-textMuted hover:text-textDefault transition-colors focus:outline-none uppercase"
                    >
                        [ ✕ collapse ]
                    </button>
                </div>
            </div>

            <div className="mt-0 pb-0 bg-[#0D0C0A]">
                <button
                    onClick={completeTile}
                    className="w-full p-4 font-mono text-sm tracking-widest uppercase bg-[#C8963E] text-[#0D0C0A] hover:brightness-110 transition-all focus:outline-none"
                >
                    ✓ Done with this article →
                </button>
            </div>
        </div>
    );
}
