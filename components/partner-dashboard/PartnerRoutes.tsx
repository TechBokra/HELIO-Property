
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingFallback from '../shared/LoadingFallback';

// --- Partner Dashboard Pages (Lazy Loaded) ---
const DashboardHomePage = React.lazy(() => import('./DashboardHomePage'));
const DashboardProfilePage = React.lazy(() => import('./DashboardProfilePage'));
const DashboardPortfolioPage = React.lazy(() => import('./DashboardPortfolioPage'));
const DashboardPropertiesPage = React.lazy(() => import('./DashboardPropertiesPage'));
const DashboardProjectsPage = React.lazy(() => import('./DashboardProjectsPage'));
const DashboardProjectDetailsPage = React.lazy(() => import('./DashboardProjectDetailsPage'));
const DashboardLeadsPage = React.lazy(() => import('./DashboardLeadsPage'));
const DashboardSubscriptionPage = React.lazy(() => import('./DashboardSubscriptionPage'));
const DashboardFinancePage = React.lazy(() => import('./DashboardFinancePage'));
const DashboardAnalyticsPage = React.lazy(() => import('./DashboardAnalyticsPage'));
const PropertyFormPage = React.lazy(() => import('../forms/PropertyFormPage'));
const ProjectFormPage = React.lazy(() => import('../forms/ProjectFormPage'));
const PartnerLeadDetailsPage = React.lazy(() => import('./PartnerLeadDetailsPage'));
const AllNotificationsPage = React.lazy(() => import('../shared/AllNotificationsPage'));
const PartnerTeamPage = React.lazy(() => import('./PartnerTeamPage'));
const PartnerTeamFormPage = React.lazy(() => import('./PartnerTeamFormPage'));

const PartnerRoutes: React.FC = () => {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                <Route index element={<DashboardHomePage />} />
                <Route path="profile" element={<DashboardProfilePage />} />
                
                <Route path="team" element={<PartnerTeamPage />} />
                <Route path="team/new" element={<PartnerTeamFormPage />} />
                <Route path="team/edit/:memberId" element={<PartnerTeamFormPage />} />

                <Route path="portfolio" element={<DashboardPortfolioPage />} />
                <Route path="properties" element={<DashboardPropertiesPage />} />
                <Route path="properties/new" element={<PropertyFormPage />} />
                <Route path="properties/edit/:propertyId" element={<PropertyFormPage />} />
                <Route path="projects" element={<DashboardProjectsPage />} />
                <Route path="projects/new" element={<ProjectFormPage />} />
                <Route path="projects/edit/:projectId" element={<ProjectFormPage />} />
                <Route path="projects/:projectId" element={<DashboardProjectDetailsPage />} />
                <Route path="leads" element={<DashboardLeadsPage />} />
                <Route path="leads/:leadId" element={<PartnerLeadDetailsPage />} />
                <Route path="subscription" element={<DashboardSubscriptionPage />} />
                <Route path="finance" element={<DashboardFinancePage />} />
                <Route path="analytics" element={<DashboardAnalyticsPage />} />
                <Route path="notifications" element={<AllNotificationsPage />} />
            </Routes>
        </Suspense>
    );
};

export default PartnerRoutes;
