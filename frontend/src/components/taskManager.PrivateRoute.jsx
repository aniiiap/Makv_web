import { Navigate } from 'react-router-dom';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useTaskManagerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/taskflow/login" replace />;
};

export default PrivateRoute;

