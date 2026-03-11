import { Link, useLocation } from 'react-router-dom';

export default function NavBar() {
    const location = useLocation();

    return (
        <nav className="w-full h-16 border-b border-borderDark flex items-center px-6 justify-between bg-background/90 backdrop-blur-sm z-50 fixed top-0 left-0">
            <Link to="/" className="font-display text-2xl text-textDefault tracking-widest uppercase hover:text-amber transition-colors">
                Socra
            </Link>

            <div className="flex space-x-6 text-sm font-mono uppercase tracking-widest text-textMuted">
                <Link to="/learn" className={`hover:text-amber transition-colors ${location.pathname.startsWith('/learn') ? 'text-amber' : ''}`}>
                    [ ◈ Learn ]
                </Link>
                <Link to="/" className={`hover:text-amber transition-colors ${location.pathname === '/' || location.pathname.startsWith('/react') || location.pathname.startsWith('/mode') || location.pathname.startsWith('/test') ? 'text-amber' : ''}`}>
                    [ ◆ Inquire ]
                </Link>
                <Link to="#" className="hover:text-amber transition-colors opacity-50 cursor-not-allowed" title="Coming soon">
                    [ ▦ Repository ]
                </Link>
                <Link to="/bank" className={`hover:text-amber transition-colors ${location.pathname.startsWith('/bank') ? 'text-amber' : ''}`}>
                    [ ◉ Bank ]
                </Link>
            </div>
        </nav>
    );
}
