import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import posthog from 'posthog-js';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [loading, setLoading] = useState(true);

  const extractDevFlag = (session) => {
    // app_metadata is embedded in the JWT — readable client-side for UI purposes only
    // Security enforcement is always done server-side in the backend
    const meta = session?.user?.app_metadata || {};
    return meta.role === 'developer';
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsDeveloper(extractDevFlag(session));
      setLoading(false);
    });

    // Listen for auth changes (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsDeveloper(extractDevFlag(session));
      setLoading(false);
      if (session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          role: session.user.app_metadata?.role ?? 'user',
        });
      } else if (event === 'SIGNED_OUT') {
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isDeveloper, loading }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
