import { useMemo } from 'react';

export default function ActivityMap({ sessions }) {
    const daysVisible = 90;

    const activityData = useMemo(() => {
        const grid = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sessionMap = new Map();
        sessions.forEach(s => {
            const dateStr = new Date(s.created_at).setHours(0, 0, 0, 0);
            const currentMax = sessionMap.get(dateStr) || 0;
            sessionMap.set(dateStr, Math.max(currentMax, s.turn || 1));
        });

        for (let i = daysVisible - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const ts = d.getTime();
            grid.push({
                date: d,
                depth: sessionMap.get(ts) || 0
            });
        }
        return grid;
    }, [sessions]);

    const weeks = [];
    let currentWeek = [];
    
    activityData.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const getIntensityClass = (depth) => {
        if (depth === 0) return 'bg-[#1A1814] border border-[#24211D]';
        if (depth <= 2) return 'bg-amber/20 border border-amber/30';
        if (depth <= 4) return 'bg-amber/50 border border-amber/60';
        return 'bg-amber/90 border border-amber drop-shadow-[0_0_2px_rgba(212,175,55,0.8)]';
    };

    return (
        <div className="w-full">
            <h3 className="text-xs font-mono uppercase tracking-widest text-textMuted mb-4">Activity Map (Last 90 Days)</h3>
            <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((day, dIdx) => (
                            <div 
                                key={dIdx}
                                className={`w-3.5 h-3.5 rounded-sm transition-colors duration-300 ${getIntensityClass(day.depth)}`}
                                title={`${day.date.toLocaleDateString()}: ${day.depth > 0 ? 'Phase ' + day.depth + ' Reached' : 'No Activity'}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex justify-end items-center mt-3 gap-2 text-[10px] font-mono text-textMuted/60 uppercase tracking-widest">
                <span>Shallow</span>
                <div className="w-3 h-3 bg-[#1A1814] border border-[#24211D] rounded-sm"></div>
                <div className="w-3 h-3 bg-amber/20 border border-amber/30 rounded-sm"></div>
                <div className="w-3 h-3 bg-amber/50 border border-amber/60 rounded-sm"></div>
                <div className="w-3 h-3 bg-amber/90 border border-amber rounded-sm"></div>
                <span>Synthesis</span>
            </div>
        </div>
    );
}