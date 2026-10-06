import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Permission, Role } from '../../types';

import AccessDenied from './AccessDenied';

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
        return <AccessDenied requiredPermission={permission} userRole={currentUser.role} />;
    }

    return children;
};

export default ProtectedRoute;
