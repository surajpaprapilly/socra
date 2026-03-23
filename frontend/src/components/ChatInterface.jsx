import { useState, useRef, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import FinalBlueprint from './FinalBlueprint';
import BlueprintPanel from './learn/BlueprintPanel';
import NudgeButton from './NudgeButton';

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


const MessageBubble = ({ role, content }) => {
    const isAI = role === 'assistant';

    if (isAI) {
        return (
            <div className="flex w-full mb-10 pl-4 animate-fade-in group">
                <div className="mr-4 mt-1 flex-shrink-0">
                    <span className="text-amber text-xs animate-pulse">◆</span>
                </div>
                <div className="prose prose-invert max-w-none font-serif text-lg">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}components={{
                            hr: () => null
                        }}
                    >
                        {content}
                    </ReactMarkdown>
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
    
    const [messages, setMessages] = useState(
        initialMessage ? [{ role: 'assistant', content: initialMessage }] : []
    );
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    // Metadata states - start at phase 2 if reaction was provided
    const [phase, setPhase] = useState(reaction ? 2 : 1);
    const [isFinished, setIsFinished] = useState(false);

    // Living Blueprint states
    const [blueprint, setBlueprint] = useState(null);
    const [tension, setTension] = useState(null);
    const [evidence, setEvidence] = useState([]);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    const handleStream = async (userMsg) => {
        setIsStreaming(true);
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
            let sseBuffer = '';
            let currentEvent = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                sseBuffer += chunk;
                
                const lines = sseBuffer.split('\n');
                sseBuffer = lines.pop();

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        
        await handleStream(userMsg);
    };

    useEffect(() => {
        if (!initialMessage && messages.length === 0 && !isStreaming) {
            handleStream("");
        }
    }, [initialMessage, messages.length, isStreaming]);

    return (
        <div className="flex h-screen w-full relative z-10 flex-col md:flex-row">
            {/* 55% Conversation Area */}
            <div className="w-full md:w-[55%] h-[50vh] md:h-full flex flex-col border-r-0 md:border-r border-b md:border-b-0 border-borderDark/40 relative overflow-hidden">

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
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-12 pb-8 px-8 z-20">
                    <form onSubmit={handleSubmit} className="relative group w-full xl:max-w-4xl">
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

            {/* 45% Blueprint Panel */}
            <div className="w-full md:w-[45%] h-[50vh] md:h-full bg-[#11100D] flex flex-col relative overflow-y-auto overflow-x-hidden z-20">
                <BlueprintPanel sessionId={sessionId} initialQuestion={initialQuestion} />
            </div>

            {/* Final Payoff Overlay */}
            {isFinished && <FinalBlueprint />}
        </div>
    );
}
