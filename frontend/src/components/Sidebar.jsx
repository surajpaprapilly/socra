import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PAST_YEAR_QUESTIONS } from '../data/pastYearQuestions';
import { TODAY_Q } from './AppShell';

// ── Collapsed rail icon button ────────────────────────────────────────────────
function RailBtn({ title, active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-full py-2.5 flex flex-col items-center gap-1 border-l-2 transition-all duration-150 ${
        active
          ? 'border-amber text-amber bg-amber/5'
          : 'border-transparent text-textMuted/40 hover:text-textMuted hover:bg-white/[0.02]'
      }`}
    >
      {children}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({
  mode,
  setMode,
  selectedQuestion,
  onSelectQuestion,
  collapsed,
  onToggleCollapse,
  streak = 0,
  blueprintCount = 0,
}) {
  const navigate = useNavigate();
  const customRef = useRef(null);

  const [expandedYears, setExpandedYears] = useState({});
  const [customQ, setCustomQ] = useState('');
  const [customFocused, setCustomFocused] = useState(false);

  const toggleYear = y => setExpandedYears(p => ({ ...p, [y]: !p[y] }));

  const handleCustomSubmit = e => {
    e.preventDefault();
    const q = customQ.trim();
    if (q.length < 5) return;
    onSelectQuestion({ q, year: 'Custom', custom: true });
    setCustomQ('');
    setCustomFocused(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // ── Collapsed rail (48px) ───────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 h-full flex flex-col border-r border-borderDark bg-[#11100D] overflow-hidden">
        {/* Expand toggle */}
        <button
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="w-full py-4 border-b border-borderDark text-textMuted/30 hover:text-amber transition-colors text-sm flex items-center justify-center"
        >
          ›
        </button>

        {/* Streak */}
        <div className="w-full py-2.5 flex flex-col items-center gap-0.5 border-b border-borderDark">
          <span className="text-sm leading-none">🔥</span>
          <span className="font-mono text-[9px] text-amber font-medium">{streak}</span>
        </div>

        {/* Mode icons */}
        <div className="border-b border-borderDark">
          <RailBtn title="Test Mode" active={mode === 'test'} onClick={() => setMode('test')}>
            <span className="text-sm leading-none">◆</span>
            <span className="font-mono text-[7px] tracking-wider uppercase">Test</span>
          </RailBtn>
          <RailBtn title="Learn Mode" active={mode === 'learn'} onClick={() => setMode('learn')}>
            <span className="text-sm leading-none">◈</span>
            <span className="font-mono text-[7px] tracking-wider uppercase">Learn</span>
          </RailBtn>
        </div>

        {/* Today's Q shortcut */}
        <RailBtn
          title="Today's Question"
          active={selectedQuestion?.q === TODAY_Q.q}
          onClick={() => { onSelectQuestion(TODAY_Q); onToggleCollapse(); }}
        >
          <span className="text-sm leading-none">✦</span>
          <span className="font-mono text-[7px] tracking-wider uppercase">Today</span>
        </RailBtn>

        {/* Custom Q shortcut */}
        <RailBtn
          title="Your own question"
          onClick={() => { onToggleCollapse(); setTimeout(() => customRef.current?.focus(), 320); }}
        >
          <span className="text-sm leading-none">✎</span>
          <span className="font-mono text-[7px] tracking-wider uppercase">Own Q</span>
        </RailBtn>

        <div className="flex-1" />

        {/* Blueprints */}
        <RailBtn title="My Blueprints" onClick={() => navigate('/bank')}>
          <span className="text-sm leading-none">◧</span>
          <span className="font-mono text-[7px] tracking-wider uppercase">Bank</span>
        </RailBtn>

        {/* Profile */}
        <RailBtn title="Profile" onClick={() => navigate('/profile')}>
          <span className="text-sm leading-none">◒</span>
          <span className="font-mono text-[7px] tracking-wider uppercase">Me</span>
        </RailBtn>
      </div>
    );
  }

  // ── Expanded sidebar (272px) ────────────────────────────────────────────────
  return (
    <div className="w-[272px] flex-shrink-0 h-full flex flex-col border-r border-borderDark bg-[#11100D] overflow-hidden">

      {/* Logo + streak */}
      <div className="px-4 py-3.5 border-b border-borderDark flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-lg text-textDefault tracking-wide">Socra</span>
          <div className="flex items-center gap-1 font-mono text-[10px] text-amber">
            <span className="text-xs">🔥</span>
            <span className="font-medium">{streak}</span>
            <span className="text-textMuted/40 text-[8px]">days</span>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          title="Collapse sidebar"
          className="text-textMuted/25 hover:text-textMuted transition-colors px-1 text-base leading-none"
        >
          ‹
        </button>
      </div>

      {/* Mode toggle */}
      <div className="px-3.5 py-2.5 border-b border-borderDark flex-shrink-0">
        <div className="flex bg-background border border-borderDark p-[3px]">
          {[['test', '◆ Test'], ['learn', '◈ Learn']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-all ${
                mode === m
                  ? 'bg-amber text-background font-medium'
                  : 'text-textMuted hover:text-textDefault'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom question input */}
      <div className="px-3.5 py-2.5 border-b border-borderDark flex-shrink-0">
        <div
          className={`font-mono text-[8px] tracking-[0.22em] uppercase mb-1.5 flex items-center gap-1.5 transition-colors ${
            customFocused ? 'text-amber' : 'text-textMuted/40'
          }`}
        >
          <span>✎</span> Your own question
        </div>
        <form onSubmit={handleCustomSubmit}>
          <textarea
            ref={customRef}
            value={customQ}
            onChange={e => setCustomQ(e.target.value)}
            onFocus={() => setCustomFocused(true)}
            onBlur={() => setCustomFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCustomSubmit(e);
              }
            }}
            placeholder="Type any GP question…"
            rows={customFocused || customQ ? 3 : 1}
            className={`w-full resize-none bg-background font-serif italic text-[11px] text-textDefault placeholder-textMuted/30 p-2 outline-none border transition-all duration-200 leading-relaxed ${
              customFocused
                ? 'border-amber/40 bg-amber/[0.03]'
                : 'border-borderDark'
            }`}
          />
          {(customFocused || customQ.length > 0) && (
            <div className="flex items-center justify-between mt-1.5 animate-in fade-in duration-200">
              <span className="font-mono text-[8px] text-textMuted/30">
                {customQ.length > 0 && customQ.trim().length < 5 ? 'Too short' : ''}
              </span>
              <button
                type="submit"
                disabled={customQ.trim().length < 5}
                className={`font-mono text-[8px] tracking-widest uppercase px-2.5 py-1 border transition-all ${
                  customQ.trim().length >= 5
                    ? 'bg-amber text-background border-amber cursor-pointer'
                    : 'text-textMuted/25 border-borderDark cursor-default'
                }`}
              >
                Go →
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Today's Question pinned card */}
      <div className="px-3.5 py-2.5 border-b border-borderDark flex-shrink-0">
        <div className="font-mono text-[8px] tracking-[0.22em] uppercase text-amber/75 mb-1.5 flex items-center gap-1">
          <span>✦</span> Today's Question
        </div>
        <button
          onClick={() => onSelectQuestion(TODAY_Q)}
          className={`w-full text-left p-2.5 border transition-all duration-150 ${
            selectedQuestion?.q === TODAY_Q.q
              ? 'border-amber/40 bg-amber/[0.07]'
              : 'border-borderDark bg-[#141210] hover:border-amber/20'
          }`}
        >
          <p className="font-serif italic text-[11px] text-textDefault leading-snug mb-1.5 line-clamp-2">
            {TODAY_Q.q}
          </p>
          <span className="font-mono text-[8px] text-textMuted/40">{TODAY_Q.year} A-Level GP</span>
        </button>
      </div>

      {/* Scrollable question list */}
      <div className="flex-1 overflow-y-auto py-1">
        {PAST_YEAR_QUESTIONS.map(({ year, questions }) => (
          <div key={year}>
            {/* Year group header */}
            <button
              onClick={() => toggleYear(year)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-white/[0.01] transition-colors"
            >
              <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-textMuted/50">
                {year} A-Level GP
              </span>
              <span
                className="text-textMuted/30 text-[10px] transition-transform duration-200 inline-block"
                style={{ transform: expandedYears[year] ? 'rotate(90deg)' : 'none' }}
              >
                ›
              </span>
            </button>

            {/* Questions */}
            {expandedYears[year] &&
              questions.map((q, i) => {
                const isSelected = selectedQuestion?.q === q;
                return (
                  <button
                    key={i}
                    onClick={() => onSelectQuestion({ q, year })}
                    className={`w-full text-left py-2.5 pr-3.5 border-l-2 border-b border-b-borderDark/30 transition-all duration-100 font-mono text-[10px] leading-relaxed ${
                      isSelected
                        ? 'border-l-amber bg-amber/[0.06] text-textDefault'
                        : 'border-l-transparent text-textMuted hover:bg-white/[0.015] hover:border-l-amber/25'
                    }`}
                    style={{ paddingLeft: '18px' }}
                  >
                    {q}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-borderDark flex-shrink-0">
        {/* Stats row */}
        <div className="grid grid-cols-2 border-b border-borderDark">
          <button
            onClick={() => navigate('/bank')}
            className="group flex flex-col px-3.5 py-3 border-r border-borderDark hover:bg-amber/[0.06] transition-all"
          >
            <div className="font-display text-base text-amber font-bold leading-tight">{blueprintCount}</div>
            <div className="font-mono text-[8px] uppercase tracking-wider text-textMuted group-hover:text-amber transition-colors flex items-center gap-1">
              Blueprints <span className="opacity-60 group-hover:opacity-100 transition-opacity">›</span>
            </div>
          </button>
          <div className="flex flex-col px-3.5 py-3">
            <div className="font-display text-base text-textDefault/60 font-bold leading-tight">4</div>
            <div className="font-mono text-[8px] uppercase tracking-wider text-textMuted/40">This week</div>
          </div>
        </div>

        {/* Profile + Logout */}
        <div className="flex">
          <button
            onClick={() => navigate('/profile')}
            className="flex-1 flex items-center gap-2 px-3.5 py-3 font-mono text-[8px] uppercase tracking-widest text-textMuted hover:text-amber hover:bg-amber/[0.05] transition-all border-r border-borderDark"
          >
            <span className="text-sm leading-none">◒</span>
            Profile
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-3 font-mono text-[8px] uppercase tracking-widest text-textMuted hover:text-amber hover:bg-amber/[0.05] transition-all"
            title="Log out"
          >
            <span className="text-sm leading-none">⏻</span>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
