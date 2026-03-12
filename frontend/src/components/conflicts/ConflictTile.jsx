import { Link } from 'react-router-dom';

export default function ConflictTile({ conflict, index }) {
  // We use the index to stagger a CSS animation if we want
  
  return (
    <Link 
      to={`/conflict/${conflict.id}/read`}
      className="group relative w-full h-[260px] bg-[#141210] border border-[#2A2825] overflow-hidden transition-all duration-200 hover:-translate-y-[4px] hover:border-amber hover:shadow-[0_8px_32px_rgba(200,150,62,0.12)] cursor-pointer flex flex-col justify-end p-6 select-none animate-in fade-in slide-in-from-bottom-6"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Background Gradient & Pattern (since no images) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D0C0A]/40 to-[#0D0C0A]/90 transition-opacity duration-300 group-hover:opacity-80 z-0"></div>
      
      {/* Subtle abstract geometric visual to compensate for no-image */}
      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
         <div className="w-[150%] h-[150%] border-[1px] border-amber rounded-full translate-y-2/3 scale-150 group-hover:scale-[1.55] transition-transform duration-700 ease-out"></div>
      </div>
      
      {/* Amber left border that slides in on hover */}
      <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-amber -translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out z-10"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col w-full">
        {/* Top billing: Side A vs Side B */}
        <div className="flex items-center justify-between w-full mb-6">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#6B6560] group-hover:text-amber transition-colors duration-200">
            {conflict.sideA}
          </span>
          <span className="font-serif italic text-[15px] text-amber mx-2">
            vs
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-textMuted text-right">
            {conflict.sideB}
          </span>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-[#2A2825] mb-4 group-hover:bg-amber/30 transition-colors duration-200"></div>

        {/* Title and Descriptor */}
        <h3 className="font-display text-[20px] text-white leading-[1.2] mb-2 group-hover:text-amber transition-colors duration-200">
          {conflict.title}
        </h3>
        <p className="font-serif italic text-[13px] text-textMuted group-hover:text-textMuted/90">
          {conflict.descriptor}
        </p>
      </div>
    </Link>
  );
}
