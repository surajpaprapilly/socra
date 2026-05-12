import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { fetchWithAuth, BASE_URL } from '../lib/supabase';
import { usePostHog } from '@posthog/react';

const PremiumModal = ({ isOpen, onClose, userEmail }) => {
  const { showToast } = useToast();
  const posthog = usePostHog();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setEmail(userEmail || '');
  }, [isOpen, userEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Something went wrong.');
      }
      posthog?.capture('waitlist_joined', { email: email.trim() });
      setSubmitted(true);
      showToast("You're on the list — we'll be in touch soon.", 'success');
    } catch (err) {
      showToast(err.message || 'Could not save your email. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-layer1 border border-borderSubtle p-8 max-w-lg w-full relative overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-50" />

              <button
                onClick={handleClose}
                className="text-textSubtle hover:text-textDefault transition-colors absolute top-4 right-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {submitted ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-4 select-none">✓</div>
                  <h2 className="text-2xl font-bold text-amber mb-3">You're on the list.</h2>
                  <p className="text-textSubtle leading-relaxed">
                    We'll notify you when premium launches — with an exclusive early-access discount.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-8 w-full py-3 text-textSubtle hover:text-textDefault transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="select-none text-4xl mb-4">✦</div>
                  <h2 className="text-2xl font-bold text-amber mb-3">
                    You've completed the free sessions.
                  </h2>
                  <p className="text-textSubtle mb-6 leading-relaxed">
                    Socra is still in early access. Join the waitlist and we'll give you{' '}
                    <strong className="text-textDefault">30% off</strong> when premium launches.
                  </p>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-layer2 border border-borderSubtle text-textDefault placeholder:text-textSubtle focus:outline-none focus:border-amber transition-colors [color-scheme:dark]"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 px-6 bg-amber text-layer1 font-bold text-lg hover:bg-amber/90 transition-colors disabled:opacity-60"
                    >
                      {loading ? 'Joining…' : 'Join the waitlist'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

export default PremiumModal;
