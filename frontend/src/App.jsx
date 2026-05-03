import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginScreen from './components/auth/LoginScreen';
import LandingScreen from './components/LandingScreen';
import AppShell from './components/AppShell';
import HomeView from './components/HomeView';
import ConflictSelection from './components/conflicts/ConflictSelection';
import ConflictReading from './components/conflicts/ConflictReading';

import ChatInterface from './components/ChatInterface';
import NavBar from './components/NavBar';
import LearnMode from './components/learn/LearnMode';
import SavedBlueprints from './components/bank/SavedBlueprints';
import ProfileScreen from './components/profile/ProfileScreen';
import EvalList from './components/EvalList';
import EvalViewer from './components/EvalViewer';
import PremiumModal from './components/PremiumModal';
import { fetchWithAuth, fetchWithTimeout, BASE_URL } from './lib/supabase';

// Helper component to handle Test Mode initialization
function TestModeInit({ onStartTest }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { reaction } = useSession();
    const [existingSessions, setExistingSessions] = useState(null);

    useEffect(() => {
        if (!location.state?.question) {
            navigate('/');
            return;
        }

        const checkExisting = async () => {
            try {
                const res = await fetchWithAuth(`${BASE_URL}/api/sessions`);
                if (res.ok) {
                    const data = await res.json();
                    const qStr = location.state.question.trim().toLowerCase();
                    const matched = (data.sessions || []).filter(s => s.question.trim().toLowerCase() === qStr);

                    if (matched.length > 0) {
                        setExistingSessions(matched);
                        return;
                    }
                }
            } catch (e) {
                console.error(e);
            }
            onStartTest(location.state.question, reaction, location.state.isCustom ?? false);
        };
        checkExisting();
    }, [location, reaction, onStartTest, navigate]);

    if (existingSessions) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-textDefault space-y-6">
                <p className="font-serif text-lg max-w-md text-center">
                    You have <span className="text-amber">{existingSessions.length}</span> previous attempt{existingSessions.length > 1 ? 's' : ''} for this question.
                </p>
                <div className="flex space-x-6">
                    <button
                        onClick={() => navigate(`/test/${existingSessions[0].session_id}`)}
                        className="px-6 py-3 bg-amber/10 border border-amber text-amber font-mono tracking-widest uppercase text-xs hover:bg-amber/20 transition-all"
                    >
                        Continue Attempt {existingSessions.length} →
                    </button>
                    <button
                        onClick={() => onStartTest(location.state.question, reaction, location.state.isCustom ?? false)}
                        className="px-6 py-3 bg-transparent border border-borderDark text-textMuted font-mono tracking-widest uppercase text-xs hover:text-textDefault hover:border-borderDark transition-all"
                    >
                        Start Fresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex items-center justify-center text-amber font-mono animate-pulse">
            Initializing Session...
        </div>
    );
}

