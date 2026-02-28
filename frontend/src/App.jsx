import { useState } from 'react';
import LandingScreen from './components/LandingScreen';
import ChatInterface from './components/ChatInterface';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [initialQuestion, setInitialQuestion] = useState("");
  const [initialMessage, setInitialMessage] = useState("");

  const handleStartSession = async (question) => {
    try {
      const response = await fetch('http://localhost:8000/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        throw new Error("Failed to start session");
      }

      const data = await response.json();
      setSessionId(data.session_id);
      setInitialQuestion(question);
      setInitialMessage(data.first_message);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to connect to Socra API. Make sure the backend is running.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-textDefault relative overflow-hidden font-mono">
      {/* Global CSS noise overlay is handled in index.css */}
      <div className="noise-overlay"></div>

      {!sessionId ? (
        <LandingScreen onStart={handleStartSession} />
      ) : (
        <ChatInterface
          sessionId={sessionId}
          initialQuestion={initialQuestion}
          initialMessage={initialMessage}
        />
      )}
    </div>
  );
}

export default App;
