
// This file has been moved to components/admin/projects/AdminProjectsPage.tsx
// Keeping this empty file to prevent build errors if any lingering imports exist,
// though all references should have been updated to the new path.
import React from 'react';
import { Navigate } from 'react-router-dom';

const DeprecatedAdminProjectsPage: React.FC = () => {
    return <Navigate to="/admin/projects" replace />;
};

export default DeprecatedAdminProjectsPage;
