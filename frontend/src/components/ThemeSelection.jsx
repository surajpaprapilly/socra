import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { THEMES } from '../data/themes';
import { PAST_YEAR_QUESTIONS } from '../data/pastYearQuestions';
import { useSession } from '../context/SessionContext';

export default function ThemeSelection() {
    const navigate = useNavigate();
    const { setSession, clearSession } = useSession();

    // Right panel tab: 'pastyear' | 'custom'
    const [activeTab, setActiveTab] = useState('pastyear');

    // Past year state
    const [selectedYear, setSelectedYear] = useState(null);

    // Custom question state
    const [question, setQuestion] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Mobile: right panel expand
    const [rightExpanded, setRightExpanded] = useState(false);

    const questionListRef = useRef(null);

    useEffect(() => {
        clearSession();
    }, []);

    // Scroll question list to top when year changes
    useEffect(() => {
        if (questionListRef.current) {
            questionListRef.current.scrollTop = 0;
        }
    }, [selectedYear]);

    const handleThemeSelect = (theme) => {
        setSession({
            theme: theme.id,
            themeName: theme.name,
            source: 'theme_conflict'
        });
        navigate(`/conflicts/${theme.id}`);
    };

    const handlePastYearQuestion = (q, year) => {
        setSession({
            source: 'custom_question',
            customQuestion: q
        });
        navigate('/mode');
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (question.trim().length < 5) return;
        setSession({
            source: 'custom_question',
            customQuestion: question.trim()
        });
        navigate('/mode');
    };

    const years = PAST_YEAR_QUESTIONS.map(y => y.year); // [2025, 2024, ...]
    const selectedYearData = PAST_YEAR_QUESTIONS.find(y => y.year === selectedYear);

    return (
        <div className="min-h-[calc(100vh-64px)] w-full flex flex-col items-center py-10 px-6 bg-background relative z-10 animate-in fade-in duration-400">
            <div className="w-full max-w-6xl flex flex-col items-center space-y-8">

                {/* Header */}
                <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="font-display text-5xl md:text-6xl text-amber tracking-tight">
                        SOCRA
                    </h1>
                    <p className="font-serif italic text-textMuted text-lg md:text-xl">
                        Where would you like to begin today?
                    </p>
                </div>

                {/* ── Split layout ── */}
                <div className="w-full flex flex-col lg:flex-row gap-0 lg:gap-0 lg:divide-x lg:divide-[#2A2825]">

                    {/* ────────── LEFT: Theme Tiles ────────── */}
                    <div className="w-full lg:w-1/2 flex flex-col pr-0 lg:pr-10 pb-8 lg:pb-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted/50 mb-5">
                            Browse by theme
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {THEMES.map((theme, idx) => (
                                <div
                                    key={theme.id}
                                    onClick={() => handleThemeSelect(theme)}
                                    className="group bg-[#141210] border border-[#2A2825] p-5 flex flex-col items-start cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:border-l-[3px] hover:border-l-amber hover:bg-[#1A1814] hover:shadow-[0_8px_30px_rgba(200,150,62,0.05)] animate-in fade-in slide-in-from-bottom-4"
                                    style={{
                                        animationDelay: `${idx * 60}ms`,
                                        animationFillMode: 'both',
                                        minHeight: '140px'
                                    }}
                                >
                                    <div className="w-7 h-7 flex items-center justify-center bg-amber/5 border border-amber/10 mb-3 transition-colors group-hover:bg-amber/10 group-hover:border-amber/20 group-hover:shadow-[0_0_12px_rgba(200,150,62,0.15)]">
                                        <span className="text-[13px] leading-none">{theme.icon}</span>
                                    </div>
                                    <h3 className="font-display text-base text-textDefault mb-1 transition-colors group-hover:text-amber leading-tight">
                                        {theme.name}
                                    </h3>
                                    <p className="font-serif italic text-[12px] text-[#6B6560] leading-relaxed">
                                        {theme.descriptor}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Divider (desktop only) ── */}
                    <div className="hidden lg:flex flex-col items-center justify-center px-6 select-none">
                        <div className="w-[1px] flex-1 bg-[#2A2825]" />
                        <span className="font-mono text-[11px] text-textMuted/30 uppercase tracking-widest py-4">or</span>
                        <div className="w-[1px] flex-1 bg-[#2A2825]" />
                    </div>

                    {/* ── Mobile divider ── */}
                    <div className="lg:hidden flex items-center gap-4 py-2">
                        <div className="flex-1 h-[1px] bg-[#2A2825]" />
                        <span className="font-mono text-[11px] text-textMuted/30 uppercase tracking-widest">or</span>
                        <div className="flex-1 h-[1px] bg-[#2A2825]" />
                    </div>

                    {/* ── Mobile expand toggle ── */}
                    <div className="lg:hidden flex justify-center mb-2">
                        <button
                            onClick={() => setRightExpanded(v => !v)}
                            className="font-mono text-[11px] text-textMuted/50 uppercase tracking-widest hover:text-amber transition-colors focus:outline-none"
                        >
                            {rightExpanded ? '↑ Collapse' : '↓ Choose a question'}
                        </button>
                    </div>

                    {/* ────────── RIGHT: Question Entry ────────── */}
                    <div className={`w-full lg:w-1/2 flex flex-col pl-0 lg:pl-10 pt-0 lg:pt-0 transition-all duration-300 overflow-hidden ${rightExpanded || true ? 'max-h-none' : 'max-h-0 lg:max-h-none'}`}
                        style={{}}>

                        {/* Tab bar */}
                        <div className="flex gap-0 mb-6 border-b border-[#2A2825]">
                            <button
                                onClick={() => setActiveTab('pastyear')}
                                className={`flex-1 font-mono text-[11px] uppercase tracking-widest pb-3 transition-colors focus:outline-none border-b-2 -mb-[2px] ${activeTab === 'pastyear' ? 'text-amber border-amber' : 'text-textMuted/40 border-transparent hover:text-textMuted'}`}
                            >
                                Past Year Papers
                            </button>
                            <button
                                onClick={() => setActiveTab('custom')}
                                className={`flex-1 font-mono text-[11px] uppercase tracking-widest pb-3 transition-colors focus:outline-none border-b-2 -mb-[2px] ${activeTab === 'custom' ? 'text-amber border-amber' : 'text-textMuted/40 border-transparent hover:text-textMuted'}`}
                            >
                                My Own Question
                            </button>
                        </div>

                        {/* ── Past Year Tab ── */}
                        {activeTab === 'pastyear' && (
                            <div className="flex flex-col animate-in fade-in duration-300">

                                {/* Year pills */}
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {years.map(yr => (
                                        <button
                                            key={yr}
                                            onClick={() => setSelectedYear(yr === selectedYear ? null : yr)}
                                            className={`px-3 py-1.5 font-mono text-[11px] tracking-widest uppercase transition-all duration-200 focus:outline-none border ${selectedYear === yr
                                                ? 'bg-amber text-background border-amber'
                                                : 'bg-transparent text-textMuted/60 border-[#2A2825] hover:border-amber/50 hover:text-amber'
                                                }`}
                                        >
                                            {yr}
                                        </button>
                                    ))}
                                </div>

                                {/* Question list */}
                                {!selectedYear && (
                                    <div className="flex items-center justify-center h-40 border border-dashed border-[#2A2825]">
                                        <p className="font-serif italic text-textMuted/30 text-sm text-center px-4">
                                            Select a year to browse its questions
                                        </p>
                                    </div>
                                )}

                                {selectedYear && selectedYearData && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {/* Year badge */}
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber/70 border border-amber/20 px-2 py-0.5">
                                                {selectedYear} A-Level GP
                                            </span>
                                            <span className="font-mono text-[10px] text-textMuted/30">
                                                {selectedYearData.questions.length} questions
                                            </span>
                                        </div>

                                        {/* Scrollable list */}
                                        <div
                                            ref={questionListRef}
                                            className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin"
                                            style={{ scrollbarColor: '#3A3530 transparent' }}
                                        >
                                            {selectedYearData.questions.map((q, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handlePastYearQuestion(q, selectedYear)}
                                                    className="w-full text-left group bg-[#141210] border border-[#2A2825] px-4 py-3 transition-all duration-200 hover:border-amber/40 hover:bg-[#1A1814] focus:outline-none flex items-start gap-3"
                                                >
                                                    <span className="font-mono text-[10px] text-textMuted/30 mt-[3px] shrink-0 w-4 text-right">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-serif text-[13px] text-textMuted group-hover:text-textDefault leading-relaxed transition-colors">
                                                        {q}
                                                    </span>
                                                    <span className="ml-auto pl-3 text-amber opacity-0 group-hover:opacity-100 transition-opacity shrink-0 font-mono text-[10px] mt-[3px]">
                                                        →
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Custom Question Tab ── */}
                        {activeTab === 'custom' && (
                            <div className="flex flex-col animate-in fade-in duration-300">
                                <p className="font-serif italic text-textMuted/50 text-sm mb-6 leading-relaxed">
                                    Have a question in mind? Enter it below and we'll help you think it through.
                                </p>
                                <form onSubmit={handleCustomSubmit} className="space-y-6">
                                    <div className="relative group w-full">
                                        <textarea
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            onFocus={() => setIsFocused(true)}
                                            onBlur={() => setIsFocused(false)}
                                            placeholder="Enter your General Paper question..."
                                            className="w-full bg-transparent border border-[#2A2825] text-base text-textDefault placeholder-textMuted/30 focus:outline-none focus:border-amber transition-colors duration-300 resize-none p-4 font-serif leading-relaxed"
                                            rows={4}
                                            autoFocus
                                        />
                                        {isFocused && (
                                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            type="submit"
                                            disabled={question.trim().length < 5}
                                            className="px-6 py-2.5 bg-transparent border border-amber text-amber font-mono tracking-widest uppercase text-[11px] transition-all duration-300 hover:bg-amber/10 focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                        >
                                            Proceed →
                                        </button>
                                        {question.trim().length > 0 && question.trim().length < 5 && (
                                            <span className="font-mono text-[10px] text-textMuted/40">
                                                Question too short
                                            </span>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
