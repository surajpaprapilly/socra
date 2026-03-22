import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import LandingScreen from './components/LandingScreen'; // Kept for reference but unused in main flow
import ThemeSelection from './components/ThemeSelection';
import ConflictSelection from './components/conflicts/ConflictSelection';
import ConflictReading from './components/conflicts/ConflictReading';

import ModeChoice from './components/ModeChoice';
import ChatInterface from './components/ChatInterface';
import NavBar from './components/NavBar';
import LearnMode from './components/learn/LearnMode';
import BankView from './components/bank/BankView';

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

  const handleStartTest = async (question, reaction = null) => {
    try {
      const payload = { question };
      if (reaction) payload.reaction = reaction;
      
      const response = await fetch('http://localhost:8000/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to start session");

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

      <Routes>
        <Route path="/" element={<ThemeSelection />} />
        <Route path="/conflicts/:themeId" element={<ConflictSelection />} />
        <Route path="/conflict/:conflictId/read" element={<ConflictReading />} />

        <Route path="/mode" element={<ModeChoice />} />

        {/* Existing /learn - we kept the same route, LearnMode will parse Context */}
        <Route path="/learn" element={<LearnMode />} />

        {/* This intermediate route receives the question from ModeChoice and starts the backend session */}
        <Route path="/test/init" element={<TestModeInit onStartTest={handleStartTest} />} />
        
        <Route path="/test/:id" element={
          sessionId ? (
            <ChatInterface
              sessionId={sessionId}
              initialQuestion={initialQuestion}
              initialMessage={initialMessage}
            />
          ) : (
            <ThemeSelection />
          )
        } />

        <Route path="/bank" element={<BankView />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;
