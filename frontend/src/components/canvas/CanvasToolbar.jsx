import { useState } from 'react';

export default function CanvasToolbar({ onAddNoteCard, onResetCanvas, onFitToView }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center bg-[#141210]/92 backdrop-blur-sm border border-[#2A2825] px-3 py-2 z-40 select-none shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
      
      {!showConfirm ? (
        <div className="flex items-center space-x-2 font-mono text-[11px] uppercase tracking-widest">
          <button 
            onClick={onAddNoteCard}
            className="flex items-center gap-2 px-3 py-2 text-amber hover:bg-amber/10 transition-colors focus:outline-none"
          >
            <span>✦</span>
            <span>Add Note Card</span>
          </button>
          
          <div className="w-[1px] h-4 bg-[#2A2825]"></div>
          
          <button 
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-textMuted hover:text-white transition-colors focus:outline-none"
          >
            <span>↺</span>
            <span>Reset Canvas</span>
          </button>
          
          <div className="w-[1px] h-4 bg-[#2A2825]"></div>
          
          <button 
            onClick={onFitToView}
            className="flex items-center gap-2 px-3 py-2 text-textMuted hover:text-white transition-colors focus:outline-none"
          >
            <span>⤢</span>
            <span>Fit to View</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-4 font-mono text-[11px] uppercase tracking-widest px-2 py-1 animate-in fade-in zoom-in-95 duration-200">
          <span className="text-[#E07070]">Clear all cards?</span>
          <div className="flex space-x-2">
            <button 
              onClick={() => {
                onResetCanvas();
                setShowConfirm(false);
              }}
              className="text-amber hover:underline underline-offset-4 px-2 focus:outline-none"
            >
              Yes
            </button>
            <button 
              onClick={() => setShowConfirm(false)}
              className="text-textMuted hover:text-white px-2 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
