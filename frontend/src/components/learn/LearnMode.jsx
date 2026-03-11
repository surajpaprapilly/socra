import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import StageIndicator from './StageIndicator';
import ReadStage from './ReadStage';
import SummariseStage from './SummariseStage';
import BankTransition from './BankTransition';

export default function LearnMode() {
    const location = useLocation();
    const { statement, source, customQuestion } = useSession();
    
    // First try the custom question passed from ModeChoice or direct custom input, 
    // fall back to statement, then location state.
    const question = location.state?.question || (source === 'statement' ? statement : customQuestion);

    const [currentStage, setCurrentStage] = useState(1);
    const [readingsRead, setReadingsRead] = useState([]);
    const [articleNotes, setArticleNotes] = useState([]);

    // If accessed directly without a question, redirect to landing
    if (!question) {
        return <Navigate to="/" replace />;
    }

    const handleReadComplete = (selectedReadings, finalNotes) => {
        setReadingsRead(selectedReadings);
        setArticleNotes(finalNotes);
        setCurrentStage(2);
    };

    const handleBankReady = (entryId, fullEntryData) => {
        // In a more complex app, we might save this in global state, 
        // but for now we just move to the transition screen
        setCurrentStage(3);
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
                <SummariseStage
                    question={question}
                    readingsRead={readingsRead}
                    articleNotes={articleNotes}
                    onBankReady={handleBankReady}
                />
            )}

            {currentStage === 3 && (
                <BankTransition
                    question={question}
                />
            )}
        </div>
    );
}
