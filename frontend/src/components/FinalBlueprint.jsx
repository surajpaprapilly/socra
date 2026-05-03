import { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { fetchWithAuth, BASE_URL } from '../lib/supabase';

export default function FinalBlueprint({ insights, blueprint, platoReflection }) {
    const [copied, setCopied] = useState(false);
    const [savedToBank, setSavedToBank] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { customQuestion, readings, canvasData } = useSession();
    const { showToast } = useToast();

    const paragraphs = blueprint?.paragraphs || [];
    const counterArg = blueprint?.counter_argument;
    const conclusion = blueprint?.conclusion;

    const handleExport = () => {
        if (!blueprint) return;

        const paraLines = paragraphs.map((p, i) =>
            `[ARGUMENT ${i + 1}]\n${p.topic_sentence || 'Not established'}`
        ).join('\n\n');

        const text = [
            '# My GP Essay Blueprint',
            '',
            '[THESIS]',
            blueprint.thesis || 'Not established',
            '',
            paraLines,
            '',
            '[COUNTERARGUMENT]',
            counterArg?.their_claim || 'Not established',
            '',
            '[SYNTHESIS]',
            conclusion?.synthesis || 'Not established',
            '',
            '[LENSES EXPLORED]',
            insights.length > 0 ? insights.join(', ') : 'None',
        ].join('\n').trim();

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveToBank = async () => {
        if (!blueprint || isSaving || savedToBank) return;
        setIsSaving(true);

        try {
            const paraSummary = paragraphs.map((p, i) =>
                `Argument ${i + 1}: ${p.topic_sentence || 'N/A'}`
            ).join('\n');

            const body = {
                question: customQuestion || "Final Essay Plan",
                summary: `Thesis: ${blueprint.thesis || 'N/A'}\n${paraSummary}\nCounterargument: ${counterArg?.their_claim || 'N/A'}\nSynthesis: ${conclusion?.synthesis || 'N/A'}`,
                follow_up_response: "",
                insight_tags: insights || [],
                readings: readings || [],
                canvas_data: canvasData || null
            };

            const response = await fetchWithAuth(`${BASE_URL}/api/bank/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setSavedToBank(true);
            } else {
                showToast('Failed to save blueprint.', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error saving blueprint — check your connection.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-8 animate-fade-in overflow-y-auto">
            <div className="max-w-3xl w-full border border-amber/20 bg-[#11100D] p-12 shadow-2xl relative my-auto">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-amber/40"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-amber/40"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-amber/40"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-amber/40"></div>

                <div className="text-center mb-10">
                    <h2 className="font-display text-4xl text-amber mb-2">Inquiry Complete</h2>
                    <p className="font-mono text-xs uppercase tracking-widest text-textMuted mb-6">You didn't get an essay. You built a blueprint.</p>
                    {(customQuestion || (blueprint && blueprint.question)) && (
                         <h3 className="font-serif text-xl md:text-2xl text-textDefault leading-relaxed px-4 mx-auto max-w-2xl border-t border-borderDark/30 pt-6">
                            "{customQuestion || blueprint.question}"
                         </h3>
                    )}
                </div>

                {platoReflection && (
                    <div className="mb-10 p-6 border border-amber/30 bg-amber/5 rounded-sm relative">
                        <div className="absolute -top-3 left-6 bg-[#11100D] px-2 font-mono text-[10px] text-amber uppercase tracking-widest">Plato Says</div>
                        <p className="font-serif text-lg text-amber/90 italic leading-relaxed">"{platoReflection}"</p>
                    </div>
                )}

                {blueprint ? (
                    <div className="space-y-6 font-serif text-lg text-textDefault/90 mb-12">
                        {[
                            { label: 'THESIS', text: blueprint.thesis },
                            ...paragraphs.map((p, i) => ({ label: `ARGUMENT ${i + 1}`, text: p.topic_sentence })),
                            { label: 'COUNTERARGUMENT', text: counterArg?.their_claim },
                            { label: 'SYNTHESIS', text: conclusion?.synthesis, isFinal: true },
                        ].map((section, idx) => (
                            <div key={idx} className={`border-l-2 pl-4 ${section.text ? (section.isFinal ? 'border-amber/50' : 'border-amber/30') : 'border-borderDark/30'}`}>
                                <span className={`block font-mono text-[10px] uppercase tracking-widest mb-1 ${section.text ? 'text-textMuted' : 'text-textMuted/40'}`}>
                                    {section.label}
                                </span>
                                <p className={section.text ? (section.isFinal ? 'italic text-amber/90' : 'text-textDefault') : 'text-textMuted/40 italic text-sm'}>
                                    {section.text ? `"${section.text}"` : 'Not established during inquiry.'}
                                </p>
                            </div>
                        ))}

                        {insights.length > 0 && (
                            <div className="border-l-2 border-sage/30 pl-4 mt-8 pt-4">
                                <span className="block font-mono text-[10px] text-sage uppercase tracking-widest mb-2">Perspectives Synthesized</span>
                                <div className="flex flex-wrap gap-2">
                                    {insights.map((insight, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-1 bg-sage/10 text-sage text-xs font-mono">
                                            {insight}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-textMuted my-12 italic font-serif">No blueprint data available.</div>
                )}

                <div className="mt-12 flex justify-center space-x-6 flex-wrap gap-y-4">
                    <button
                        onClick={handleExport}
                        className={`px-6 py-3 border font-mono tracking-widest uppercase text-[11px] transition-colors duration-300 ${copied ? 'bg-amber/20 border-amber text-amber' : 'bg-transparent border-amber/50 text-amber hover:bg-amber/10'}`}
                    >
                        {copied ? 'Copied to Clipboard ✓' : 'Export Essay Plan'}
                    </button>

                    <button
                        onClick={handleSaveToBank}
                        disabled={savedToBank || isSaving}
                        className={`px-6 py-3 border font-mono tracking-widest uppercase text-[11px] transition-colors duration-300 ${savedToBank ? 'bg-[#7A9E7E]/20 border-[#7A9E7E] text-[#7A9E7E]' : 'bg-transparent border-[#7A9E7E] text-[#7A9E7E] hover:bg-[#7A9E7E]/10 disabled:opacity-50'}`}
                    >
                        {isSaving ? 'Saving...' : savedToBank ? 'Saved Blueprint ✓' : 'Save Blueprint'}
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-transparent border border-borderDark text-textDefault/70 font-mono tracking-widest uppercase text-[11px] hover:border-textDefault hover:text-textDefault transition-colors"
                    >
                        Begin New Inquiry
                    </button>
                </div>
            </div>
        </div>
    );
}
