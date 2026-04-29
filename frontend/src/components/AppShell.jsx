import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { fetchWithAuth } from '../lib/supabase';
import Sidebar from './Sidebar';
import QuestionDetail from './QuestionDetail';
import { PAST_YEAR_QUESTIONS } from '../data/pastYearQuestions';

// ── Deterministic "Today's Question" ─────────────────────────────────────────
const dayOfYear = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000
);
const _allQs = PAST_YEAR_QUESTIONS.flatMap(y =>
  y.questions.map(q => ({ q, year: y.year }))
);
export const TODAY_Q = _allQs[dayOfYear % _allQs.length];

// ── Streak helper (mirrors logic in ProfileScreen) ────────────────────────────
function computeStreak(sessions) {
  const activeDates = new Set(
    sessions.map(s => new Date(s.created_at).toDateString())
  );
  const sorted = Array.from(activeDates)
    .map(d => new Date(d))
    .sort((a, b) => b - a);

  if (!sorted.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.round(
    Math.abs(today - sorted[0]) / 86_400_000
  );
  if (daysSinceLast > 1) return 0;

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.round(Math.abs(sorted[i] - sorted[i + 1]) / 86_400_000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell({ onStartTest }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession } = useSession();

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [mode, setMode] = useState('test');
  const [streak, setStreak] = useState(0);
  const [blueprintCount, setBlueprintCount] = useState(0);

  // Track mobile breakpoint
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-collapse sidebar when an active session is open
  const isInSession =
    location.pathname.startsWith('/test/') &&
    !location.pathname.endsWith('/init');

  useEffect(() => {
    if (isInSession) setSidebarCollapsed(true);
    if (!isInSession) setSelectedQuestion(null);
  }, [isInSession]);

  // Fetch streak + blueprint count once on mount
  useEffect(() => {
    fetchWithAuth('http://localhost:8000/api/sessions')
      .then(r => (r.ok ? r.json() : { sessions: [] }))
      .then(data => {
        const sessions = data.sessions || [];
        setStreak(computeStreak(sessions));
        setBlueprintCount(sessions.length);
      })
      .catch(() => {});
  }, []);

  const handleSelectQuestion = useCallback(
    item => {
      setSelectedQuestion(item);
      if (isMobile) setSidebarCollapsed(true); // close drawer after selection
      if (location.pathname !== '/app') navigate('/app');
    },
    [location.pathname, navigate, isMobile]
  );

  const handleStartTestInner = useCallback(
    question => {
      setSession({ source: 'custom_question', customQuestion: question });
      onStartTest(question);
    },
    [setSession, onStartTest]
  );

  const handleStartLearn = useCallback(
    question => {
      setSession({ source: 'custom_question', customQuestion: question });
      navigate('/learn', { state: { question } });
    },
    [setSession, navigate]
  );

  const handleBack = useCallback(() => {
    setSelectedQuestion(null);
  }, []);

  const showDetailPanel = selectedQuestion && !isInSession;

  const sidebarNode = (
    <Sidebar
      mode={mode}
      setMode={setMode}
      selectedQuestion={selectedQuestion}
      onSelectQuestion={handleSelectQuestion}
      collapsed={isMobile ? false : sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      streak={streak}
      blueprintCount={blueprintCount}
    />
  );

  return (
    <div className="h-screen flex overflow-hidden relative z-10">

      {/* Desktop: sidebar as part of flex flow */}
      {!isMobile && sidebarNode}

      {/* Mobile: sidebar as fixed overlay drawer */}
      {isMobile && !sidebarCollapsed && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setSidebarCollapsed(true)}
          />
          <div className="fixed inset-y-0 left-0 z-50">
            {sidebarNode}
          </div>
        </>
      )}

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-borderDark bg-[#11100D]">
            <span className="font-display text-base text-textDefault tracking-wide">Socra</span>
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="text-textMuted/50 hover:text-amber transition-colors p-1"
              title="Open menu"
              aria-label="Open sidebar"
            >
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <rect width="18" height="1.5" rx="0.75" fill="currentColor"/>
                <rect y="6" width="18" height="1.5" rx="0.75" fill="currentColor"/>
                <rect y="12" width="12" height="1.5" rx="0.75" fill="currentColor"/>
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {showDetailPanel ? (
            <QuestionDetail
              item={selectedQuestion}
              mode={mode}
              onBack={handleBack}
              onStartTest={handleStartTestInner}
              onStartLearn={handleStartLearn}
              onSelectRelated={handleSelectQuestion}
            />
          ) : (
            <Outlet context={{ mode, onSelectQuestion: handleSelectQuestion }} />
          )}
        </div>
      </main>
    </div>
  );
}
