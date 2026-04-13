import { useNavigate } from 'react-router-dom';
import { getConflictInfoFromQuestion } from './ProfileThemeMatcher';

export default function BlueprintCard({ session }) {
    const navigate = useNavigate();
    const { theme, conflictTitle } = getConflictInfoFromQuestion(session.question);
    
    const isCompleted = session.is_complete;
    const thesis = session.blueprint_snapshot?.thesis;
    const date = new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return (
        <div 
            onClick={() => navigate(`/test/${session.session_id}`)}
            className={`group relative p-5 border cursor-pointer transition-all duration-300 flex flex-col h-full ${
                isCompleted 
                    ? 'border-amber/30 bg-background hover:bg-[#1A1814] hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:border-amber/60' 
                    : 'border-borderDark/40 bg-background/50 hover:border-borderDark hover:bg-background'
            }`}
        >
            {/* Header / Theme */}
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-mono tracking-widest uppercase text-textMuted/60 group-hover:text-amber/70 transition-colors">
                    {theme}
                </span>
                <span className="text-[10px] font-mono text-textMuted/40">
                    {date}
                </span>
            </div>

            {/* Title */}
            <h3 className={`font-serif text-lg leading-snug mb-4 flex-grow ${isCompleted ? 'text-textDefault group-hover:text-amber transition-colors' : 'text-textDefault/80'}`}>
                {conflictTitle}
            </h3>

            {/* Thesis preview */}
            {thesis && (
                <div className="mt-auto mb-4 border-l border-borderDark/30 pl-3">
                    <p className="text-xs font-serif italic text-textMuted/80 line-clamp-2">
                        "{thesis}"
                    </p>
                </div>
            )}

            {/* Status Footer */}
            <div className="flex items-center justify-between mt-auto">
                <span className={`text-xs font-mono uppercase tracking-widest ${isCompleted ? 'text-amber' : 'text-textMuted/60'}`}>
                    {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
                </span>
                <span className={`text-xs font-mono transition-transform duration-300 ${isCompleted ? 'text-amber group-hover:translate-x-1' : 'text-borderDark group-hover:translate-x-1'}`}>
                    →
                </span>
            </div>
            
            {/* Ambient subtle glow for completed items */}
            {isCompleted && (
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-amber/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            )}
        </div>
    );
}
