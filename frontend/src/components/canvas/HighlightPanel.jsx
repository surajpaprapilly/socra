import { useDraggable } from '@dnd-kit/core';

const TAG_COLORS = {
  'Key Argument': 'text-amber',
  'Surprising Fact': 'text-white/80',
  'Use in Essay': 'text-[#7A9E7E]', // sage green
  'Still Confused': 'text-[#E07070]' // muted red
};

const TAG_ICONS = {
  'Key Argument': '✦',
  'Surprising Fact': '◈',
  'Use in Essay': '⚡',
  'Still Confused': '?'
};

function PanelCard({ highlight, index, isPlaced }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `highlight-${index}`,
    data: {
      type: 'highlight',
      highlight,
    }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        bg-[#1A1814] border border-[#2A2825] p-4 flex flex-col gap-2 
        select-none cursor-grab active:cursor-grabbing hover:border-amber/50 transition-colors
        ${isPlaced ? 'opacity-35' : 'opacity-100'}
        ${isDragging ? 'opacity-50 scale-95 border-amber shadow-lg z-50' : ''}
      `}
    >
      <div className={`font-mono text-[10px] tracking-widest uppercase flex items-center gap-2 ${TAG_COLORS[highlight.tag] || 'text-amber'}`}>
        <span>{TAG_ICONS[highlight.tag] || '✦'}</span>
        <span>{highlight.tag}</span>
      </div>
      
      <p className="font-serif italic text-xs text-white/90 leading-relaxed line-clamp-4">
        "{highlight.quote}"
      </p>
      
      <div className="font-mono text-[10px] text-[#6B6560] mt-1 truncate">
        — {highlight.source}
      </div>
    </div>
  );
}

export default function HighlightPanel({ highlights, canvasCards }) {
  
  // Prepare an array of flattened highlights from notes
  // structure: notes = [ { article_source, free_notes, highlights: [ { tag, quote, note } ] } ]
  const flatHighlights = highlights.reduce((acc, noteCtx) => {
    if (!noteCtx || !noteCtx.highlights) return acc;
    const hls = noteCtx.highlights.map(h => ({
      ...h,
      source: noteCtx.article_source,
      // Create a unique deterministic ID for tracking placed state
      uniqueId: `${noteCtx.article_source.substring(0, 5)}-${h.quote.substring(0, 20)}`
    }));
    return [...acc, ...hls];
  }, []);

  return (
    <div className="w-[260px] h-full bg-[#0D0A08] border-r border-[#2A2825] flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      <div className="p-4 border-b border-[#2A2825] bg-gradient-to-b from-[#14120E] to-transparent">
        <h2 className="font-mono text-[11px] tracking-widest uppercase text-textMuted mb-1">
          YOUR HIGHLIGHTS
        </h2>
        <p className="font-serif italic text-xs text-amber/70">
          drag onto canvas →
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#2A2825] scrollbar-track-transparent pb-24">
        {flatHighlights.length === 0 ? (
          <div className="text-center py-8 px-2 font-mono text-[11px] text-textMuted/60 leading-relaxed border border-dashed border-[#2A2825] p-4">
            No highlights yet.<br/><br/>
            You can still add blank note cards to the canvas.
          </div>
        ) : (
          flatHighlights.map((hl, idx) => {
            // Check if this specific quote is already on the canvas multiple times
            const isPlaced = canvasCards.some(c => c.quote === hl.quote);
            
            return (
              <PanelCard 
                key={idx} 
                highlight={hl} 
                index={idx} 
                isPlaced={isPlaced} 
              />
            );
          })
        )}
      </div>
    </div>
  );
}
