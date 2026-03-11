import { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import StageIndicator from './StageIndicator';
import ReadStage from './ReadStage';
import SummariseStage from './SummariseStage';
import BankTransition from './BankTransition';

export default function LearnMode() {
    const location = useLocation();
    const question = location.state?.question;

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
