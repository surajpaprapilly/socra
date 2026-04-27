import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/supabase';
import { TODAY_Q } from './AppShell';

export default function HomeView() {
  const { mode, onSelectQuestion } = useOutletContext();
  const navigate = useNavigate();

  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('http://localhost:8000/api/sessions')
      .then(r => (r.ok ? r.json() : { sessions: [] }))
      .then(data => setRecentSessions((data.sessions || []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto px-12 py-10 animate-in fade-in duration-400 relative z-10">

      {/* Greeting */}
      <div className="mb-10">
        <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-textMuted/50 mb-3">
          {today}
        </p>
        <h1 className="font-display text-4xl text-textDefault font-normal leading-tight mb-2">
          {mode === 'test' ? 'What will you argue today?' : 'What will you study today?'}
        </h1>
        <p className="font-serif italic text-textMuted/80 text-base leading-relaxed max-w-lg">
          {mode === 'test'
            ? 'Pick a question from the sidebar. Defend your view. Watch your blueprint form.'
            : 'Pick a question, read the conflict, then build your argument.'}
        </p>
      </div>

      {/* Today's Question — hero card */}
      <div className="mb-10">
        <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-amber/80 mb-3 flex items-center gap-2">
          <span>✦</span> Today's Question
          <span className="font-serif italic normal-case tracking-normal text-textMuted/30 text-[10px] ml-1">
            — changes daily
          </span>
        </div>
        <div
          onClick={() => onSelectQuestion(TODAY_Q)}
          className="relative bg-[#141210] border border-amber/20 p-7 cursor-pointer hover:border-amber/45 hover:bg-[#161410] transition-all group"
        >
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber opacity-60" />
          <p className="font-display text-xl text-textDefault leading-relaxed mb-4 pl-1">
            "{TODAY_Q.q}"
          </p>
          <div className="flex items-center justify-between pl-1">
            <span className="font-mono text-[9px] text-textMuted/50">
              {TODAY_Q.year} A-Level GP
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase text-amber group-hover:translate-x-1 transition-transform duration-200">
              {mode === 'test' ? 'Start arguing' : 'Study this'} →
            </span>
          </div>
        </div>
      </div>

      {/* Recent Blueprints */}
      {!loading && recentSessions.length > 0 && (
        <div>
          <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-textMuted/45 mb-3 flex items-center justify-between">
            <span>Recent Blueprints</span>
            <button
              onClick={() => navigate('/bank')}
              className="text-textMuted/25 hover:text-textMuted/55 transition-colors text-[8px] tracking-wider"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recentSessions.map((s, i) => {
              const score = s.blueprint?.final_score ?? 0;
              const gradeColor =
                score >= 25
                  ? 'text-green-400'
                  : score >= 20
                  ? 'text-amber'
                  : 'text-textMuted';
              return (
                <div
                  key={s.session_id || i}
                  onClick={() => navigate(`/test/${s.session_id}`)}
                  className="bg-[#141210] border border-borderDark p-4 cursor-pointer hover:border-amber/30 hover:-translate-y-px transition-all duration-150 animate-in fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-textMuted/40">
                      {new Date(s.created_at).toLocaleDateString('en-SG', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {score > 0 && (
                      <div className={`font-display text-lg font-bold leading-none ${gradeColor}`}>
                        {score}
                        <span className="font-mono text-[8px] text-textMuted/30 font-normal ml-0.5">
                          /30
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="font-serif italic text-[11px] text-textMuted/80 leading-snug line-clamp-2">
                    "{s.question}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && recentSessions.length === 0 && (
        <div className="border border-dashed border-borderDark p-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-textMuted/30 mb-2">
            No blueprints yet
          </p>
          <p className="font-serif italic text-textMuted/40 text-sm">
            Pick a question above to start your first session.
          </p>
        </div>
      )}
    </div>
  );
}