// Handles both fresh sessions (sessionId set in state) and direct URL re-hydration
function SessionRouteHandler({ sessionId, initialQuestion, initialMessage, resumeHistory, initialTurn, initialScore, isRehydrating, onRehydrate, onClearSession }) {
    const { id } = useParams();

    useEffect(() => {
        if (!isRehydrating && id && sessionId !== id) {
            onRehydrate(id);
        }
    }, [id, sessionId, isRehydrating, onRehydrate]);

    useEffect(() => {
        return () => {
            if (onClearSession) {
                onClearSession();
            }
        };
    }, [onClearSession]);

    if (isRehydrating || sessionId !== id) {
        return (
            <div className="h-full w-full flex items-center justify-center text-amber font-mono animate-pulse">
                Loading Session...
            </div>
        );
    }

    return (
        <ChatInterface
            key={id}
            sessionId={id}
            initialQuestion={initialQuestion}
            initialMessage={initialMessage}
            resumeHistory={resumeHistory}
            initialTurn={initialTurn}
            initialScore={initialScore}
        />
    );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDeveloper, user } = useAuth();
  const { showToast } = useToast();

  const shellPaths = ['/app', '/test', '/learn', '/bank', '/profile'];
  const isShellRoute = shellPaths.some(p => location.pathname.startsWith(p));

  const [initialQuestion, setInitialQuestion] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [resumeHistory, setResumeHistory] = useState(null);
  const [initialTurn, setInitialTurn] = useState(1);
  const [initialScore, setInitialScore] = useState(0);
  const [isRehydrating, setIsRehydrating] = useState(false);

  const handleClearSession = useCallback(() => {
      setSessionId(null);
      setResumeHistory(null);
      setInitialTurn(1);
      setInitialScore(0);
      setInitialQuestion("");
      setInitialMessage("");
  }, []);

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [devResetting, setDevResetting] = useState(false);

  const handleStartTest = async (question, reaction = null, isCustom = false) => {
    try {
      const payload = { question, validate: isCustom };
      if (reaction) payload.reaction = reaction;

      const response = await fetchWithTimeout(`${BASE_URL}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 402) {
            setShowPremiumModal(true);
            return;
        }
        if (response.status === 422) {
            const err = await response.json();
            showToast(err.detail || "That doesn't look like a GP Paper 1 question. Please try a different question.", 'error');
            navigate(-1);
            return;
        }
        throw new Error("Failed to start session");
      }

      const data = await response.json();
      setSessionId(data.session_id);
      setInitialQuestion(question);
      setInitialMessage(data.first_message);
      navigate(`/test/${data.session_id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      const msg = error.isTimeout
        ? 'Session start timed out. Make sure the backend is running.'
        : 'Failed to connect to Socra API. Make sure the backend is running.';
      showToast(msg, 'error');
    }
  };

  const handleRehydrateSession = useCallback(async (id) => {
    setIsRehydrating(true);
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/session/${id}`);
      if (!res.ok) {
        showToast('Session not found — returning home.', 'error');
        navigate('/');
        return;
      }
      const data = await res.json();
      setSessionId(id);
      setInitialQuestion(data.question);
      setInitialMessage('');
      setResumeHistory(data.messages || []);
      setInitialTurn(data.turn || 1);
      setInitialScore(data.blueprint?.final_score || 0);
    } catch (e) {
      console.error('Failed to re-hydrate session:', e);
      const msg = e.isTimeout
        ? 'Session load timed out — returning home.'
        : 'Could not load session — returning home.';
      showToast(msg, 'error');
      navigate('/');
    } finally {
      setIsRehydrating(false);
    }
  }, [navigate, showToast]);

  const handleDevReset = async () => {
    if (!window.confirm('⚡ Dev: Reset all sessions and blueprints for your account?')) return;
    setDevResetting(true);
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/dev/reset-sessions`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Sessions reset. You can now test from scratch.', 'success');
      } else {
        showToast('Reset failed — check backend logs.', 'error');
      }
    } catch {
      showToast('Could not reach the backend.', 'error');
    } finally {
      setDevResetting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background text-textDefault relative overflow-x-hidden font-mono ${!isShellRoute && location.pathname !== '/' ? 'pt-16' : ''}`}>
      <div className="noise-overlay"></div>
      {!isShellRoute && <NavBar />}
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} userEmail={user?.email} />

      {isDeveloper && (
        <button
          id="dev-reset-sessions-btn"
          onClick={handleDevReset}
          disabled={devResetting}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-amber/30 text-amber/60 bg-background/80 backdrop-blur-sm hover:border-amber/70 hover:text-amber transition-all disabled:opacity-40"
        >
          {devResetting ? '⏳ Resetting...' : '⚡ Reset Sessions'}
        </button>
      )}

      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/login" element={<LoginScreen />} />

        {/* ── Shell layout — sidebar always present ── */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell onStartTest={handleStartTest} />
            </ProtectedRoute>
          }
        >
          <Route path="/app"     element={<HomeView />} />
          <Route path="/learn"   element={<LearnMode />} />
          <Route path="/bank"    element={<SavedBlueprints />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/test/init" element={<TestModeInit onStartTest={handleStartTest} />} />
          <Route path="/test/:id" element={
            <SessionRouteHandler
              sessionId={sessionId}
              initialQuestion={initialQuestion}
              initialMessage={initialMessage}
              resumeHistory={resumeHistory}
              initialTurn={initialTurn}
              initialScore={initialScore}
              isRehydrating={isRehydrating}
              onRehydrate={handleRehydrateSession}
              onClearSession={handleClearSession}
            />
          } />
        </Route>

        <Route path="/conflicts/:themeId" element={<ProtectedRoute><ConflictSelection /></ProtectedRoute>} />
        <Route path="/conflict/:conflictId/read" element={<ProtectedRoute><ConflictReading /></ProtectedRoute>} />

        <Route path="/eval-viewer" element={<ProtectedRoute><EvalList /></ProtectedRoute>} />
        <Route path="/eval-viewer/:runId" element={<ProtectedRoute><EvalViewer /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
