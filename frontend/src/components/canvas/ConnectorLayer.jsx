import { useState, useEffect } from 'react';

export default function ConnectorLayer({
  cards,
  connectors,
  activeDrawStart, // { cardId, edge, mousePosition: {x,y} }
  onRemoveConnector,
  panOffset
}) {
  
  // Gets absolute coordinates for a dot based on the card box + edge
  const getDotPos = (card, edge) => {
    // Card matches w-[210px] min-h-[110px], we need actual rendered height if possible,
    // but React doesn't easily let us read DOM height from a pure SVG layer without refs to all cards.
    // For standard cards, we can assume width=210 and height=130 on average, or pass height from state.
    // To solve this properly without resyncing height, we use an approximation or force Card to sync height.
    // Assuming standard sizes: w=210, h=130 for highlights
    const w = 210;
    const h = card.tag === 'note' ? 110 : 160; 
    
    let x = card.position.x;
    let y = card.position.y;
    
    // Add pan offset immediately so the SVG path aligns with the CSS transformed cards
    x += panOffset.x;
    y += panOffset.y;
    
    switch (edge) {
      case 'top': return { x: x + w/2, y: y };
      case 'right': return { x: x + w, y: y + h/2 };
      case 'bottom': return { x: x + w/2, y: y + h };
      case 'left': return { x: x, y: y + h/2 };
      default: return { x: x + w/2, y: y + h/2 };
    }
  };

  const getBezierPath = (p1, p2, edge1, edge2) => {
    // Control points offset
    const OFFSET = 80;
    
    let cp1x = p1.x, cp1y = p1.y;
    let cp2x = p2.x, cp2y = p2.y;
    
    switch(edge1) {
      case 'top': cp1y -= OFFSET; break;
      case 'right': cp1x += OFFSET; break;
      case 'bottom': cp1y += OFFSET; break;
      case 'left': cp1x -= OFFSET; break;
    }
    
    switch(edge2) {
      case 'top': cp2y -= OFFSET; break;
      case 'right': cp2x += OFFSET; break;
      case 'bottom': cp2y += OFFSET; break;
      case 'left': cp2x -= OFFSET; break;
    }
    
    // Straight line if actively drawing to mouse
    if (!edge2) {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }
    
    return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  };

  return (
    <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="#C8963E" />
        </marker>
        
        {/* Hover marker for active connection line */}
        <marker id="arrowhead-hover" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="#F0C060" />
        </marker>
      </defs>

      {/* Render permanent connectors */}
      {connectors.map(conn => {
        const fromCard = cards.find(c => c.id === conn.fromCardId);
        const toCard = cards.find(c => c.id === conn.toCardId);
        
        if (!fromCard || !toCard) return null;
        
        const p1 = getDotPos(fromCard, conn.fromEdge);
        const p2 = getDotPos(toCard, conn.toEdge);
        const d = getBezierPath(p1, p2, conn.fromEdge, conn.toEdge);
        
        // Midpoint for the remove button
        // Simple linear approximation of midpoint for bezier
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        return (
          <g key={conn.id} className="group pointer-events-auto">
            {/* Invisible thicker path to make hovering easier */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              className="cursor-pointer"
              onClick={() => onRemoveConnector(conn.id)}
            />
            {/* Visible path */}
            <path
              d={d}
              fill="none"
              stroke="#C8963E"
              strokeWidth="1.5"
              strokeOpacity="0.65"
              markerEnd="url(#arrowhead)"
              className="transition-all duration-200 group-hover:strokeOpacity-100 group-hover:stroke-[#F0C060] group-hover:stroke-[2px] group-hover:marker-[#F0C060]"
              style={{
                strokeDasharray: '1000',
                strokeDashoffset: '1000',
                animation: 'drawPath 0.3s ease-out forwards'
              }}
            />
            {/* Remove button X circle that appears on hover */}
            <g 
              transform={`translate(${midX}, ${midY})`} 
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              onClick={() => onRemoveConnector(conn.id)}
            >
              <circle cx="0" cy="0" r="10" fill="#2A2825" stroke="#C8963E" strokeWidth="1" />
              <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#C8963E" strokeWidth="1.5" />
            </g>
          </g>
        );
      })}

      {/* Render active dragging line */}
      {activeDrawStart && (
        <path
          d={getBezierPath(
            getDotPos(cards.find(c => c.id === activeDrawStart.cardId), activeDrawStart.edge),
            activeDrawStart.mousePosition,
            activeDrawStart.edge,
            null
          )}
          fill="none"
          stroke="#C8963E"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          strokeDasharray="4 4"
        />
      )}
      
      <style>{`
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}
