
// This file has been moved to components/admin/inquiryManagement/AdminInquiryManagementPage.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const DeprecatedAdminInquiryPage: React.FC = () => {
    return <Navigate to="/admin/partners/inquiry-routing" replace />;
};

export default DeprecatedAdminInquiryPage;
