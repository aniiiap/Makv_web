import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';

const BillingRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useTaskManagerAuth();
  const [accessLoading, setAccessLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setAccessLoading(false);
      return;
    }

    if (user?.role === 'admin') {
      setCanAccess(true);
      setAccessLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        const response = await api.get('/bills/access');
        setCanAccess(response?.canAccess === true);
      } catch (error) {
        console.error('Error checking billing access:', error);
        setCanAccess(false);
      } finally {
        setAccessLoading(false);
      }
    };

    checkAccess();
  }, [isAuthenticated, user?.role]);

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/taskflow/login" replace />;
  }

  if (!canAccess) {
    return <Navigate to="/taskflow/dashboard" replace />;
  }

  return children;
};

export default BillingRoute;
