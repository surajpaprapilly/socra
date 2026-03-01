import { useNavigate } from 'react-router-dom';

export default function BankTransition({ question }) {
    const navigate = useNavigate();

    const handleStartTest = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });
            if (!response.ok) throw new Error("Failed to start session");
            const data = await response.json();
            navigate(`/test/${data.session_id}`);
        } catch (error) {
            console.error(error);
            alert("Failed to start Test Mode.");
        }
    };

    return (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-1000">
            <div className="text-center space-y-8 max-w-xl">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber/10 flex items-center justify-center mb-6 text-amber text-2xl border border-amber/30">
                    ✓
                </div>

                <h2 className="font-display text-4xl text-textDefault">
                    Added to your Knowledge Bank
                </h2>

                <p className="font-serif text-lg text-textMuted leading-relaxed">
                    You've read. You've synthesised.<br />
                    <span className="text-amber">Now let's see if you can defend it.</span>
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center pt-8">
                    <button
                        onClick={handleStartTest}
                        className="px-8 py-4 bg-amber/10 border border-amber text-amber font-mono tracking-widest uppercase text-xs transition-all duration-300 hover:bg-amber hover:text-background focus:outline-none"
                    >
                        [ Enter Test Mode with this question → ]
                    </button>

                    <button
                        onClick={() => navigate('/bank')}
                        className="px-8 py-4 bg-transparent border border-borderDark text-textMuted font-mono tracking-widest uppercase text-xs transition-all duration-300 hover:border-textMuted hover:text-textDefault focus:outline-none"
                    >
                        Go to Knowledge Bank →
                    </button>
                </div>
            </div>
        </div>
    );
}
