import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/supabase';

export default function EvalList() {
    const { isDeveloper } = useAuth();
    const navigate = useNavigate();
    const [evals, setEvals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isDeveloper) return;
        fetchWithAuth('http://localhost:8000/api/dev/evals')
            .then(r => r.json())
            .then(data => setEvals(data.evals || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [isDeveloper]);

    if (!isDeveloper) {
        return (
            <div className="flex items-center justify-center h-64 text-textMuted font-mono text-sm">
                Developer access only.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-amber font-mono animate-pulse">
                Loading eval runs...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-red-400 font-mono text-sm">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h1 className="font-serif text-2xl text-textDefault mb-1">Eval Transcripts</h1>
                <p className="font-mono text-xs text-textMuted tracking-widest uppercase">
                    Dynamic student simulation runs
                </p>
            </div>

            {evals.length === 0 ? (
                <div className="border border-borderDark p-8 text-center text-textMuted font-mono text-sm">
                    <p>No eval runs found.</p>
                    <p className="mt-2 text-xs opacity-60">
                        Run: <code className="text-amber">python run_evals_dynamic.py --student=weak --turns=10</code>
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {evals.map(ev => (
                        <button
                            key={ev.run_id}
                            onClick={() => navigate(`/eval-viewer/${ev.run_id}`)}
                            className="w-full text-left border border-borderDark hover:border-amber/40 bg-background/50 hover:bg-background transition-all p-4 group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`font-mono text-xs tracking-widest uppercase px-2 py-0.5 border ${
                                            ev.student_type === 'weak'
                                                ? 'border-red-400/40 text-red-400'
                                                : 'border-green-400/40 text-green-400'
                                        }`}>
                                            {ev.student_type}
                                        </span>
                                        <span className="font-mono text-xs text-textMuted">
                                            {ev.turns} turn{ev.turns !== 1 ? 's' : ''}
                                        </span>
                                        {ev.summary?.score_delta !== undefined && (
                                            <span className={`font-mono text-xs ${
                                                ev.summary.score_delta > 0 ? 'text-green-400' : 'text-textMuted'
                                            }`}>
                                                Δ{ev.summary.score_delta > 0 ? '+' : ''}{ev.summary.score_delta} score
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-serif text-sm text-textDefault truncate">
                                        {ev.question}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="font-mono text-xs text-textMuted">
                                        {ev.timestamp_iso ? new Date(ev.timestamp_iso).toLocaleDateString() : '—'}
                                    </p>
                                    <p className="font-mono text-xs text-amber/60 group-hover:text-amber transition-colors mt-1">
                                        View replay →
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
