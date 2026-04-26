import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, BASE_URL } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

// ─── Quality Badge ─────────────────────────────────────────────────────────────
function QualityBadge({ label, active }) {
    return (
        <span className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest ${
            active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-borderDark/20 text-textMuted/40 border border-borderDark/20'
        }`}>
            {label}
        </span>
    );
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({ turn }) {
    const phase = Math.min(turn, 5);
    const pct = (phase / 5) * 100;
    const r = 14;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width="36" height="36" className="transform -rotate-90 flex-shrink-0">
            <circle cx="18" cy="18" r={r} fill="none" stroke="#2A2825" strokeWidth="3" />
            <circle
                cx="18" cy="18" r={r} fill="none"
                stroke={turn > 5 ? '#7A9E7E' : '#C8963E'}
                strokeWidth="3"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                className="transition-all duration-700"
            />
        </svg>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SavedBlueprints() {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleDeleteSession = async (sessionId) => {
        try {
            const res = await fetchWithAuth(`${BASE_URL}/api/session/${sessionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setSessions(curr => curr.filter(s => s.session_id !== sessionId));
                showToast('Session deleted.', 'success');
            } else {
                showToast('Failed to delete session.', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error deleting session — check your connection.', 'error');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetchWithAuth(`${BASE_URL}/api/sessions`);
                if (res.ok) {
                    const data = await res.json();

                    const fetchedSessions = data.sessions || [];
                    const grouped = {};
                    const chronological = [...fetchedSessions].reverse();

                    chronological.forEach(s => {
                        const key = s.question.trim().toLowerCase();
                        if (!grouped[key]) grouped[key] = 0;
                        grouped[key] += 1;
                        s.attemptNumber = grouped[key];
                        s.totalAttemptsForQuestion = 0;
                    });

                    chronological.forEach(s => {
                        const key = s.question.trim().toLowerCase();
                        s.totalAttemptsForQuestion = grouped[key];
                    });

                    setSessions(chronological.reverse());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const filtered = sessions.filter(s =>
        !searchQuery || s.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.blueprint_snapshot?.thesis || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center py-12 px-6">
            <div className="max-w-[800px] w-full flex flex-col space-y-10">

                {/* Header */}
                <div className="text-center space-y-3 animate-in fade-in slide-in-from-top-4 duration-700 mb-6">
                    <h1 className="font-display text-4xl md:text-5xl text-textDefault tracking-tight">
                        My Sessions
                    </h1>
                    <p className="font-mono text-textMuted text-xs uppercase tracking-[0.2em]">
                        Your complete learning history
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-24">
                        <span className="animate-pulse text-amber tracking-widest font-mono uppercase text-sm">Loading Timeline...</span>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                        <p className="font-serif text-textMuted/60 leading-relaxed max-w-sm">
                            No sessions found.<br />Start a GP question to begin.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-3 bg-transparent border border-amber text-amber font-mono tracking-widest uppercase text-xs transition-all duration-300 hover:bg-amber/10"
                        >
                            [ Explore a GP Question → ]
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5 pb-24 animate-in fade-in duration-500">
                        {/* Search */}
                        <div className="w-full mb-6">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search past topics or thesis..."
                                className="w-full bg-transparent border-b border-borderDark focus:border-amber text-sm text-textDefault placeholder-textMuted/40 transition-colors duration-300 py-3 font-mono outline-none"
                            />
                        </div>

                        {filtered.length === 0 ? (
                             <div className="py-20 text-center font-mono text-xs uppercase tracking-widest text-textMuted">
                                 No matching sessions found.
                             </div>
                        ) : filtered.map((session, idx) => {
                            const bp = session.blueprint_snapshot || {};
                            const sq = bp.session_quality || {};
                            const dateSlug = new Date(session.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric'
                            });
                            const phaseLabel = session.is_complete ? 'Complete' : `Phase ${Math.min(session.turn, 5)} / 5`;
                            const thesis = bp.thesis;
                            const isConfirming = confirmDeleteId === session.session_id;

                            return (
                                <div
                                    key={session.session_id}
                                    onClick={() => !isConfirming && navigate(`/test/${session.session_id}`)}
                                    className="group bg-[#141210] border border-[#2A2825] hover:border-amber/20 transition-all duration-300 p-6 md:p-8 cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-6"
                                    style={{ animationDelay: `${Math.min(idx, 10) * 80}ms`, animationFillMode: 'both' }}
                                >
                                    {session.is_complete && (
                                        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                            style={{ background: 'linear-gradient(135deg, rgba(122,158,126,0.03) 0%, transparent 60%)' }} />
                                    )}

                                    <div className="flex items-start justify-between gap-4 mb-5">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <ProgressRing turn={session.turn} />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    <span className="font-mono text-[10px] text-textMuted/60 uppercase tracking-widest">{dateSlug}</span>
                                                    {session.totalAttemptsForQuestion > 1 && (
                                                        <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 bg-borderDark/20 text-textMuted border border-borderDark/30">
                                                            Attempt {session.attemptNumber}
                                                        </span>
                                                    )}
                                                    {session.is_complete ? (
                                                        <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 bg-[#7A9E7E]/15 text-[#7A9E7E] border border-[#7A9E7E]/30">
                                                            ✓ Complete
                                                        </span>
                                                    ) : (
                                                        <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 bg-amber/10 text-amber/80 border border-amber/20">
                                                            {phaseLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="font-serif text-lg md:text-xl text-textDefault group-hover:text-amber transition-colors leading-relaxed mb-4 pr-4">
                                        "{session.question}"
                                    </h3>

                                    {thesis && (
                                        <div className="pl-4 border-l border-borderDark/50 group-hover:border-amber/30 transition-colors mb-5">
                                            <span className="font-mono text-[9px] uppercase tracking-widest text-textMuted/60 group-hover:text-amber/50 transition-colors block mb-1">Thesis</span>
                                            <p className="font-serif text-sm text-textMuted line-clamp-2">{thesis}</p>
                                        </div>
                                    )}

                                    {session.turn > 1 && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            <QualityBadge label="Autopsy" active={sq.question_autopsy_complete} />
                                            <QualityBadge label="Thesis" active={sq.thesis_refined} />
                                            <QualityBadge label="Balanced" active={sq.both_sides_argued} />
                                            <QualityBadge label={`Links ${sq.analytical_links_count || 0}/3`} active={(sq.analytical_links_count || 0) >= 3} />
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center border-t border-borderDark/20 pt-5">
                                        {isConfirming ? (
                                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                                <span className="font-mono text-[10px] uppercase tracking-widest text-red-400/80">Delete?</span>
                                                <button
                                                    onClick={() => handleDeleteSession(session.session_id)}
                                                    className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-borderDark text-textMuted hover:text-textDefault transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(session.session_id);
                                                }}
                                                className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 text-textMuted/40 hover:text-red-400/80 transition-colors"
                                            >
                                                [ ✕ Delete ]
                                            </button>
                                        )}
                                        <button
                                            className="font-mono text-xs uppercase tracking-widest px-5 py-2.5 border transition-all duration-200 flex items-center gap-2 border-borderDark text-textMuted group-hover:bg-amber/10 group-hover:border-amber group-hover:text-amber"
                                        >
                                            {session.is_complete ? '[ Revision Mode → ]' : '[ Resume → ]'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
