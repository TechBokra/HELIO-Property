
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Permission } from '../../types';

interface ProtectedRouteProps {
    children: React.ReactElement;
    permission: Permission;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
    const { currentUser, loading, hasPermission } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (!hasPermission(permission)) {
        // Redirect if user doesn't have the required permission
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
