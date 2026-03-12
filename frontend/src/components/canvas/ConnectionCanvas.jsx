import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from '../../context/SessionContext';

import HighlightPanel from './HighlightPanel';
import CanvasCard from './CanvasCard';
import ConnectorLayer from './ConnectorLayer';
import CanvasToolbar from './CanvasToolbar';

export default function ConnectionCanvas() {
  const { conflictId } = useParams();
  const navigate = useNavigate();
  const { notes, sideA, sideB, setSession } = useSession();

  // If page reloaded, verify session exists
  useEffect(() => {
    if (!notes || notes.length === 0) {
      navigate('/');
    }
  }, [notes, navigate]);

  // View State
  const [mode, setMode] = useState('move'); // 'move' or 'connect'
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Data State
  const [cards, setCards] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [maxZIndex, setMaxZIndex] = useState(10);
  
  // Connection drawing state
  const [activeDrawStart, setActiveDrawStart] = useState(null); // { cardId, edge, mousePosition }

  // Canvas Refs
  const canvasRef = useRef(null);
  
  // DND Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag to trigger DND (prevents accidental clicks breaking)
      },
    })
  );

  if (!notes || notes.length === 0) return null;

  // --- PANNING LOGIC ---
  const handleCanvasMouseDown = (e) => {
    // Only pan if clicking directly on the canvas background in move mode
    if (mode === 'move' && e.target === canvasRef.current) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }

    // Update drawing connector line
    if (mode === 'connect' && activeDrawStart) {
      // Need absolute mouse position relative to SVG, minus panOffset for visual rendering is handled in SVG
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      
      setActiveDrawStart(prev => ({
        ...prev,
        mousePosition: { x: rawX, y: rawY }
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    if (activeDrawStart) {
      setActiveDrawStart(null); // Cancel connection if dropped in empty space
    }
  };

  // --- DND KIT LOGIC (Dropping from Panel to Canvas) ---
  const handleDragEnd = (event) => {
    const { active, over, delta } = event;
    
    // Only process if dragged from panel over the canvas dropzone
    if (active.data.current?.type === 'highlight' && over && over.id === 'canvas-droppable') {
      const highlight = active.data.current.highlight;
      
      // Calculate drop position
      // The event doesn't give absolute drop coordinates easily relative to the canvas,
      // so we use a center screen heuristic or window event client coordinates if available.
      // DndKit `delta` gives offset from origin. We'll dump it at the center of the canvas
      // minus pan offset, then rely on the user dragging it locally.
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const dropX = (canvasRect.width / 2) - panOffset.x - 100; // rough center
      const dropY = (canvasRect.height / 2) - panOffset.y - 50; 

      const newCard = {
        id: `card-${uuidv4()}`,
        highlightId: highlight.uniqueId,
        tag: highlight.tag,
        quote: highlight.quote,
        source: highlight.source,
        note: highlight.note,
        position: { x: Math.round(dropX / 8) * 8, y: Math.round(dropY / 8) * 8 },
        zIndex: maxZIndex + 1
      };

      setCards([...cards, newCard]);
      setMaxZIndex(prev => prev + 1);
    }
  };

  // --- CARD ACTIONS ---
  const handleRemoveCard = (id) => {
    setCards(cards.filter(c => c.id !== id));
    setConnectors(connectors.filter(c => c.fromCardId !== id && c.toCardId !== id));
  };

  const handlePositionChange = (id, newPosition) => {
    setCards(cards.map(c => c.id === id ? { ...c, position: newPosition } : c));
  };

  const handleBringToFront = (id) => {
    setMaxZIndex(prev => prev + 1);
    setCards(cards.map(c => c.id === id ? { ...c, zIndex: maxZIndex + 1 } : c));
  };

  const handleUpdateNote = (id, newText) => {
    setCards(cards.map(c => c.id === id ? { ...c, quote: newText } : c));
  };

  // --- CONNECTION LOGIC ---
  const handleConnectStart = (cardId, edge) => {
    // Wait for mouse move event to get position, temp initialize
    setActiveDrawStart({ cardId, edge, mousePosition: { x: -1000, y: -1000 } });
  };

  const handleConnectEnd = (cardId, edge) => {
    if (activeDrawStart && activeDrawStart.cardId !== cardId) {
      // Create connection
      const newConn = {
        id: `conn-${uuidv4()}`,
        fromCardId: activeDrawStart.cardId,
        fromEdge: activeDrawStart.edge,
        toCardId: cardId,
        toEdge: edge
      };
      
      // Check for exact duplicates
      const exists = connectors.some(c => 
        (c.fromCardId === newConn.fromCardId && c.toCardId === newConn.toCardId) ||
        (c.fromCardId === newConn.toCardId && c.toCardId === newConn.fromCardId)
      );

      if (!exists) {
        setConnectors([...connectors, newConn]);
      }
    }
    setActiveDrawStart(null);
  };

  const handleRemoveConnector = (id) => {
    setConnectors(connectors.filter(c => c.id !== id));
  };

  // --- TOOLBAR ACTIONS ---
  const handleAddNoteCard = () => {
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (canvasRect.width / 2) - panOffset.x - 100;
    const y = (canvasRect.height / 2) - panOffset.y - 50;

    const newCard = {
      id: `card-${uuidv4()}`,
      highlightId: null,
      tag: 'note',
      quote: '',
      source: 'Student Note',
      position: { x: Math.round(x / 8) * 8, y: Math.round(y / 8) * 8 },
      zIndex: maxZIndex + 1
    };
    setCards([...cards, newCard]);
    setMaxZIndex(prev => prev + 1);
  };

  const handleResetCanvas = () => {
    setCards([]);
    setConnectors([]);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleFitToView = () => {
    if (cards.length === 0) return;
    
    // Find bounding box of all cards
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach(c => {
      minX = Math.min(minX, c.position.x);
      minY = Math.min(minY, c.position.y);
      maxX = Math.max(maxX, c.position.x + 210);
      maxY = Math.max(maxY, c.position.y + 160);
    });

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPanOffset({
      x: (canvasRect.width / 2) - centerX,
      y: (canvasRect.height / 2) - centerY
    });
  };

  const handleGoBack = () => {
    if (cards.length > 0) {
      if (!window.confirm("Your canvas will be lost. Go back?")) return;
    }
    navigate(`/conflict/${conflictId}/read`);
  };

  const handleDone = () => {
    if (cards.length < 2 || connectors.length < 1) return;

    // Infer leaning logic
    let leftCount = 0;
    let rightCount = 0;

    cards.forEach(c => {
      // Relative x position + width/2 vs 0 (center of logical canvas bounds before pan)
      // Actually, since initial position is relative to origin at top-left of canvas DOM without pan:
      const canvasCenter = canvasRef.current.getBoundingClientRect().width / 2;
      const absoluteX = c.position.x + panOffset.x + 105; // 105 is half card width
      
      if (absoluteX < canvasCenter) leftCount++;
      else rightCount++;
    });

    let leaning = "balanced";
    if (leftCount >= rightCount + 2) leaning = "side_a";
    if (rightCount >= leftCount + 2) leaning = "side_b";

    setSession({
      canvasData: {
        cards,
        connectors,
        inferredLeaning: leaning,
        stats: { leftCount, rightCount }
      }
    });

    navigate(`/conflict/${conflictId}/transition`);
  };

  const canComplete = cards.length >= 2 && connectors.length >= 1;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden bg-[#0D0C0A]">
        
        {/* Left Panel */}
        <HighlightPanel highlights={notes} canvasCards={cards} />

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col relative">
          
          {/* Top Bar */}
          <div className="h-[52px] bg-[#0D0C0A] border-b border-[#2A2825] flex items-center justify-between px-4 z-30 shrink-0">
            <button 
              onClick={handleGoBack}
              className="font-mono text-xs text-textMuted hover:text-white transition-colors uppercase tracking-widest focus:outline-none"
            >
              ← Back
            </button>

            <div className="font-mono text-xs text-textMuted uppercase tracking-widest flex items-center gap-6">
              <span className="hidden md:block opacity-60">
                {sideA} vs {sideB}
              </span>
              
              <div className="flex bg-[#141210] border border-[#2A2825]">
                <button
                  onClick={() => setMode('move')}
                  className={`px-4 py-1.5 transition-colors focus:outline-none ${mode === 'move' ? 'bg-[#C8963E] text-[#0D0C0A]' : 'text-textMuted hover:text-white'}`}
                >
                  ↖ Move
                </button>
                <div className="w-[1px] bg-[#2A2825]"></div>
                <button
                  onClick={() => setMode('connect')}
                  className={`px-4 py-1.5 transition-colors focus:outline-none ${mode === 'connect' ? 'bg-[#C8963E] text-[#0D0C0A]' : 'text-textMuted hover:text-white'}`}
                >
                  → Connect
                </button>
              </div>
            </div>

            <button
              onClick={handleDone}
              disabled={!canComplete}
              className={`font-mono text-xs uppercase tracking-widest transition-colors focus:outline-none ${canComplete ? 'text-amber hover:underline underline-offset-4' : 'text-textMuted/40 cursor-not-allowed'}`}
            >
              Done →
            </button>
          </div>

          {/* Canvas Viewport */}
          <div 
            ref={canvasRef}
            className={`
              flex-1 relative overflow-hidden bg-[#0D0C0A]
              ${mode === 'move' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}
            `}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {/* Dot Grid Layer - Translates with pan */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.15]"
              style={{
                backgroundImage: 'radial-gradient(#C8963E 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
                transition: isPanning ? 'none' : 'background-position 0.1s ease-out'
              }}
            ></div>

            {/* Logical Drop Zones (Visual Guides) */}
            <div className="absolute inset-0 pointer-events-none flex p-12 gap-12 z-0 opacity-15">
              <div className="flex-1 border border-dashed border-[#2A2825] flex flex-col items-center justify-center p-8 transition-colors duration-500">
                <span className="font-mono text-[11px] text-white uppercase tracking-widest mb-2">{sideA}</span>
                <span className="font-serif italic text-sm text-textMuted text-center">Drop evidence that supports this side</span>
              </div>
              <div className="flex-1 border border-dashed border-[#2A2825] flex flex-col items-center justify-center p-8 transition-colors duration-500">
                <span className="font-mono text-[11px] text-white uppercase tracking-widest mb-2">{sideB}</span>
                <span className="font-serif italic text-sm text-textMuted text-center">Drop evidence that supports this side</span>
              </div>
            </div>

            {/* DndKit Droppable Target (Full Canvas) */}
            <DroppableLayer>
              {/* Connector SVG Layer */}
              <ConnectorLayer 
                cards={cards}
                connectors={connectors}
                activeDrawStart={activeDrawStart}
                onRemoveConnector={handleRemoveConnector}
                panOffset={panOffset}
              />

              {/* Panned Cards Container */}
              <div 
                className="absolute inset-0 pointer-events-none"
              >
                <div 
                  className="absolute inset-0 w-full h-full pointer-events-auto origin-top-left"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                  }}
                >
                  {cards.map(card => (
                    <CanvasCard 
                      key={card.id}
                      card={card}
                      mode={mode}
                      onRemove={handleRemoveCard}
                      onPositionChange={handlePositionChange}
                      onBringToFront={handleBringToFront}
                      onUpdateNote={handleUpdateNote}
                      onConnectStart={handleConnectStart}
                      onConnectEnd={handleConnectEnd}
                      isDrawingConnection={!!activeDrawStart}
                      panOffset={panOffset}
                    />
                  ))}
                </div>
              </div>
            </DroppableLayer>

          </div>

          <CanvasToolbar 
            onAddNoteCard={handleAddNoteCard}
            onResetCanvas={handleResetCanvas}
            onFitToView={handleFitToView}
          />

        </div>
      </div>
    </DndContext>
  );
}

// Droppable wrapper required by DndKit to receive drops
import { useDroppable } from '@dnd-kit/core';

function DroppableLayer({ children }) {
  const { setNodeRef } = useDroppable({
    id: 'canvas-droppable',
  });

  return (
    <div ref={setNodeRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none">
      {children}
    </div>
  );
}
