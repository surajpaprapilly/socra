import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PremiumModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-layer1 border border-borderSubtle p-8 max-w-lg w-full relative overflow-hidden group shadow-2xl"
            >
              {/* Subtle top glare */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-50" />
              
              <div className="flex justify-between items-start mb-6 align-top">
                <div className="select-none text-4xl mr-4">🚀</div>
                <button
                  onClick={onClose}
                  className="text-textSubtle hover:text-textDefault transition-colors absolute top-4 right-4"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <h2 className="text-2xl font-bold text-amber mb-3">
                Mastered your first 2 topics?
              </h2>
              
              <p className="text-textSubtle mb-8 leading-relaxed">
                You've hit the limit for your free trial. Unlock <strong>Socra Premium</strong> to train your critical thinking with unlimited essay blueprints, personalized tutor nudges, and zero wait times.
              </p>

              <div className="flex flex-col gap-4">
                <button 
                  className="w-full py-4 px-6 bg-amber text-layer1 font-bold text-lg hover:bg-amber/90 transition-colors flex items-center justify-center gap-2"
                  onClick={() => alert('Stripe Checkout Integration coming soon!')}
                >
                  Upgrade to Premium
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-3 text-textSubtle hover:text-textDefault transition-colors text-sm"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

export default PremiumModal;
