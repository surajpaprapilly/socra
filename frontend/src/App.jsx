import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { AuthProvider } from './context/AuthContext';
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
import PremiumModal from './components/PremiumModal';
import { supabase } from './lib/supabase';

// Helper component to handle Test Mode initialization
function TestModeInit({ onStartTest }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { reaction } = useSession();
    
    useEffect(() => {
        if (location.state?.question) {
            onStartTest(location.state.question, reaction);
        } else {
            navigate('/');
        }
    }, [location, reaction, onStartTest, navigate]);

    return (
        <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center text-amber font-mono animate-pulse">
            Initializing Session...
        </div>
    );
}

function AppRoutes() {
  const navigate = useNavigate();

  // We keep this centralized for Test mode
  const [initialQuestion, setInitialQuestion] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);
  
  const [showPremiumModal, setShowPremiumModal] = useState(false);

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

  return (
    <div className="min-h-screen bg-background text-textDefault relative overflow-x-hidden font-mono pt-16">
      <div className="noise-overlay"></div>
      <NavBar />
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

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
            {sessionId ? (
              <ChatInterface
                sessionId={sessionId}
                initialQuestion={initialQuestion}
                initialMessage={initialMessage}
              />
            ) : (
              <ThemeSelection />
            )}
          </ProtectedRoute>
        } />

        <Route path="/bank" element={<ProtectedRoute><SavedBlueprints /></ProtectedRoute>} />
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
