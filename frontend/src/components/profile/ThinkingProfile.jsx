import { useMemo } from 'react';
import { getConflictInfoFromQuestion } from './ProfileThemeMatcher';

export default function ThinkingProfile({ sessions }) {
    
    // Aggregate metadata
    const { strongThemes, argumentStrengths, pointsToWorkOn } = useMemo(() => {
        const themeScores = {};
        const strengthsMap = {};
        const challengesMap = {};

        sessions.forEach(s => {
            const { themeId, theme } = getConflictInfoFromQuestion(s.question);
            
            // Weight theme by depth
            if (!themeScores[themeId]) {
                themeScores[themeId] = { id: themeId, label: theme, score: 0 };
            }
            themeScores[themeId].score += (s.turn || 1);

            // Aggregate Explicit AI Metadata Strengths / Challenges
            const snap = s.blueprint_snapshot;
            if (snap) {
                if (snap.student_strengths) {
                    snap.student_strengths.forEach(str => {
                        strengthsMap[str] = (strengthsMap[str] || 0) + 1;
                    });
                }
                if (snap.challenge_patterns) {
                    snap.challenge_patterns.forEach(c => {
                        challengesMap[c] = (challengesMap[c] || 0) + 1;
                    });
                }
            }
        });

        // Sort descending
        const topThemes = Object.values(themeScores).sort((a,b) => b.score - a.score).slice(0, 3);
        
        // Return pure sorted arrays of keys
        const sortedStrengths = Object.keys(strengthsMap).sort((a,b) => strengthsMap[b] - strengthsMap[a]).slice(0, 3);
        const sortedChallenges = Object.keys(challengesMap).sort((a,b) => challengesMap[b] - challengesMap[a]).slice(0, 3);

        return { strongThemes: topThemes, argumentStrengths: sortedStrengths, pointsToWorkOn: sortedChallenges };
    }, [sessions]);

    return (
        <div className="flex flex-col md:flex-row gap-8 w-full">
            {/* Strong Themes */}
            <div className="flex-1 bg-background/50 border border-borderDark/30 p-6 flex flex-col">
                <h3 className="text-xs font-mono uppercase tracking-widest text-amber/80 mb-5 pb-2 border-b border-borderDark/40">Demonstrated Strengths</h3>
                {argumentStrengths.length > 0 ? (
                    <ul className="space-y-4 mb-8">
                        {argumentStrengths.map((str, idx) => (
                            <li key={idx} className="flex items-start text-sm font-serif">
                                <span className="text-amber mt-1 mr-3 text-[10px]">✦</span>
                                <span className="text-textDefault/90 leading-snug">{str}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs font-mono text-textMuted/40 italic mb-8">No formal strengths confirmed yet. Keep arguing.</p>
                )}

                <h3 className="text-xs font-mono uppercase tracking-widest text-[#29d661]/80 mb-5 pb-2 border-b border-borderDark/40">Strong Domains</h3>
                {strongThemes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {strongThemes.map((t, idx) => (
                            <span key={idx} className="px-3 py-1 bg-[#29d661]/10 border border-[#29d661]/30 text-[#29d661]/90 text-[10px] font-mono tracking-wider uppercase">
                                {t.label}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs font-mono text-textMuted/40 italic">Start exploring themes to see your domains.</p>
                )}
            </div>

            {/* Points to Work On */}
            <div className="flex-1 bg-[#1A1814]/50 border border-borderDark/30 p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-textMuted mb-5 pb-2 border-b border-borderDark/40">Areas to Develop</h3>
                
                {pointsToWorkOn.length > 0 ? (
                    <ul className="space-y-4">
                        {pointsToWorkOn.map((pt, idx) => (
                            <li key={idx} className="flex items-start text-sm font-serif group">
                                <span className="text-textMuted/40 mt-1 mr-3 text-[10px] opacity-60">△</span>
                                <span className="text-textDefault/80 leading-snug group-hover:text-textDefault transition-colors">{pt}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs font-mono text-textMuted/40 italic">No consistent challenge patterns emerged yet. Keep engaging deeply.</p>
                )}
            </div>

        </div>
    );
}
