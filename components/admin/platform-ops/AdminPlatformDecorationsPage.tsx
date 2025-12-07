
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DecorationsLayout from '../decorations/DecorationsDashboardLayout';
import DecorationsDashboardHomePage from '../decorations/DecorationsDashboardHomePage';
import RequestsManagement from '../decorations/RequestsManagement';
import PortfolioManagement from '../decorations/PortfolioManagement';
import CategoriesManagement from '../decorations/CategoriesManagement';
import AdminDecorationRequestDetailsPage from '../requests/AdminDecorationRequestDetailsPage';

const AdminPlatformDecorationsPage: React.FC = () => {
    return (
        <Routes>
            <Route element={<DecorationsLayout />}>
                <Route index element={<DecorationsDashboardHomePage />} />
                <Route path="requests" element={<RequestsManagement />} />
                <Route path="requests/:requestId" element={<AdminDecorationRequestDetailsPage />} />
                <Route path="portfolio" element={<PortfolioManagement />} />
                <Route path="categories" element={<CategoriesManagement />} />
            </Route>
        </Routes>
    );
};

export default AdminPlatformDecorationsPage;
