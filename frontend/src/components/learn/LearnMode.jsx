import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import StageIndicator from './StageIndicator';
import ReadStage from './ReadStage';
import BankTransition from './BankTransition';

export default function LearnMode() {
    const location = useLocation();
    const { statement, source, customQuestion } = useSession();
    
    // First try the custom question passed from ModeChoice or direct custom input, 
    // fall back to statement, then location state.
    const question = location.state?.question || (source === 'statement' ? statement : customQuestion);

    const [currentStage, setCurrentStage] = useState(1);


    // If accessed directly without a question, redirect to landing
    if (!question) {
        return <Navigate to="/" replace />;
    }

    const handleReadComplete = () => {
        setCurrentStage(2);
    };

    return (
        <div className="w-full min-h-[calc(100vh-64px)] flex flex-col bg-background">
            <StageIndicator currentStage={currentStage} />

            {source === 'statement' && statement && (
                <div className="w-full flex justify-center py-4 bg-[#141210] border-b border-[#2A2825]">
                    <span className="font-mono text-xs text-textMuted uppercase tracking-widest text-center px-6">
                        You're exploring: <span className="text-amber italic normaleCase font-serif text-[15px]">"{statement}"</span>
                    </span>
                </div>
            )}

            {currentStage === 1 && (
                <ReadStage
                    question={question}
                    onComplete={handleReadComplete}
                />
            )}

            {currentStage === 2 && (
                <BankTransition
                    question={question}
                />
            )}
        </div>
    );
}
