import { useState } from 'react';

export default function NudgeButton({ sessionId, disabled, onNudgeReceived }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleNudgeRequest = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/session/nudge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });

            if (response.ok) {
                const data = await response.json();
                onNudgeReceived(data.nudge);
            }
        } catch (error) {
            console.error("Failed to fetch nudge", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleNudgeRequest}
            disabled={disabled || isLoading}
            className="text-[10px] font-mono uppercase tracking-widest text-amber/60 hover:text-amber border border-amber/20 hover:bg-amber/5 px-3 py-1 ml-4 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
        >
            {isLoading ? (
                <span className="animate-pulse">Thinking...</span>
            ) : (
                <>
                    <span className="mr-1">💡</span> I need a nudge
                </>
            )}
        </button>
    );
}
