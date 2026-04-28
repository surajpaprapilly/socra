import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { fetchWithAuth } from '../lib/supabase';
import Sidebar from './Sidebar';
import QuestionDetail from './QuestionDetail';
import { PAST_YEAR_QUESTIONS } from '../data/pastYearQuestions';

// ── Deterministic "Today's Question" ─────────────────────────────────────────
// Same question for all users on a given calendar day. Rotates daily.
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [mode, setMode] = useState('test'); // 'test' | 'learn'
  const [streak, setStreak] = useState(0);
  const [blueprintCount, setBlueprintCount] = useState(0);

  // Auto-collapse sidebar when an active session is open
  const isInSession =
    location.pathname.startsWith('/test/') &&
    !location.pathname.endsWith('/init');

  useEffect(() => {
    setSidebarCollapsed(isInSession);
    // Clear selected question when navigating back from session
    if (!isInSession) setSelectedQuestion(null);
  }, [isInSession]);

  // Fetch streak + blueprint count once on mount
  useEffect(() => {
    fetchWithAuth('http://localhost:8000/api/sessions')
      .then(r => (r.ok ? r.json() : { sessions: [] }))
      .then(data => {
        const sessions = data.sessions || [];
        setStreak(computeStreak(sessions));
        setBlueprintCount(sessions.filter(s => s.blueprint?.final_score).length);
      })
      .catch(() => {});
  }, []);

  const handleSelectQuestion = useCallback(
    item => {
      setSelectedQuestion(item);
      // If on a sub-page (bank, profile), navigate home so detail panel shows
      if (location.pathname !== '/app') navigate('/app');
    },
    [location.pathname, navigate]
  );

  const handleStartTest = useCallback(
    question => {
      setSession({ source: 'custom_question', customQuestion: question });
      // Delegate to App.jsx's handleStartTest (passed as prop)
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

  return (
    <div className="h-screen flex overflow-hidden relative z-10">
      <Sidebar
        mode={mode}
        setMode={setMode}
        selectedQuestion={selectedQuestion}
        onSelectQuestion={handleSelectQuestion}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        streak={streak}
        blueprintCount={blueprintCount}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        {showDetailPanel ? (
          <QuestionDetail
            item={selectedQuestion}
            mode={mode}
            onBack={handleBack}
            onStartTest={handleStartTest}
            onStartLearn={handleStartLearn}
          />
        ) : (
          // Outlet renders HomeView, LearnMode, SavedBlueprints, ProfileScreen,
          // or the session handler depending on the current route.
          <Outlet context={{ mode, onSelectQuestion: handleSelectQuestion }} />
        )}
      </main>
    </div>
  );
}
