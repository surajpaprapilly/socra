import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginScreen from './components/auth/LoginScreen';
import LandingScreen from './components/LandingScreen';
import ThemeSelection from './components/ThemeSelection';
import ConflictSelection from './components/conflicts/ConflictSelection';
import ConflictReading from './components/conflicts/ConflictReading';

import ModeChoice from './components/ModeChoice';
import ChatInterface from './components/ChatInterface';
import NavBar from './components/NavBar';
import LearnMode from './components/learn/LearnMode';
import SavedBlueprints from './components/bank/SavedBlueprints';
import ProfileScreen from './components/profile/ProfileScreen';
import EvalList from './components/EvalList';
import EvalViewer from './components/EvalViewer';
import PremiumModal from './components/PremiumModal';
import { supabase, fetchWithAuth } from './lib/supabase';

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
                const res = await fetchWithAuth('http://localhost:8000/api/sessions');
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
            // Fallback or no existing session
            onStartTest(location.state.question, reaction);
        };
        checkExisting();
    }, [location, reaction, onStartTest, navigate]);

    if (existingSessions) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center text-textDefault space-y-6">
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
                        onClick={() => onStartTest(location.state.question, reaction)}
                        className="px-6 py-3 bg-transparent border border-borderDark text-textMuted font-mono tracking-widest uppercase text-xs hover:text-textDefault hover:border-borderDark transition-all"
                    >
                        Start Fresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center text-amber font-mono animate-pulse">
            Initializing Session...
        </div>
    );
}

// Handles both fresh sessions (sessionId set in state) and direct URL re-hydration
function SessionRouteHandler({ sessionId, initialQuestion, initialMessage, resumeHistory, initialTurn, initialScore, isRehydrating, onRehydrate, onClearSession }) {
    const { id } = useParams();

    useEffect(() => {
        // If the URL id doesn't match the state sessionId, fetch from DB
        if (!isRehydrating && id && sessionId !== id) {
            onRehydrate(id);
        }
    }, [id, sessionId, isRehydrating, onRehydrate]);

    // Only run cleanup when the component UNMOUNTS (e.g. going back to Bank)
    useEffect(() => {
        return () => {
            if (onClearSession) {
                onClearSession();
            }
        };
    }, [onClearSession]);

    // Show loading if we are actively fetching, or if the state hasn't caught up to the URL
    if (isRehydrating || sessionId !== id) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center text-amber font-mono animate-pulse">
                Loading Session...
            </div>
        );
    }

    return (
        <ChatInterface
            key={id} // crucial to remount if jumping between sessions
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
  const { isDeveloper } = useAuth();

  // We keep this centralized for Test mode
  const [initialQuestion, setInitialQuestion] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [resumeHistory, setResumeHistory] = useState(null); // For re-hydrating from DB
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

  const handleStartTest = async (question, reaction = null) => {
    try {
      const payload = { question };
      if (reaction) payload.reaction = reaction;
      
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      
      const response = await fetch('http://localhost:8000/api/session/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 402) {
            setShowPremiumModal(true);
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
      alert("Failed to connect to Socra API. Make sure the backend is running.");
    }
  };

  // Re-hydrate session from DB when navigating directly to /test/:id
  const handleRehydrateSession = useCallback(async (id) => {
    setIsRehydrating(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      const res = await fetch(`http://localhost:8000/api/session/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
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
      navigate('/');
    } finally {
      setIsRehydrating(false);
    }
  }, [navigate]);

  const handleDevReset = async () => {
    if (!window.confirm('⚡ Dev: Reset all sessions and blueprints for your account?')) return;
    setDevResetting(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      const res = await fetch('http://localhost:8000/api/dev/reset-sessions', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('✅ Sessions reset. You can now test from scratch.');
      } else {
        alert('❌ Reset failed — check backend logs.');
      }
    } catch (e) {
      alert('❌ Could not reach the backend.');
    } finally {
      setDevResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textDefault relative overflow-x-hidden font-mono pt-16">
      <div className="noise-overlay"></div>
      <NavBar />
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      {/* Dev Mode Reset Button — only visible to developer accounts */}
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
        
        {/* Protected Routes */}
        <Route path="/app" element={<ProtectedRoute><ThemeSelection /></ProtectedRoute>} />
        <Route path="/conflicts/:themeId" element={<ProtectedRoute><ConflictSelection /></ProtectedRoute>} />
        <Route path="/conflict/:conflictId/read" element={<ProtectedRoute><ConflictReading /></ProtectedRoute>} />

        <Route path="/mode" element={<ProtectedRoute><ModeChoice /></ProtectedRoute>} />

        <Route path="/learn" element={<ProtectedRoute><LearnMode /></ProtectedRoute>} />

        <Route path="/test/init" element={<ProtectedRoute><TestModeInit onStartTest={handleStartTest} /></ProtectedRoute>} />
        
        <Route path="/test/:id" element={
          <ProtectedRoute>
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
          </ProtectedRoute>
        } />

        <Route path="/bank" element={<ProtectedRoute><SavedBlueprints /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />

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
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
