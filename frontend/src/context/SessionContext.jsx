import { createContext, useContext, useState } from 'react';

const SessionContext = createContext();

export function SessionProvider({ children }) {
    const [session, setSessionState] = useState({
        theme: null,
        themeName: null,
        statement: null,
        reaction: null,
        source: 'statement', // 'statement' | 'custom_question'
        customQuestion: null,
    });

    const setSession = (newData) => {
        setSessionState(prev => ({ ...prev, ...newData }));
    };

    const clearSession = () => {
        setSessionState({
            theme: null,
            themeName: null,
            statement: null,
            reaction: null,
            source: 'statement',
            customQuestion: null,
        });
    };

    return (
        <SessionContext.Provider value={{ ...session, setSession, clearSession }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    return useContext(SessionContext);
}
