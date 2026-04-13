import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function NavBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isDeveloper } = useAuth();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <nav className="w-full h-16 border-b border-borderDark flex items-center px-6 justify-between bg-background/90 backdrop-blur-sm z-50 fixed top-0 left-0">
            <div className="flex items-center gap-4">
                <Link to={user ? "/app" : "/"} className="font-display text-2xl text-textDefault tracking-widest uppercase hover:text-amber transition-colors">
                    Socra
                </Link>
                {isDeveloper && (
                    <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 border border-amber/40 text-amber/70 bg-amber/5 select-none">
                        ⚡ Dev Mode
                    </span>
                )}
            </div>

            <div className="flex space-x-6 text-sm font-mono uppercase tracking-widest text-textMuted items-center">
                {user ? (
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
                    <Link to="/login" className="hover:text-amber transition-colors border border-borderDark px-3 py-1 bg-[#141210]">
                        Sign In
                    </Link>
                )}
            </div>
        </nav>
    );
}

