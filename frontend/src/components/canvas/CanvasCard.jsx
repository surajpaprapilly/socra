import { useState, useRef, useEffect } from 'react';

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

export default function CanvasCard({
  card,
  mode,
  onRemove,
  onPositionChange,
  onBringToFront,
  onConnectStart,
  onConnectEnd,
  isDrawingConnection,
  panOffset,
  onUpdateNote
}) {
  const cardRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showFullQuote, setShowFullQuote] = useState(false);
  
  // Track drag state
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  // Native drag logic (for "Move" mode)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      // Calculate new position, snapping to 8px grid
      const rawX = initialPosRef.current.x + dx;
      const rawY = initialPosRef.current.y + dy;
      
      const snapX = Math.round(rawX / 8) * 8;
      const snapY = Math.round(rawY / 8) * 8;

      onPositionChange(card.id, { x: snapX, y: snapY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, card.id, onPositionChange]);

  const handleMouseDown = (e) => {
    if (mode !== 'move') return;
    // Don't drag if clicking textarea or remove btn
    if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'button') return;
    
    e.stopPropagation();
    onBringToFront(card.id);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { x: card.position.x, y: card.position.y };
    setIsDragging(true);
  };

  const handleDoubleClick = (e) => {
    if (e.target.tagName.toLowerCase() === 'textarea') return;
    if (card.tag !== 'note') setShowFullQuote(true);
  };

  const isNote = card.tag === 'note';

  // connection points logic
  const renderConnectors = () => {
    if (mode !== 'connect') return null;
    
    const edges = ['top', 'right', 'bottom', 'left'];
    
    return edges.map(edge => {
      const positionClasses = {
        top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-[1px]',
        right: 'right-0 top-1/2 -translate-y-1/2 translate-x-[1px]',
        bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-[1px]',
        left: 'left-0 top-1/2 -translate-y-1/2 -translate-x-[1px]'
      };

      return (
        <div
          key={edge}
          className={`
            absolute w-[10px] h-[10px] bg-amber rounded-full z-20 cursor-crosshair
            opacity-0 hover:opacity-100 hover:scale-150 transition-all duration-150
            ${positionClasses[edge]}
          `}
          onMouseDown={(e) => {
            e.stopPropagation();
            onConnectStart(card.id, edge);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            if (isDrawingConnection) {
              onConnectEnd(card.id, edge);
            }
          }}
          onMouseEnter={(e) => {
            if (isDrawingConnection) e.target.classList.add('opacity-100', 'scale-150');
          }}
          onMouseLeave={(e) => {
            if (isDrawingConnection) e.target.classList.remove('opacity-100', 'scale-150');
          }}
        />
      );
    });
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`
          absolute w-[210px] min-h-[110px] bg-[#1C1A17] overflow-visible
          flex flex-col select-none transition-shadow
          ${isDragging ? 'shadow-[0_12px_40px_rgba(0,0,0,0.6)] cursor-grabbing scale-[1.04] rotate-[1.5deg] z-50' : 'shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-grab hover:border-amber'}
          ${isNote ? 'border-[#3A3530]' : 'border-[#2A2825]'}
          border
        `}
        style={{
          left: `${card.position.x}px`,
          top: `${card.position.y}px`,
          zIndex: isDragging ? 9999 : card.zIndex,
          transform: !isDragging && 'scale(1)',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out, border-color 0.2s',
          pointerEvents: isDrawingConnection ? 'auto' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Connection Hover Overlay to reveal dots */}
        {mode === 'connect' && (
          <div className="absolute inset-[-12px] z-10 opacity-0 hover:opacity-100 pointer-events-none">
             <div className="absolute inset-[12px] border border-transparent pointer-events-auto">
                {renderConnectors()}
             </div>
          </div>
        )}

        {/* Content */}
        <div className="p-3 relative z-0 flex flex-col h-full pointer-events-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            {!isNote ? (
              <div className={`font-mono text-[10px] tracking-widest uppercase flex items-center gap-2 ${TAG_COLORS[card.tag] || 'text-textMuted'}`}>
                <span>{TAG_ICONS[card.tag]}</span>
                <span className="truncate">{card.tag}</span>
              </div>
            ) : (
              <div className="font-mono text-[10px] tracking-widest uppercase text-textMuted/60">
                Note Card
              </div>
            )}
            
            <button
              onClick={() => onRemove(card.id)}
              className="text-[#6B6560] hover:text-amber transition-colors text-xs p-1"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          {isNote ? (
            <textarea
              className="flex-1 w-full bg-transparent font-serif italic text-[13px] text-white/90 placeholder-textMuted/40 resize-y min-h-[60px] focus:outline-none"
              placeholder="Add your thought..."
              value={card.quote}
              onChange={(e) => onUpdateNote(card.id, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="font-serif italic text-[13px] text-white leading-relaxed line-clamp-[6] mb-2 pointer-events-none">
              "{card.quote}"
            </p>
          )}

          {/* Footer */}
          {!isNote && (
            <div className="mt-auto font-mono text-[10px] text-[#6B6560] truncate pt-2 pointer-events-none border-t border-[#2A2825]/40">
              — {card.source}
            </div>
          )}
        </div>
      </div>

      {/* Full Quote Modal */}
      {showFullQuote && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setShowFullQuote(false)}
        >
          <div 
            className="bg-[#1C1A17] border border-[#2A2825] p-8 max-w-[600px] w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowFullQuote(false)}
              className="absolute top-4 right-4 text-textMuted hover:text-white font-mono text-sm"
            >
              [ ✕ Close ]
            </button>
            
            <div className={`font-mono text-[11px] tracking-widest uppercase flex items-center gap-2 mb-6 ${TAG_COLORS[card.tag] || 'text-textMuted'}`}>
              <span>{TAG_ICONS[card.tag]}</span>
              <span>{card.tag}</span>
            </div>
            
            <p className="font-serif italic text-lg text-white leading-relaxed mb-6">
              "{card.quote}"
            </p>
            
            {card.note && (
              <div className="bg-[#141210] border-l-2 border-amber p-4 mb-4">
                <p className="font-mono text-xs text-textMuted uppercase mb-2">Student Note:</p>
                <p className="font-serif text-sm text-amber/80">"{card.note}"</p>
              </div>
            )}
            
            <div className="font-mono text-xs text-[#6B6560] pt-4 border-t border-[#2A2825]">
              Source: {card.source}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
