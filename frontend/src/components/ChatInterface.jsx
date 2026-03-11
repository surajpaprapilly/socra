import { useState, useRef, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import ArgumentMap from './ArgumentMap';
import FinalBlueprint from './FinalBlueprint';
import NudgeButton from './NudgeButton';
import InsightTag from './InsightTag';

const QuestionScoreBar = ({ score }) => {
    return (
        <div className="flex flex-col mb-8">
            <span className="text-xs font-mono uppercase text-textMuted tracking-wider mb-2">Depth of Inquiry</span>
            <div className="flex items-baseline space-x-2">
                <span className="font-display text-6xl text-amber leading-none score-number transition-all duration-500">{score || '-'}</span>
                <span className="font-mono text-sm text-textMuted uppercase">/ 10</span>
            </div>
        </div>
    );
};


const MessageBubble = ({ role, content }) => {
    const isAI = role === 'assistant';

    if (isAI) {
        return (
            <div className="flex w-full mb-10 pl-4 animate-fade-in group">
                <div className="mr-4 mt-1 flex-shrink-0">
                    <span className="text-amber text-xs animate-pulse">◆</span>
                </div>
                <div className="font-serif text-lg leading-relaxed text-textDefault pr-12 max-w-2xl whitespace-pre-wrap">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-end w-full mb-10 pr-4 animate-fade-in">
            <div className="font-mono text-sm text-textMuted leading-loose max-w-xl text-right p-4 border border-borderDark/50 bg-background/50 hover:border-amber/30 transition-colors">
                {content}
            </div>
        </div>
    );
};

const getPhaseBanner = (phaseNum) => {
    switch (phaseNum) {
        case 2: return "You've staked your position. Now let's stress-test it. →";
        case 3: return "Good. Now defend it against the counterargument. →";
        case 4: return "Now consider the hidden lens. Concede some ground. →";
        case 5: return "Almost there. Synthesize the core tension into one stance. →";
        default: return "Advancing inquiry...";
    }
};

export default function ChatInterface({ sessionId, initialQuestion, initialMessage }) {
    const { reaction } = useSession();
    
    const [messages, setMessages] = useState([
        { role: 'assistant', content: initialMessage }
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    // Metadata states - start at phase 2 if reaction was provided
    const [phase, setPhase] = useState(reaction ? 2 : 1);
    const [score, setScore] = useState(0);
    const [insights, setInsights] = useState([]);
    const [lazyWarning, setLazyWarning] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // Living Blueprint states
    const [blueprint, setBlueprint] = useState(null);
    const [tension, setTension] = useState(null);
    const [evidence, setEvidence] = useState([]);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsStreaming(true);
        setLazyWarning(false); // reset warning on new message

        try {
            // Create empty assistant message placeholder to stream into
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            const response = await fetch('http://localhost:8000/api/session/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: userMsg })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let currentTurnOutput = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                let currentEvent = null;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('event: ')) {
                        currentEvent = line.substring(7).trim();
                    } else if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6).trim();
                        if (dataStr === '[DONE]') {
                            break;
                        }

                        if (currentEvent === 'metadata') {
                            try {
                                if (dataStr && dataStr !== '{}') {
                                    const meta = JSON.parse(dataStr);
                                    if (meta.question_score) setScore(meta.question_score);
                                    if (meta.insight_unlocked && !insights.includes(meta.insight_unlocked)) {
                                        setInsights(prev => [...prev, meta.insight_unlocked]);
                                    }
                                    if (meta.lazy_example) setLazyWarning(true);
                                    if (meta.current_phase) {
                                        if (meta.current_phase > phase && meta.current_phase <= 5) {
                                            setPhase(meta.current_phase);
                                            // Render interstitial banner in chat when phases change
                                            setMessages(prev => [...prev, { role: 'system_banner', content: getPhaseBanner(meta.current_phase) }]);
                                        }
                                        if (meta.current_phase > 5) {
                                            setIsFinished(true); // Trigger payoff screen
                                        }
                                    }
                                    if (meta.blueprint) setBlueprint(meta.blueprint);
                                    if (meta.tension_axis) setTension(meta.tension_axis);
                                    if (meta.evidence) setEvidence(meta.evidence);
                                }
                            } catch (e) {
                                console.error("Metadata parse error", e);
                            }
                        } else if (currentEvent === 'message') {
                            try {
                                // Parse the JSON encoded string chunk
                                let textChunk = "";
                                if (dataStr.startsWith('"') && dataStr.endsWith('"')) {
                                    textChunk = JSON.parse(dataStr);
                                } else {
                                    textChunk = dataStr;
                                }
                                currentTurnOutput += textChunk;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const lastIdx = updated.length - 1;
                                    updated[lastIdx] = {
                                        ...updated[lastIdx],
                                        content: currentTurnOutput
                                    };
                                    return updated;
                                });
                            } catch (e) {
                                console.error("Message parse error", e);
                                // Fallback literal appending if not json string
                                currentTurnOutput += dataStr;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    updated[updated.length - 1].content = currentTurnOutput;
                                    return updated;
                                });
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="flex h-screen w-full relative z-10">
            {/* 65% Conversation Area */}
            <div className="w-[65%] h-full flex flex-col border-r border-borderDark/40">

                {/* Top bar minimal */}
                <div className="h-16 flex items-center px-8 border-b border-borderDark/20 bg-background/90 backdrop-blur-sm z-20">
                    <span className="font-display text-xl text-textDefault tracking-wide">Socra</span>
                    <span className="mx-4 text-borderDark">|</span>
                    <span className="font-mono text-xs text-textMuted truncate max-w-md uppercase tracking-wider">
                        {initialQuestion}
                    </span>
                </div>

                {/* Scrollable messages */}
                <div className="flex-1 overflow-y-auto px-8 py-10 pb-32">
                    {messages.map((msg, idx) => {
                        if (msg.role === 'system_banner') {
                            return (
                                <div key={idx} className="flex justify-center w-full my-8 animate-slide-in">
                                    <div className="py-2 px-6 border border-borderDark/50 bg-background/80 flex items-center space-x-3">
                                        <span className="text-amber/70 font-display italic">Phase Transition</span>
                                        <span className="w-4 h-[1px] bg-borderDark"></span>
                                        <span className="font-mono text-xs uppercase tracking-widest text-textMuted/80">{msg.content}</span>
                                    </div>
                                </div>
                            );
                        }
                        return <MessageBubble key={idx} role={msg.role} content={msg.content} />;
                    })}
                    {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex w-full mb-10 pl-4 animate-fade-in">
                            <div className="mr-4 mt-1"><span className="text-amber text-xs animate-pulse">◆</span></div>
                            <div className="font-serif text-lg text-textMuted/50 animate-pulse">Thinking...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 w-[65%] bg-gradient-to-t from-background via-background to-transparent pt-12 pb-8 px-8 z-20">
                    <form onSubmit={handleSubmit} className="relative group max-w-3xl mx-auto">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder="Your structural response..."
                            className="w-full bg-background border border-borderDark text-sm text-textDefault placeholder-textMuted/40 focus:outline-none focus:border-amber transition-colors duration-300 resize-none py-4 px-6 font-mono leading-relaxed"
                            rows={3}
                            disabled={isStreaming}
                        />
                        <div className="absolute top-4 right-6">
                            <NudgeButton sessionId={sessionId} disabled={isStreaming} onNudgeReceived={(nudgeText) => {
                                setMessages(prev => [...prev, { role: 'assistant', content: "💡 " + nudgeText }]);
                            }} />
                        </div>
                        <div className="absolute bottom-4 right-6 text-[10px] text-textMuted/40 uppercase tracking-widest font-mono">
                            ↵ to send
                        </div>
                    </form>
                </div>
            </div>

            {/* 35% Thinking Panel */}
            <div className="w-[35%] h-full bg-[#11100D] p-10 flex flex-col overflow-y-auto z-20">
                <ArgumentMap currentPhase={phase} blueprint={blueprint} tension={tension} evidence={evidence} />

                <div className="my-8 w-full h-[1px] bg-borderDark/30"></div>

                <QuestionScoreBar score={score} />

                {lazyWarning && (
                    <div className="mb-8 p-4 border border-amber/30 bg-amber/5 text-amber text-xs font-mono flex items-start animate-fade-in">
                        <span className="mr-2 mt-[1px]">⚠</span>
                        <span>Consider a more specific example. Broad assertions lack analytical rigor.</span>
                    </div>
                )}

                {insights.length > 0 && (
                    <div className="mt-8 flex flex-col">
                        <span className="text-xs font-mono uppercase text-textMuted tracking-wider mb-4">Perspectives Introduced</span>
                        <div className="flex flex-col space-y-3 items-start">
                            {insights.map((insight, idx) => (
                                <InsightTag key={idx} insight={insight} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Final Payoff Overlay */}
            {isFinished && <FinalBlueprint insights={insights} blueprint={blueprint} />}
        </div>
    );
}
