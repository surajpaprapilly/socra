import { useState, useEffect, useMemo } from 'react';
import { fetchWithTimeout } from '../../lib/supabase';
import { BASE_URL } from '../../lib/supabase';
import ActivityMap from './ActivityMap';
import ThinkingProfile from './ThinkingProfile';
import BlueprintCard from './BlueprintCard';
import { getConflictInfoFromQuestion } from './ProfileThemeMatcher';

export default function ProfileScreen() {
    const [sessions, setSessions] = useState([]);
    const [userMemory, setUserMemory] = useState(null);
    const [platoObservation, setPlatoObservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [sessRes, memRes, obsRes] = await Promise.all([
                    fetchWithTimeout(`${BASE_URL}/api/sessions`),
                    fetchWithTimeout(`${BASE_URL}/api/memory`),
                    fetchWithTimeout(`${BASE_URL}/api/plato/observation`)
                ]);

                if (!sessRes.ok) {
                    setError('Could not load your profile data. The server may be unavailable.');
                    return;
                }
                const sessData = await sessRes.json();
                setSessions(sessData.sessions || []);

                if (memRes.ok) {
                    const data = await memRes.json();
                    setUserMemory(data);
                }
                if (obsRes.ok) {
                    const data = await obsRes.json();
                    setPlatoObservation(data.message);
                }
            } catch (err) {
                const msg = err.isTimeout
                    ? 'Profile took too long to load. Check your connection and try again.'
                    : 'Could not connect to the server. Make sure the backend is running.';
                setError(msg);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const { streaks, stats } = useMemo(() => {
        let currentStreak = 0;
        let longestStreak = 0;
        const uniqueConflicts = new Set();

        const activeDates = new Set();

        sessions.forEach(s => {
            const dateStr = new Date(s.created_at).toDateString();
            activeDates.add(dateStr);
            const { conflictTitle } = getConflictInfoFromQuestion(s.question);
            uniqueConflicts.add(conflictTitle);
        });

        const sortedDates = Array.from(activeDates).map(d => new Date(d)).sort((a,b) => b - a);

        if (sortedDates.length > 0) {
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
                    tempStreak = 1;
                }
            }

            const mostRecentDate = sortedDates[0];
            mostRecentDate.setHours(0,0,0,0);
            const daysSinceLast = Math.ceil(Math.abs(today - mostRecentDate) / (1000 * 60 * 60 * 24));

            if (daysSinceLast <= 1) {
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

    if (error) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center gap-6 px-6">
                <span className="font-mono text-[10px] uppercase tracking-widest text-red-400/70 text-center max-w-sm">{error}</span>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 border border-borderDark text-textMuted font-mono text-xs uppercase tracking-widest hover:border-amber hover:text-amber transition-colors"
                >
                    Retry
                </button>
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
                        {platoObservation && (
                            <div className="mt-4 p-4 border border-sage/30 bg-sage/5 inline-block rounded relative">
                                <div className="absolute -top-3 left-4 bg-background px-2 font-mono text-[10px] text-sage uppercase tracking-widest">Plato Says</div>
                                <p className="font-serif text-sm text-sage/90 italic">"{platoObservation}"</p>
                            </div>
                        )}
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

                    <div className="lg:col-span-8 flex flex-col space-y-12">
                        <section>
                            <ThinkingProfile sessions={sessions} userMemory={userMemory} />
                        </section>

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
