import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app';

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let authResponse;
    if (isSignUp) {
      authResponse = await supabase.auth.signUp({ email, password });
    } else {
      authResponse = await supabase.auth.signInWithPassword({ email, password });
    }

    if (authResponse.error) {
      setError(authResponse.error.message);
    } else if (authResponse.data.user) {
      navigate(from, { replace: true });
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/app'
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Note: OAuth redirects the window, so we don't need to manually navigate or set loading to false here.
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center p-6 bg-background relative z-10 font-mono">
      <div className="w-full max-w-sm flex flex-col items-center">
        
        <div className="text-center space-y-4 mb-8">
            <h1 className="font-display text-4xl text-textDefault tracking-tight">
                {isSignUp ? "Join Socra" : "Welcome Back"}
            </h1>
            <p className="text-textMuted text-sm uppercase tracking-widest">
                {isSignUp ? "Begin your inquiry" : "Continue your inquiry"}
            </p>
        </div>

        {error && (
            <div className="w-full bg-red-900/20 border border-red-500/50 text-red-400 text-xs p-3 mb-6 text-center">
                {error}
            </div>
        )}

        <div className="w-full space-y-6">
            <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full px-4 py-3 bg-[#1A1815] border border-[#2A2825] text-textDefault hover:border-amber transition-colors duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Continue with Google
            </button>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#2A2825]"></div>
                <span className="flex-shrink-0 mx-4 text-textMuted text-xs uppercase">Or Email</span>
                <div className="flex-grow border-t border-[#2A2825]"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent border-b border-borderDark text-base text-textDefault placeholder-textMuted/50 focus:outline-none focus:border-amber transition-colors duration-300 py-3"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent border-b border-borderDark text-base text-textDefault placeholder-textMuted/50 focus:outline-none focus:border-amber transition-colors duration-300 py-3"
                />
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 px-8 py-3 bg-transparent border border-amber text-amber font-mono tracking-widest uppercase text-sm transition-all duration-300 hover:bg-amber/10 focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-50"
                >
                    {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
                </button>
            </form>
        </div>

        <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className="mt-8 text-xs text-textMuted hover:text-amber transition-colors"
        >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
