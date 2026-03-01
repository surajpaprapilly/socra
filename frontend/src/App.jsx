import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingScreen from './components/LandingScreen';
import ChatInterface from './components/ChatInterface';
import NavBar from './components/NavBar';
import LearnMode from './components/learn/LearnMode';
import BankView from './components/bank/BankView';

function AppRoutes() {
  const navigate = useNavigate();

  // We keep this centralized for Test mode
  const [initialQuestion, setInitialQuestion] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);

  const handleStartTest = async (question) => {
    try {
      const response = await fetch('http://localhost:8000/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
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
        <Route path="/" element={<LandingScreen onStartTest={handleStartTest} />} />

        <Route path="/test/:id" element={
          sessionId ? (
            <ChatInterface
              sessionId={sessionId}
              initialQuestion={initialQuestion}
              initialMessage={initialMessage}
            />
          ) : (
            <LandingScreen onStartTest={handleStartTest} />
          )
        } />

        <Route path="/learn" element={<LearnMode />} />

        <Route path="/bank" element={<BankView />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
