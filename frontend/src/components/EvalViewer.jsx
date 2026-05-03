import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth, BASE_URL } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const METRIC_LABELS = {
    socratic_quality: 'Socratic quality',
    focus: 'Focus',
    targeted_affirmation: 'Affirmation',
    no_direct_answer: 'No direct answer',
    phase_appropriateness: 'Phase fit',
};

function ScoreBadge({ score }) {
    const color = score >= 5 ? 'text-green-400 border-green-400/40' :
                  score >= 4 ? 'text-amber border-amber/40' :
                               'text-red-400 border-red-400/40';
    return (
        <span className={`font-mono text-xs border px-1.5 py-0.5 ${color}`}>
            {score}/5
        </span>
    );
}

function JudgePanel({ judgeScores }) {
    if (!judgeScores || Object.keys(judgeScores).length === 0) return null;
    return (
        <div className="mt-3 border-t border-borderDark/50 pt-3">
            <p className="font-mono text-[10px] text-textMuted uppercase tracking-widest mb-2">
                Tutor evaluation
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(METRIC_LABELS).map(([key, label]) => {
                    const score = judgeScores[key];
                    if (score === undefined) return null;
                    return (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-textMuted">{label}</span>
                            <ScoreBadge score={score} />
                        </div>
                    );
                })}
            </div>
            {judgeScores.reasoning && (
                <p className="mt-2 font-mono text-[10px] text-textMuted/70 leading-relaxed line-clamp-2">
                    {judgeScores.reasoning}
                </p>
            )}
        </div>
    );
}

