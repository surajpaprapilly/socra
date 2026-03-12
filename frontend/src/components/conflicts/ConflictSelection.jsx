import { useParams, useNavigate } from 'react-router-dom';
import { THEMES } from '../../data/themes';
import { CONFLICTS } from '../../data/conflicts';
import ConflictTile from './ConflictTile';

export default function ConflictSelection() {
  const { themeId } = useParams();
  const navigate = useNavigate();

  const theme = THEMES.find(t => t.id === themeId);
  const themeConflicts = CONFLICTS.filter(c => c.themeId === themeId);

  if (!theme) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-24">
        <p className="font-mono text-amber">Theme not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 font-mono text-sm text-textMuted hover:text-white">
          ← Return to themes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex flex-col items-center py-16 px-6 relative z-10">
      <div className="max-w-[900px] w-full flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full flex flex-col items-center mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-full relative flex justify-center items-center mb-6">
            <button 
              onClick={() => navigate('/')}
              className="absolute left-0 font-mono text-sm text-textMuted hover:text-white transition-colors"
            >
              ← Back
            </button>
            <div className="font-mono text-sm tracking-[0.2em] text-amber uppercase flex items-center gap-3">
              <span>{theme.icon}</span>
              <span>{theme.name}</span>
            </div>
          </div>
          
          <p className="font-serif italic text-textMuted text-lg text-center mt-2">
            You don't need a position yet. Just pick what interests you.
          </p>
        </div>

        {/* Conflict Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {themeConflicts.map((conflict, idx) => (
            <ConflictTile key={conflict.id} conflict={conflict} index={idx} />
          ))}
        </div>
        
      </div>
    </div>
  );
}
