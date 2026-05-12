import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import BlueprintPanel from './learn/BlueprintPanel';
import FinalBlueprint from './FinalBlueprint';
import MilestoneCard from './MilestoneCard';

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchWithAuth, BASE_URL } from '../lib/supabase';
import { usePostHog } from '@posthog/react';


const SpineReadyCTA = () => (
    <div className="flex w-full my-6 pl-4 animate-fade-in">
        <div className="border border-amber/40 bg-amber/5 p-5 flex flex-col space-y-4 max-w-lg w-full">
            <div className="flex items-center space-x-2 border-b border-amber/20 pb-3">
                <span className="text-amber text-xs">✦</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber/80">Spine Ready</span>
            </div>
            <p className="font-serif text-sm text-textDefault/70 leading-relaxed">
                You have your position, your arguments, and the opposition's move. Click any paragraph in the Blueprint panel to develop your thinking further, or take a stab at writing your introduction.
            </p>
        </div>
    </div>
);

const MessageBubble = ({ role, content }) => {
    const isAI = role === 'assistant';
    const isPlato = role === 'plato';

    if (isPlato) {
        return (
            <div className="flex w-full mb-10 pl-4 animate-fade-in group">
                <div className="mr-4 mt-1 flex-shrink-0">
                    <span className="text-sage text-xs">✦</span>
                </div>
                <div className="prose prose-invert max-w-none font-serif text-lg text-sage/90 italic">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}components={{ hr: () => null }}>
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        );
    }

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
        case 2: return "Thesis locked. Now let's sketch your arguments. →";
        case 3: return "Skeleton ready. Time to go deeper. →";
        default: return "Advancing inquiry...";
    }
};

