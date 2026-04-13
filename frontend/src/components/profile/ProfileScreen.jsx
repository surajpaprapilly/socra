import { useState, useEffect, useMemo } from 'react';
import { fetchWithAuth } from '../../lib/supabase';
import ActivityMap from './ActivityMap';
import ThinkingProfile from './ThinkingProfile';
import BlueprintCard from './BlueprintCard';
import { getConflictInfoFromQuestion } from './ProfileThemeMatcher';

export default function ProfileScreen() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const res = await fetchWithAuth('http://localhost:8000/api/sessions');
                if (res.ok) {
                    const data = await res.json();
                    setSessions(data.sessions || []);
                }
            } catch (err) {
                console.error("Error fetching sessions for profile:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, []);

    const { streaks, stats } = useMemo(() => {
        let currentStreak = 0;
        let longestStreak = 0;
        const uniqueConflicts = new Set();
        
        // Unique active dates (ignoring time)
        const activeDates = new Set();
        
        sessions.forEach(s => {
            const dateStr = new Date(s.created_at).toDateString();
            activeDates.add(dateStr);
            
            // Map conflict title for unique count
            const { conflictTitle } = getConflictInfoFromQuestion(s.question);
            uniqueConflicts.add(conflictTitle);
        });

        // Compute streak logic
        // Simplified consecutive days backwards from today
        const sortedDates = Array.from(activeDates).map(d => new Date(d)).sort((a,b) => b - a);
        
        if (sortedDates.length > 0) {
            // Very naive simplified calculation for proof of concept
            let tempStreak = 1;
            let maxTemp = 1;
            
            const today = new Date();
            today.setHours(0,0,0,0);
            
            for (let i = 0; i < sortedDates.length - 1; i++) {
                const diffTime = Math.abs(sortedDates[i] - sortedDates[i+1]);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    tempStreak++;
                    maxTemp = Math.max(maxTemp, tempStreak);
                } else if (diffDays > 1) {
                    tempStreak = 1; // broken
                }
            }
            
            // Current streak check
            const mostRecentDate = sortedDates[0];
            mostRecentDate.setHours(0,0,0,0);
            const daysSinceLast = Math.ceil(Math.abs(today - mostRecentDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLast <= 1) {
                // Determine current streak by walking back from most recent
                let cStreak = 1;
                for (let i = 0; i < sortedDates.length - 1; i++) {
                    const diffTime = Math.abs(sortedDates[i] - sortedDates[i+1]);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    if (diffDays === 1) cStreak++;
                    else break;
                }
                currentStreak = cStreak;
            } else {
                currentStreak = 0;
            }
            longestStreak = Math.max(maxTemp, currentStreak);
        }

        return { 
            streaks: { current: currentStreak, longest: longestStreak },
            stats: { totalSessions: sessions.length, totalConflicts: uniqueConflicts.size }
        };
    }, [sessions]);


    if (loading) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center">
                <span className="font-mono text-amber text-xs animate-pulse tracking-widest uppercase">Fetching Profile...</span>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)] w-full pb-32 animate-fade-in relative z-10">
            <div className="max-w-6xl mx-auto px-6 py-12">
                
                {/* Header & Stats Strip */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-borderDark/40 pb-8">
                    <div>
                        <h1 className="font-display text-4xl text-textDefault tracking-wide mb-2">My Profile</h1>
                        <p className="font-serif text-textMuted/70 italic text-lg shadow-sm">Your thinking, made visible.</p>
                    </div>
                    
                    <div className="flex items-center space-x-6 mt-8 md:mt-0 font-mono text-sm border border-borderDark/30 bg-background/50 p-4">
                        <div className="flex flex-col items-center px-4 border-r border-borderDark/30">
                            <span className="text-amber text-2xl font-bold">{streaks.current}<span className="text-xs text-amber/50 ml-1">days</span></span>
                            <span className="text-[9px] uppercase tracking-widest text-textMuted mt-1">Current Streak</span>
                        </div>
                        <div className="flex flex-col items-center px-4 border-r border-borderDark/30">
                            <span className="text-textDefault/90 text-2xl font-bold">{stats.totalConflicts}</span>
                            <span className="text-[9px] uppercase tracking-widest text-textMuted mt-1">Conflicts Explored</span>
                        </div>
                        <div className="flex flex-col items-center px-4">
                            <span className="text-textDefault/90 text-2xl font-bold">{stats.totalSessions}</span>
                            <span className="text-[9px] uppercase tracking-widest text-textMuted mt-1">Total Sessions</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Left Column (Main Focus) */}
                    <div className="lg:col-span-8 flex flex-col space-y-12">
                        
                        {/* The Thinking Profile Map */}
                        <section>
                            <ThinkingProfile sessions={sessions} />
                        </section>

                        {/* Recent Blueprints Gallery */}
                        <section>
                            <h3 className="text-xs font-mono uppercase tracking-widest text-textMuted mb-6 pb-2 border-b border-borderDark/40 flex justify-between items-end">
                                Recent Blueprints
                                <span className="text-[10px] text-amber/60 normal-case italic font-serif opacity-80 border-b border-transparent">Artefacts of your arguments</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sessions.slice(0, 4).map(s => (
                                    <BlueprintCard key={s.session_id} session={s} />
                                ))}
                            </div>
                            {sessions.length === 0 && (
                                <div className="p-8 border border-borderDark border-dashed text-center">
                                    <p className="font-mono text-textMuted text-xs uppercase tracking-widest">No blueprints yet.</p>
                                </div>
                            )}
                        </section>

                    </div>

                    {/* Right Column (Supporting Context) */}
                    <div className="lg:col-span-4 flex flex-col space-y-12">
                        <section className="bg-background/80 border border-borderDark/50 p-6 shadow-sm">
                            <ActivityMap sessions={sessions} />
                        </section>
                    </div>

                </div>
            </div>
        </div>
    );
}
