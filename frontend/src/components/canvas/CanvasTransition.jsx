import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';

export default function CanvasTransition() {
  const { conflictId } = useParams();
  const navigate = useNavigate();
  const { session, setSession, canvasData, sideA, sideB } = useSession();

  const [step, setStep] = useState(0); 
  const [transitionData, setTransitionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!canvasData) {
      navigate('/');
      return;
    }

    const cards = canvasData.cards;
    const connectors = canvasData.connectors;
    const leaning = canvasData.inferredLeaning;
    
    let isMounted = true;

    const processCanvas = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/learn/canvas-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conflict_id: conflictId,
                side_a: sideA,
                side_b: sideB,
                cards: cards,
                connectors: connectors,
                inferred_leaning: leaning
            })
        });

        if (!response.ok) throw new Error("API Error");
        
        const data = await response.json();
        if (isMounted) {
            setTransitionData(data);
        }

      } catch (err) {
        console.error(err);
        // Provide graceful fallback
        if (isMounted) {
            setTransitionData({
                transition_message: `You placed ${cards.length} ideas and drew ${connectors.length} connections.`,
                opening_socratic_question: `You've mapped out the tension between ${sideA} and ${sideB}. Which piece of evidence on your canvas do you think is the hardest to refute, and why?`,
                inferred_position: leaning
            });
        }
      }
    };

    processCanvas();

    // Staggered text animation
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 2000),
      setTimeout(() => setStep(3), 3500)
    ];

    return () => {
      isMounted = false;
      timers.forEach(clearTimeout);
    };
  }, [canvasData, navigate, conflictId, sideA, sideB]);

  if (!canvasData) return null;

  const { inferredLeaning, cards, connectors } = canvasData;

  const getLeaningText = () => {
    if (inferredLeaning === 'side_a') return `You put more on the ${sideA} side.\nLet's see if you can defend that.`;
    if (inferredLeaning === 'side_b') return `You put more on the ${sideB} side.\nLet's see if you can defend that.`;
    return `You seem genuinely torn between both sides.\nThat's actually a strong place to argue from.`;
  };

  const startSession = () => {
    // We update the session to prepare for TestModeInit or ChatInterface
    // The previous prompt had "Test Mode", but we want to go to the socratic session.
    // The user instruction:
    // "The Socratic session opens with: The conflict framed as a GP question...
    // First AI message references their canvas arrangement specifically"
    
    // We can simulate the start of a session the same way mode choice does.
    setSession({
        ...session,
        // The chat UI expects `statement` or `customQuestion` as the prompt.
        // For conflicts, we'll assign the custom question.
        customQuestion: `${sideA} vs ${sideB}`,
        canvasProcessed: true,
        // Provide the opening message from backend directly to avoid refetching
        first_message: transitionData?.opening_socratic_question
    });

    navigate('/mode'); // Let them choose Chat or Essay, then proceed
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center bg-[#0D0C0A] relative z-10 p-6 text-center">
      
      <div className="flex flex-col items-center max-w-[600px] w-full space-y-12">
        
        {/* Step 1: ✓ Your thinking is mapped */}
        <div className={`transition-all duration-1000 transform ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <span className="text-[#7A9E7E] font-serif text-[40px] italic leading-none">✓</span>
            <h2 className="font-display text-[32px] text-white">Your thinking is mapped.</h2>
          </div>
        </div>

        {/* Step 2: Stats */}
        <div className={`transition-all duration-1000 transform ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="font-mono text-[13px] uppercase tracking-widest text-[#6B6560]">
            You placed <span className="text-white">{cards.length}</span> ideas and drew <span className="text-white">{connectors.length}</span> connections.
          </p>
        </div>

        {/* Step 3: Leaning + Button */}
        <div className={`transition-all duration-1000 transform ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} flex flex-col items-center w-full`}>
          
          <p className="font-serif italic text-lg text-amber whitespace-pre-line leading-relaxed mb-12">
            {transitionData?.transition_message || getLeaningText()}
          </p>
          
          <button
            onClick={startSession}
            disabled={!transitionData}
            className={`
              w-full md:w-auto px-10 py-4 font-mono text-[13px] tracking-widest uppercase transition-all duration-300 focus:outline-none
              ${transitionData ? 'bg-amber text-[#0D0C0A] hover:brightness-110 shadow-[0_4px_20px_rgba(200,150,62,0.2)]' : 'bg-[#141210] text-[#6B6560] cursor-not-allowed'}
            `}
          >
            {transitionData ? 'Begin Socratic Session →' : 'Analyzing...'}
          </button>
        </div>

      </div>

    </div>
  );
}