export default function ChatInterface({ sessionId, initialQuestion, initialMessage, resumeHistory, initialTurn = 1, initialScore = 0 }) {
    const { reaction } = useSession();
    const { showToast } = useToast();
    const posthog = usePostHog();

    const [messages, setMessages] = useState(() => {
        if (resumeHistory && resumeHistory.length > 0) return resumeHistory;
        if (initialMessage) return [{ role: 'assistant', content: initialMessage }];
        return [];
    });
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamHanging, setStreamHanging] = useState(false);

    const [phase, setPhase] = useState(() => {
        if (initialTurn && initialTurn > 1) return Math.min(initialTurn, 5);
        return reaction ? 2 : 1;
    });
    const [isFinished, setIsFinished] = useState(() => initialTurn > 5);
    const [showFinalScreen, setShowFinalScreen] = useState(false);
    const [platoReflection, setPlatoReflection] = useState(null);

    const [score, setScore] = useState(initialScore);
    const [toastMessage, setToastMessage] = useState(null);

    const [blueprint, setBlueprint] = useState(null);
    const [tension, setTension] = useState(null);
    const [evidence, setEvidence] = useState([]);

    const [deepDiveMode, setDeepDiveMode] = useState(() => initialTurn >= 3);
    const [activeDeepDive, setActiveDeepDive] = useState(null);

    const [milestoneQueue, setMilestoneQueue] = useState([]);
    const handleMilestoneReached = useCallback((flag) => {
        setMilestoneQueue(q => [...q, flag]);
    }, []);
    const handleMilestoneDismiss = useCallback(() => {
        setMilestoneQueue(q => q.slice(1));
    }, []);

    const [mobileTab, setMobileTab] = useState('chat');

    const messagesEndRef = useRef(null);
    const streamingMsgIdxRef = useRef(-1);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isStreaming]);

    const handleStream = async (userMsg) => {
        setIsStreaming(true);
        setStreamHanging(false);

        const controller = new AbortController();
        let firstChunkReceived = false;

        const hangTimer15 = setTimeout(() => {
            if (!firstChunkReceived) setStreamHanging(true);
        }, 15000);

        const hangTimer30 = setTimeout(() => {
            if (!firstChunkReceived) controller.abort();
        }, 30000);

        try {
            setMessages(prev => {
                const next = [...prev, { role: 'assistant', content: '' }];
                streamingMsgIdxRef.current = next.length - 1;
                return next;
            });

            const response = await fetchWithAuth(`${BASE_URL}/api/session/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: userMsg }),
                signal: controller.signal
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let currentTurnOutput = '';
            let sseBuffer = '';
            let currentEvent = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                if (!firstChunkReceived) {
                    firstChunkReceived = true;
                    clearTimeout(hangTimer15);
                    clearTimeout(hangTimer30);
                    setStreamHanging(false);
                }

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
                                            posthog?.capture('phase_advanced', {
                                                session_id: sessionId,
                                                question: initialQuestion,
                                                from_phase: phase,
                                                to_phase: meta.current_phase,
                                                score: meta.question_score,
                                            });
                                            setPhase(meta.current_phase);
                                            // Phase 3 transition is handled by the SpineReadyCTA card below
                                            if (meta.current_phase !== 3) {
                                                setMessages(prev => [...prev, { role: 'system_banner', content: getPhaseBanner(meta.current_phase) }]);
                                            }
                                            if (meta.current_phase === 2) {
                                                setMilestoneQueue(q => [...q, 'question_autopsy_complete']);
                                            }
                                        }
                                        if (meta.current_phase >= 6 && !isFinished) {
                                            posthog?.capture('session_completed', {
                                                session_id: sessionId,
                                                question: initialQuestion,
                                                final_score: meta.question_score,
                                            });
                                            setIsFinished(true);
                                            setTimeout(async () => {
                                                try {
                                                    const refRes = await fetchWithAuth(`${BASE_URL}/api/plato/reflect?session_id=${sessionId}`);
                                                    if (refRes.ok) {
                                                        const refData = await refRes.json();
                                                        setPlatoReflection(refData.message);
                                                    }
                                                } catch (e) {
                                                    console.error("Failed to fetch reflection", e);
                                                }
                                                setShowFinalScreen(true);
                                            }, 1500);
                                        }
                                    }
                                    if (meta.question_score !== undefined) {
                                        setScore(meta.question_score);
                                    }
                                    if (meta.skeleton_complete === true && !deepDiveMode) {
                                        setMilestoneQueue(q => [...q, 'argument_sketch_complete']);
                                        setDeepDiveMode(true);
                                        setMessages(prev => [...prev, { role: 'spine_ready' }]);
                                    }
                                    if (meta.insight_unlocked) {
                                        setToastMessage(meta.insight_unlocked);
                                        setTimeout(() => setToastMessage(null), 5000);

                                        fetchWithAuth(`${BASE_URL}/api/plato/insight-note?insight=${encodeURIComponent(meta.insight_unlocked)}&session_id=${sessionId}`)
                                            .then(res => res.json())
                                            .then(data => {
                                                if (data.message) {
                                                    setMessages(prev => [...prev, { role: 'plato', content: data.message }]);
                                                }
                                            })
                                            .catch(console.error);
                                    }
                                }
                            } catch (e) {
                                console.error("Metadata parse error", e);
                            }
                        } else if (currentEvent === 'message') {
                            try {
                                let textChunk = "";
                                if (dataStr.startsWith('"') && dataStr.endsWith('"')) {
                                    textChunk = JSON.parse(dataStr);
                                } else {
                                    textChunk = dataStr;
                                }
                                currentTurnOutput += textChunk;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const idx = streamingMsgIdxRef.current;
                                    if (idx >= 0 && idx < updated.length) {
                                        updated[idx] = { ...updated[idx], content: currentTurnOutput };
                                    }
                                    return updated;
                                });
                            } catch (e) {
                                console.error("Message parse error", e);
                                currentTurnOutput += dataStr;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const idx = streamingMsgIdxRef.current;
                                    if (idx >= 0 && idx < updated.length) {
                                        updated[idx] = { ...updated[idx], content: currentTurnOutput };
                                    }
                                    return updated;
                                });
                            }
                        }
                    }
                }
            }
        } catch (err) {
            // Remove the empty assistant placeholder added at stream start
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last?.content === '') {
                    return prev.slice(0, -1);
                }
                return prev;
            });

            if (err.name === 'AbortError') {
                showToast('SocraAI is not responding — please try again.', 'error');
            } else {
                console.error(err);
                showToast('Connection error. Please check your network.', 'error');
            }
        } finally {
            clearTimeout(hangTimer15);
            clearTimeout(hangTimer30);
            setStreamHanging(false);
            setIsStreaming(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMsg = input.trim();
        posthog?.capture('message_sent', {
            session_id: sessionId,
            question: initialQuestion,
            phase,
            message_length: userMsg.length,
        });
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

        await handleStream(userMsg);
    };

    const handleDraftIntro = () => {
        if (isStreaming) return;
        const msg = "I'd like to take a stab at writing my introduction now.";
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        handleStream(msg);
    };

    const handleDeepDiveSelect = async (key, message) => {
        if (isStreaming) return;
        setActiveDeepDive(key);
        setMessages(prev => [...prev, { role: 'user', content: message }]);
        await handleStream(message);
        setActiveDeepDive(null);
    };

    useEffect(() => {
        const fetchInitialGreeting = async () => {
            try {
                const res = await fetchWithAuth(`${BASE_URL}/api/plato/greeting?session_id=${sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.message) {
                        setMessages([{ role: 'plato', content: data.message }]);
                        handleStream("");
                    }
                } else {
                    handleStream("");
                }
            } catch (e) {
                console.error("Greeting fetch error", e);
                handleStream("");
            }
        };

        if (!resumeHistory && !initialMessage && messages.length === 0 && !isStreaming) {
            fetchInitialGreeting();
        }
    }, []);


    return (
        <div className="flex h-full w-full relative z-10 flex-col md:flex-row">

            {/* Mobile-only tab bar — hidden at md+ */}
            <div role="tablist" className="md:hidden flex shrink-0 border-b border-borderDark/40 bg-[#11100D]">
                <button
                    role="tab"
                    aria-selected={mobileTab === 'chat'}
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
                        mobileTab === 'chat' ? 'text-amber border-b-2 border-amber' : 'text-textMuted/60'
                    }`}
                >
                    ◆ Chat
                </button>
                <button
                    role="tab"
                    aria-selected={mobileTab === 'blueprint'}
                    onClick={() => setMobileTab('blueprint')}
                    className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
                        mobileTab === 'blueprint' ? 'text-amber border-b-2 border-amber' : 'text-textMuted/60'
                    }`}
                >
                    ◈ Blueprint
                </button>
            </div>

            {/* Conversation panel */}
            <div
                data-panel="chat"
                className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-col flex-1 md:flex-none md:w-[55%] md:h-full border-r-0 md:border-r border-borderDark/40 overflow-hidden relative`}
            >
                {/* Top bar */}
                <div className="min-h-16 flex items-center justify-between px-8 py-3 bg-[#11100D]/95 backdrop-blur-md border-b border-borderDark/40 z-30 shrink-0">
                    <div className="flex items-center overflow-hidden">
                        <span className="font-display text-xl text-textDefault tracking-wide shrink-0">Socra</span>
                        <span className="mx-4 text-borderDark shrink-0">|</span>
                        <span className="font-serif text-sm md:text-base text-textDefault/90 italic leading-relaxed py-1 truncate max-w-sm xl:max-w-xl">
                            "{initialQuestion}"
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0 ml-4 animate-fade-in group hover:bg-amber/5 p-1 rounded transition-colors" title="Out of 30 A-Level Marks">
                        <span className="text-[10px] uppercase tracking-widest text-textMuted/60 font-mono hidden md:block group-hover:text-amber/70 transition-colors">Argument Strength</span>
                        <div className="px-3 py-1 bg-background border border-amber/30 text-amber font-mono min-w-[70px] text-center flex justify-center items-baseline shadow-sm group-hover:border-amber transition-colors">
                            <span className="text-base font-bold">{score}</span>
                            <span className="text-amber/50 font-normal text-xs ml-1">/ 30</span>
                        </div>
                    </div>
                </div>

                {/* Toast notification (insight unlocked) */}
                {toastMessage && (
                    <div className="absolute top-20 right-8 z-50 animate-slide-in pointer-events-none">
                        <div className="flex items-center px-4 py-3 bg-[#11100D]/95 border border-amber shadow-[0_0_20px_rgba(212,175,55,0.15)] rounded-sm">
                            <span className="text-amber animate-pulse mr-4 text-xl">✦</span>
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-amber/70 font-mono mb-1">Insight Unlocked</div>
                                <div className="font-serif text-textDefault text-sm md:text-base font-medium tracking-wide">{toastMessage}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scrollable messages — only this region scrolls */}
                <div className="flex-1 overflow-y-auto px-8 py-10 pb-6">
                    {messages.map((msg, idx) => {
                        if (msg.role === 'system_banner') {
                            return (
                                <div key={idx} className="flex w-full mb-10 pl-4">
                                    <div className="mr-4 mt-1 flex-shrink-0">
                                        <span className="text-amber text-xs">◆</span>
                                    </div>
                                    <div className="prose prose-invert max-w-none font-serif text-lg">
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        }
                        if (msg.role === 'spine_ready') {
                            return <SpineReadyCTA key={idx} />;
                        }
                        return <MessageBubble key={idx} role={msg.role} content={msg.content} />;
                    })}
                    {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex w-full mb-10 pl-4 animate-fade-in">
                            <div className="mr-4 mt-1"><span className="text-amber text-xs animate-pulse">◆</span></div>
                            <div className="font-serif text-lg text-textMuted/50 animate-pulse">Thinking...</div>
                        </div>
                    )}
                    {streamHanging && (
                        <div className="flex justify-center w-full my-4">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-textMuted/50 animate-pulse">
                                Still thinking — this is taking a moment...
                            </span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Milestone card overlay */}
                <MilestoneCard
                    milestone={milestoneQueue[0] || null}
                    onDismiss={handleMilestoneDismiss}
                />

                {/* Input area */}
                <div
                    className="shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-6 px-4 md:px-8 z-20"
                    style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
                >
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
                            placeholder={isFinished ? "Inquiry complete. Revision mode active." : "Your structural response..."}
                            className={`w-full bg-background border border-borderDark text-sm text-textDefault placeholder-textMuted/40 focus:outline-none focus:border-amber transition-colors duration-300 resize-none py-4 px-6 font-mono leading-relaxed ${isFinished ? 'opacity-50 cursor-not-allowed' : ''}`}
                            rows={3}
                            disabled={isStreaming || isFinished}
                        />
                        <div className="absolute bottom-4 right-6 text-[10px] text-textMuted/40 uppercase tracking-widest font-mono">
                            ↵ to send
                        </div>
                    </form>
                    <p className="mt-2 text-[10px] font-mono text-textMuted/35 tracking-wide">
                        ✦ Sessions are auto-saved — view your progress anytime via <span className="text-textMuted/50">My Blueprints</span> in the sidebar.
                    </p>
                </div>
            </div>

            {/* Blueprint panel */}
            <div
                data-panel="blueprint"
                className={`${mobileTab === 'blueprint' ? 'flex' : 'hidden'} md:flex flex-col flex-1 md:flex-none md:w-[45%] md:h-full bg-[#11100D] overflow-hidden`}
            >
                <BlueprintPanel
                    sessionId={sessionId}
                    initialQuestion={initialQuestion}
                    onMilestoneReached={handleMilestoneReached}
                    deepDiveMode={deepDiveMode}
                    activeDeepDive={activeDeepDive}
                    onDeepDiveSelect={handleDeepDiveSelect}
                />
            </div>

            {showFinalScreen && (
                <FinalBlueprint
                    insights={blueprint?.unlocked_insights || []}
                    blueprint={blueprint}
                    platoReflection={platoReflection}
                />
            )}
        </div>
    );
}