function SummaryPanel({ summary, studentType }) {
    if (!summary) return null;
    const { score_trajectory, score_delta, phase_reached, avg_tutor_scores, insights_unlocked, moves_practiced } = summary;

    const phaseLabels = { '1': 'Question Autopsy', '2': 'Arg. Construction', '3': 'Further Args', '4': 'Stress Test', '5': 'Blueprint Done' };

    return (
        <div className="border border-borderDark p-5 space-y-5 font-mono text-xs sticky top-4">
            <div>
                <p className="text-textMuted uppercase tracking-widest mb-2">Score trajectory</p>
                <div className="flex items-end gap-1 h-10">
                    {score_trajectory.map((s, i) => {
                        const pct = Math.round((s / 30) * 100);
                        return (
                            <div
                                key={i}
                                className="flex-1 bg-amber/60 rounded-sm transition-all"
                                style={{ height: `${Math.max(pct, 4)}%` }}
                                title={`Turn ${i + 1}: ${s}/30`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-1 text-textMuted/60">
                    <span>Turn 1</span>
                    <span className={score_delta > 0 ? 'text-green-400' : 'text-textMuted'}>
                        Δ{score_delta > 0 ? '+' : ''}{score_delta}
                    </span>
                </div>
            </div>

            <div>
                <p className="text-textMuted uppercase tracking-widest mb-2">Avg tutor scores</p>
                {Object.entries(METRIC_LABELS).map(([key, label]) => {
                    const val = avg_tutor_scores?.[key] ?? 0;
                    const filled = Math.round(val);
                    return (
                        <div key={key} className="flex items-center gap-2 mb-1">
                            <span className="text-textMuted/70 w-28 truncate">{label}</span>
                            <span className="text-amber/80">{'█'.repeat(filled)}{'░'.repeat(5 - filled)}</span>
                            <span className="text-textMuted">{val}</span>
                        </div>
                    );
                })}
            </div>

            <div>
                <p className="text-textMuted uppercase tracking-widest mb-1">Phase reached</p>
                <span className="text-textDefault">{phaseLabels[String(phase_reached)] || `Phase ${phase_reached}`}</span>
            </div>

            {moves_practiced.length > 0 && (
                <div>
                    <p className="text-textMuted uppercase tracking-widest mb-1">Moves practiced</p>
                    <div className="flex flex-wrap gap-1">
                        {moves_practiced.map(m => (
                            <span key={m} className="border border-amber/30 text-amber px-1.5 py-0.5">
                                Move {m}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {insights_unlocked.length > 0 && (
                <div>
                    <p className="text-textMuted uppercase tracking-widest mb-1">Insights unlocked</p>
                    <div className="flex flex-col gap-1">
                        {insights_unlocked.map((ins, i) => (
                            <span key={i} className="text-green-400/80">◆ {ins}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EvalViewer() {
    const { runId } = useParams();
    const { isDeveloper } = useAuth();
    const navigate = useNavigate();

    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [visibleTurns, setVisibleTurns] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const messagesEndRef = useRef(null);
    const playTimerRef = useRef(null);

    useEffect(() => {
        if (!isDeveloper) return;
        fetchWithAuth(`${BASE_URL}/api/dev/evals/${runId}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(data => setTranscript(data))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [runId, isDeveloper]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleTurns]);

    const advance = useCallback(() => {
        setVisibleTurns(prev => {
            if (!transcript) return prev;
            return Math.min(prev + 1, transcript.conversation.length);
        });
    }, [transcript]);

    useEffect(() => {
        if (!isPlaying || !transcript) return;
        if (visibleTurns >= transcript.conversation.length) {
            setIsPlaying(false);
            return;
        }
        playTimerRef.current = setTimeout(advance, 1500);
        return () => clearTimeout(playTimerRef.current);
    }, [isPlaying, visibleTurns, transcript, advance]);

    if (!isDeveloper) {
        return <div className="flex items-center justify-center h-64 text-textMuted font-mono text-sm">Developer access only.</div>;
    }
    if (loading) {
        return <div className="flex items-center justify-center h-64 text-amber font-mono animate-pulse">Loading transcript...</div>;
    }
    if (error) {
        return <div className="flex items-center justify-center h-64 text-red-400 font-mono text-sm">Error: {error}</div>;
    }
    if (!transcript) return null;

    const { conversation, summary, question, student_type, turns, opening_socra_message } = transcript;
    const totalTurns = conversation.length;
    const isComplete = visibleTurns >= totalTurns;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/eval-viewer')}
                        className="font-mono text-xs text-textMuted hover:text-amber transition-colors mb-3 flex items-center gap-1"
                    >
                        ← All runs
                    </button>
                    <h1 className="font-serif text-xl text-textDefault mb-1">{question}</h1>
                    <div className="flex items-center gap-3 font-mono text-xs text-textMuted">
                        <span className={`border px-2 py-0.5 uppercase tracking-widest ${
                            student_type === 'weak' ? 'border-red-400/40 text-red-400' : 'border-green-400/40 text-green-400'
                        }`}>{student_type} student</span>
                        <span>{turns} turns</span>
                        <span>{transcript.timestamp_iso ? new Date(transcript.timestamp_iso).toLocaleString() : ''}</span>
                    </div>
                </div>

                {/* Playback controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setVisibleTurns(v => Math.max(v - 1, 0))}
                        disabled={visibleTurns === 0}
                        className="font-mono text-xs border border-borderDark text-textMuted px-3 py-1.5 hover:border-amber/40 hover:text-textDefault disabled:opacity-30 transition-all"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => setIsPlaying(p => !p)}
                        disabled={isComplete}
                        className="font-mono text-xs border border-amber/40 text-amber px-4 py-1.5 hover:bg-amber/10 disabled:opacity-30 transition-all"
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <button
                        onClick={advance}
                        disabled={isComplete}
                        className="font-mono text-xs border border-borderDark text-textMuted px-3 py-1.5 hover:border-amber/40 hover:text-textDefault disabled:opacity-30 transition-all"
                    >
                        →
                    </button>
                    <span className="font-mono text-xs text-textMuted ml-1">
                        {visibleTurns}/{totalTurns}
                    </span>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Chat column */}
                <div className="flex-1 min-w-0">
                    {/* Opening Socra message */}
                    {opening_socra_message && (
                        <div className="flex w-full mb-8 pl-4">
                            <div className="mr-4 mt-1 flex-shrink-0">
                                <span className="text-amber text-xs">◆</span>
                            </div>
                            <div className="prose prose-invert max-w-none font-serif text-base text-textDefault/80">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {opening_socra_message}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Conversation turns */}
                    {conversation.slice(0, visibleTurns).map((turn, idx) => {
                        const isLastVisible = idx === visibleTurns - 1;
                        return (
                            <div key={idx} className="mb-10">
                                {/* Student message */}
                                <div className="flex justify-end w-full mb-6 pr-4">
                                    <div className="font-mono text-sm text-textMuted leading-loose max-w-xl text-right p-4 border border-borderDark/50 bg-background/50">
                                        {turn.student}
                                    </div>
                                </div>

                                {/* Socra response */}
                                <div className="flex w-full mb-2 pl-4">
                                    <div className="mr-4 mt-1 flex-shrink-0">
                                        <span className="text-amber text-xs">◆</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="prose prose-invert max-w-none font-serif text-base">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}
                                                components={{ hr: () => null }}>
                                                {turn.socra}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Phase + score chips */}
                                        <div className="flex items-center gap-3 mt-2 font-mono text-[10px] text-textMuted/60">
                                            <span>Phase {turn.metadata?.current_phase ?? '—'}</span>
                                            <span>Score {turn.metadata?.question_score ?? '—'}/30</span>
                                            {turn.metadata?.insight_unlocked && (
                                                <span className="text-green-400">◆ {turn.metadata.insight_unlocked}</span>
                                            )}
                                        </div>

                                        {/* Judge panel for the latest visible turn only */}
                                        {isLastVisible && (
                                            <JudgePanel judgeScores={turn.judge_scores} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {visibleTurns === 0 && (
                        <div className="flex items-center justify-center h-32 text-textMuted font-mono text-sm">
                            Press Play or → to begin the replay.
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Summary sidebar */}
                <div className="w-56 flex-shrink-0 hidden lg:block">
                    <SummaryPanel summary={summary} studentType={student_type} />
                </div>
            </div>
        </div>
    );
}
