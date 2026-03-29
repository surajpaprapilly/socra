import { useNavigate } from 'react-router-dom';

/**
 * GPQuestionPicker
 * ----------------
 * Shown after a user finishes reading conflict articles.
 * Displays the GP exam questions linked to this conflict and lets the student
 * pick the one they want to engage with in the Socratic tutor (GP Gym).
 *
 * Props:
 *  conflict  — the CONFLICTS entry for the current conflict
 *  onBack    — callback to go back to reading (optional, used if user wants to re-read)
 */
export default function GPQuestionPicker({ conflict, onBack }) {
    const navigate = useNavigate();

    const questions = conflict.examQuestions || [];

    const handleSelect = (question) => {
        navigate('/test/init', { state: { question } });
    };

    return (
        <div className="w-full flex justify-center py-16 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-[680px] w-full flex flex-col">

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center text-amber text-xl mb-6">
                        ✓
                    </div>
                    <h2 className="font-display text-3xl text-white mb-3 leading-snug">
                        Good. Now choose your question.
                    </h2>
                    <p className="font-serif text-[15px] text-textMuted leading-relaxed">
                        These are real A-Level GP questions tied to{' '}
                        <span className="text-amber italic">{conflict.title}</span>.
                        Pick one — the Socratic tutor will take it from there.
                    </p>
                </div>

                {/* Question cards */}
                <div className="flex flex-col gap-4 mb-10">
                    {questions.map((question, idx) => (
                        <button
                            key={idx}
                            id={`gp-question-${idx}`}
                            onClick={() => handleSelect(question)}
                            className="group w-full text-left px-6 py-5 border border-borderDark bg-[#0F0E0C] hover:border-amber hover:bg-amber/5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-amber"
                        >
                            <div className="flex items-start gap-4">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-amber/50 group-hover:text-amber pt-[3px] transition-colors shrink-0">
                                    Q{idx + 1}
                                </span>
                                <p className="font-serif text-[15px] text-textMuted group-hover:text-white leading-relaxed transition-colors">
                                    {question}
                                </p>
                                <span className="ml-auto text-amber/30 group-hover:text-amber transition-colors text-lg shrink-0 pl-2">
                                    →
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Back link */}
                {onBack && (
                    <div className="flex justify-center">
                        <button
                            onClick={onBack}
                            className="font-mono text-xs text-textMuted/50 hover:text-textMuted uppercase tracking-widest transition-colors"
                        >
                            ← Go back to readings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
