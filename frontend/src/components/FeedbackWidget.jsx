import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchWithAuth, BASE_URL } from '../lib/supabase';

export default function FeedbackWidget({ currentPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const containerRef = useRef(null);
  const textareaRef = useRef(null);

  const { isDeveloper } = useAuth();
  const { showToast } = useToast();

  function handleClose() {
    setIsOpen(false);
    setMessage('');
    setStatus('idle');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), current_page: currentPage }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Could not send feedback.', 'error');
        setStatus('idle');
      }
    } catch {
      showToast('Could not send feedback.', 'error');
      setStatus('idle');
    }
  }

  // Auto-close after showing success state
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(handleClose, 1800);
    return () => clearTimeout(t);
  }, [status]);

  // Focus textarea when popover opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Click-outside to close
  useEffect(() => {
    function handler(e) {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const btnBottom = isDeveloper ? 'bottom-16' : 'bottom-5';
  const popoverBottom = isDeveloper ? 'bottom-[7.5rem]' : 'bottom-16';

  return (
    <div ref={containerRef}>
      {/* Trigger pill */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`fixed ${btnBottom} right-5 z-40 flex items-center gap-1.5 px-3 py-1.5 bg-[#11100D] border border-borderDark text-textMuted hover:text-amber hover:border-amber/40 font-mono text-[10px] uppercase tracking-widest transition-all`}
        aria-label="Open feedback"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5l-3 2V3a1 1 0 0 1 1-1z"/>
        </svg>
        Feedback
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed ${popoverBottom} right-5 z-50 w-72 bg-[#11100D] border border-borderDark shadow-2xl p-4`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-0.5">
              <div>
                <p className="font-display text-sm text-textDefault">Share feedback</p>
                <p className="font-mono text-[11px] text-textMuted mt-0.5">What's working? What isn't?</p>
              </div>
              <button
                onClick={handleClose}
                className="text-textMuted/50 hover:text-textDefault transition-colors leading-none mt-0.5 ml-3 flex-shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            {status === 'success' ? (
              <p className="mt-4 font-mono text-xs text-[#7A9E7E]">Received — thank you.</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={status === 'sending'}
                  rows={4}
                  placeholder="Type your feedback…"
                  className="w-full mt-3 px-3 py-2 bg-[#141210] border border-borderDark text-textDefault placeholder:text-textMuted/50 text-xs font-mono resize-none focus:outline-none focus:border-amber/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === 'sending' || !message.trim()}
                  className="w-full mt-2 py-2 bg-amber text-[#0D0C0A] font-mono text-xs uppercase tracking-widest hover:bg-amber/90 transition-colors disabled:opacity-50"
                >
                  {status === 'sending' ? 'Sending…' : 'Send feedback'}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
