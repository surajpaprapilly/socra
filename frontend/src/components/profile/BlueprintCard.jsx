import { useNavigate } from 'react-router-dom';

export default function BlueprintCard({ session }) {
    const navigate = useNavigate();
    const isCompleted = session.is_complete;
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
            {/* Date */}
            <div className="flex justify-end mb-3">
                <span className="text-[10px] font-mono text-textMuted/40">
                    {date}
                </span>
            </div>

            {/* Question */}
            <p className={`font-serif text-base leading-snug flex-grow ${isCompleted ? 'text-textDefault group-hover:text-amber transition-colors' : 'text-textDefault/80'}`}>
                {session.question}
            </p>

            {/* Status Footer */}
            <div className="flex items-center justify-between mt-4">
                <span className={`text-xs font-mono uppercase tracking-widest ${isCompleted ? 'text-amber' : 'text-textMuted/60'}`}>
                    {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
                </span>
                <span className={`text-xs font-mono transition-transform duration-300 ${isCompleted ? 'text-amber group-hover:translate-x-1' : 'text-borderDark group-hover:translate-x-1'}`}>
                    →
                </span>
            </div>

            {isCompleted && (
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-amber/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            )}
        </div>
    );
}
