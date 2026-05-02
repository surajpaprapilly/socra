import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isDeveloper } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const isLanding = location.pathname === '/';
  const isLogin = location.pathname === '/login';

  useEffect(() => {
    if (!isLanding) return;
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [isLanding]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const baseClasses = 'w-full h-16 flex items-center px-6 justify-between z-50 fixed top-0 left-0 transition-all duration-300';
  const scrolledClasses = 'bg-background/95 backdrop-blur-sm border-b border-borderDark';
  const transparentClasses = 'bg-transparent border-b border-transparent';

  const navBg = isLanding
    ? (scrolled ? scrolledClasses : transparentClasses)
    : 'bg-background/90 backdrop-blur-sm border-b border-borderDark';

  return (
    <nav className={`${baseClasses} ${navBg}`}>
      <div className="flex items-center gap-4">
        <Link to="/" className="font-display text-2xl text-textDefault tracking-widest uppercase hover:text-amber transition-colors">
          Socra
        </Link>
        {isDeveloper && (
          <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 border border-amber/40 text-amber/70 bg-amber/5 select-none">
            ⚡ Dev Mode
          </span>
        )}
      </div>

      {!isLogin && (
        <div className="flex items-center gap-5 text-sm font-mono uppercase tracking-widest text-textMuted">
          {user && !isLanding ? (
            <>
              <Link to="/bank" className={`hover:text-amber transition-colors ${location.pathname.startsWith('/bank') ? 'text-amber' : ''}`}>
                [ ◉ My Blueprints ]
              </Link>
              <Link to="/profile" className={`hover:text-amber transition-colors ml-4 ${location.pathname.startsWith('/profile') ? 'text-amber' : ''}`}>
                [ ◒ Profile ]
              </Link>
              <button onClick={handleLogout} className="hover:text-amber transition-colors ml-4 text-xs opacity-60">
                [ ⏻ Logout ]
              </button>
            </>
          ) : (
            <>
              {isLanding && (
                <a href="#how" className="text-xs hover:text-textDefault transition-colors hidden sm:block">
                  How it works
                </a>
              )}
              <Link to="/login" className="text-xs hover:text-textDefault transition-colors">
                Sign in
              </Link>
              <Link
                to="/login"
                className="px-5 py-2 bg-amber text-background font-mono text-xs uppercase tracking-widest hover:bg-[#D4A84A] transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
