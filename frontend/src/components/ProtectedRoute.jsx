import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireMaster = false, requireClient = false }) => {
  const { user, loading, isMaster, isClient } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireMaster && !isMaster) {
    return <Navigate to="/" replace />;
  }

  if (requireClient && !isClient) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
