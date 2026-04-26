import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const TYPE_STYLES = {
    info:    'border-amber/40 text-amber',
    success: 'border-[#7A9E7E]/50 text-[#7A9E7E]',
    error:   'border-red-500/40 text-red-400',
};

const TYPE_ICONS = {
    info:    '◆',
    success: '✓',
    error:   '✕',
};

function ToastContainer({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;
    return (
        <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    onClick={() => onDismiss(t.id)}
                    className={`flex items-start gap-3 px-4 py-3 bg-[#11100D]/95 border backdrop-blur-md shadow-lg animate-slide-in pointer-events-auto cursor-pointer max-w-xs ${TYPE_STYLES[t.type] || TYPE_STYLES.info}`}
                >
                    <span className="text-sm mt-0.5 shrink-0">{TYPE_ICONS[t.type] || '◆'}</span>
                    <p className="font-mono text-xs leading-relaxed">{t.message}</p>
                </div>
            ))}
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};
