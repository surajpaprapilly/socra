import { Link } from 'react-router-dom';

export default function LandingScreen() {
    return (
        <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-6 bg-background relative z-10">
            <div className="max-w-4xl w-full flex flex-col items-center">
                <div className="w-full max-w-3xl text-center space-y-12 animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <h1 className="font-display text-5xl md:text-7xl text-textDefault tracking-tight">
                            Think. Don't just answer.
                        </h1>
                        <p className="font-mono text-textMuted text-lg md:text-xl tracking-wide uppercase">
                            gp is a skill. here's how you build it.
                        </p>
                    </div>

                    <div className="pt-8">
                        <Link
                            to="/login"
                            className="inline-block px-12 py-4 bg-amber text-background font-mono tracking-widest uppercase text-sm font-bold transition-all duration-300 hover:bg-amber/90 focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-background"
                        >
                            Get Started
                        </Link>
                    </div>

                    <div className="pt-12 opacity-60">
                        <div className="inline-flex items-center space-x-2 border border-borderDark/50 px-4 py-2 bg-background/50 rounded-none">
                            <span className="text-amber">✦</span>
                            <span className="text-xs font-mono uppercase tracking-widest text-textMuted">The premier A-Level General Paper training tool.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
