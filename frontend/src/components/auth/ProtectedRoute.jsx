import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center text-amber font-mono animate-pulse">
        Authenticating...
      </div>
    );
  }

  if (!user) {
    // Redirect to login page, saving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
