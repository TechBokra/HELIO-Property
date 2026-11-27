
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminFinishingLayout from '../finishing/AdminFinishingLayout';
import AdminFinishingDashboardPage from '../finishing/AdminFinishingDashboardPage';
import AdminFinishingProvidersPage from '../finishing/AdminFinishingProvidersPage';
import FinishingRequestsManagement from '../finishing/FinishingRequestsManagement';
import AdminPlansPage from '../AdminPlansPage';

const AdminPlatformFinishingPage: React.FC = () => {
    return (
        <Routes>
            <Route element={<AdminFinishingLayout />}>
                <Route index element={<AdminFinishingDashboardPage />} />
                <Route path="requests" element={<FinishingRequestsManagement />} />
                <Route path="services" element={<AdminFinishingProvidersPage />} />
                <Route path="plans" element={<AdminPlansPage availableCategories={['finishing']} />} />
            </Route>
        </Routes>
    );
};

export default AdminPlatformFinishingPage;
