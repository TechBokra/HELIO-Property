
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingFallback from '../shared/LoadingFallback';

const AdminHomePage = React.lazy(() => import('./AdminHomePage'));
const AdminAnalyticsPage = React.lazy(() => import('./AdminAnalyticsPage'));
const AdminReportsPage = React.lazy(() => import('./AdminReportsPage'));
const AdminPartnersLayout = React.lazy(() => import('./partners/AdminPartnersLayout'));
const AdminPartnersDashboard = React.lazy(() => import('./partners/AdminPartnersDashboard'));
const AdminPartnersPage = React.lazy(() => import('./partners/AdminPartnersPage'));
const AdminPartnerRequestsPage = React.lazy(() => import('./requests/AdminPartnerRequestsPage'));
const AdminPlansPage = React.lazy(() => import('./AdminPlansPage'));
const AdminPartnerFormPage = React.lazy(() => import('./partners/AdminPartnerFormPage'));
const AdminPartnerRequestDetailsPage = React.lazy(() => import('./requests/AdminPartnerRequestDetailsPage'));
const AdminPlanEditPage = React.lazy(() => import('./AdminPlanEditPage'));
const AdminInquiryManagementPage = React.lazy(() => import('./inquiryManagement/AdminInquiryManagementPage'));
const AdminLeadsPage = React.lazy(() => import('./AdminLeadsPage'));

const AdminPropertiesLayout = React.lazy(() => import('./properties/AdminPropertiesLayout'));
const AdminPropertiesDashboard = React.lazy(() => import('./properties/AdminPropertiesDashboard'));
const AdminPropertiesListPage = React.lazy(() => import('./properties/AdminPropertiesListPage')); 
const AdminPropertyRequestsPage = React.lazy(() => import('./requests/AdminPropertyRequestsPage'));
const AdminPropertyInquiriesPage = React.lazy(() => import('./requests/AdminPropertyInquiriesPage'));
const AdminFilterManagementPage = React.lazy(() => import('./AdminFilterManagementPage'));
const PropertyFormPage = React.lazy(() => import('../forms/PropertyFormPage'));
const AdminPropertyRequestDetailsPage = React.lazy(() => import('./requests/AdminPropertyRequestDetailsPage'));

const AdminProjectsPage = React.lazy(() => import('./projects/AdminProjectsPage'));
const ProjectFormPage = React.lazy(() => import('../forms/ProjectFormPage'));

const AdminPlatformFinishingPage = React.lazy(() => import('./platform-ops/AdminPlatformFinishingPage'));
const AdminFinishingRequestDetailsPage = React.lazy(() => import('./AdminFinishingRequestDetailsPage'));

const AdminPlatformDecorationsPage = React.lazy(() => import('./platform-ops/AdminPlatformDecorationsPage'));
const AdminPortfolioFormPage = React.lazy(() => import('./decorations/AdminPortfolioFormPage'));
const AdminPortfolioFormEditPage = React.lazy(() => import('./decorations/AdminPortfolioFormPage'));

const AdminPlatformPropertiesPage = React.lazy(() => import('./platform-ops/AdminPlatformPropertiesPage'));

const AdminContactRequestsPage = React.lazy(() => import('./requests/AdminContactRequestsPage'));

const AdminContentLayout = React.lazy(() => import('./content/AdminContentLayout'));
const ContentHeroPage = React.lazy(() => import('./content/ContentHeroPage'));
const ContentHomeListingsPage = React.lazy(() => import('./content/ContentHomeListingsPage'));
const ContentSocialProofPage = React.lazy(() => import('./content/ContentSocialProofPage'));
const ContentWhyNewHeliopolisPage = React.lazy(() => import('./content/ContentWhyNewHeliopolisPage'));
const ContentWhyUsPage = React.lazy(() => import('./content/ContentWhyUsPage'));
const ContentPartnersPage = React.lazy(() => import('./content/ContentPartnersPage'));
const ContentTestimonialsPage = React.lazy(() => import('./content/ContentTestimonialsPage'));
const ContentCTAPage = React.lazy(() => import('./content/ContentCTAPage'));
const ContentProjectsPage = React.lazy(() => import('./content/ContentProjectsPage'));
const ContentServicesPage = React.lazy(() => import('./content/ContentServicesPage'));
const ContentFinishingPage = React.lazy(() => import('./content/ContentFinishingPage'));
const ContentDecorationsPage = React.lazy(() => import('./content/ContentDecorationsPage'));
const ContentPrivacyPolicyPage = React.lazy(() => import('./content/ContentPrivacyPolicyPage'));
const ContentTermsOfUsePage = React.lazy(() => import('./content/ContentTermsOfUsePage'));
const ContentQuotesPage = React.lazy(() => import('./content/ContentQuotesPage'));
const ContentFooterPage = React.lazy(() => import('./content/ContentFooterPage'));

const AdminBannersPage = React.lazy(() => import('./banners/AdminBannersPage'));
const AdminBannerFormPage = React.lazy(() => import('./content/AdminBannerFormPage'));

const AdminFormsPage = React.lazy(() => import('./forms/AdminFormsPage'));
const AdminUsersPage = React.lazy(() => import('./users/AdminUsersPage'));
const AdminUserFormPage = React.lazy(() => import('./users/AdminUserFormPage'));
const AdminRolesPage = React.lazy(() => import('./users/AdminRolesPage'));
const RoutingRulesPage = React.lazy(() => import('./automation/RoutingRulesPage'));
const AdminSettingsPage = React.lazy(() => import('./AdminSettingsPage'));
const AdminExternalSettingsPage = React.lazy(() => import('./settings/AdminExternalSettingsPage'));
const AdminProfilePage = React.lazy(() => import('./AdminProfilePage'));
const AllNotificationsPage = React.lazy(() => import('../shared/AllNotificationsPage'));
const AdminFinancePage = React.lazy(() => import('./finance/AdminFinancePage'));

const AdminRoutes: React.FC = () => {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                <Route index element={<AdminHomePage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="leads" element={<AdminLeadsPage />} />
                
                {/* Partners Management */}
                <Route path="partners" element={<AdminPartnersLayout />}>
                    <Route index element={<AdminPartnersDashboard />} />
                    <Route path="list" element={<AdminPartnersPage />} />
                    <Route path="requests" element={<AdminPartnerRequestsPage />} />
                    <Route path="plans" element={<AdminPlansPage />} />
                </Route>
                <Route path="partners/new" element={<AdminPartnerFormPage />} />
                <Route path="partners/edit/:partnerId" element={<AdminPartnerFormPage />} />
                <Route path="partners/requests/:requestId" element={<AdminPartnerRequestDetailsPage />} />
                <Route path="partners/plans/edit/:planCategory/:planKey" element={<AdminPlanEditPage />} />
                <Route path="partners/inquiry-routing" element={<AdminInquiryManagementPage />} />

                {/* Properties Management */}
                <Route path="properties" element={<AdminPropertiesLayout />}>
                    <Route index element={<AdminPropertiesDashboard />} />
                    <Route path="list" element={<AdminPropertiesListPage />} />
                    <Route path="listing-requests" element={<AdminPropertyRequestsPage />} />
                    <Route path="search-requests" element={<AdminPropertyInquiriesPage />} />
                    <Route path="filters" element={<AdminFilterManagementPage />} />
                </Route>
                <Route path="properties/new" element={<PropertyFormPage />} />
                <Route path="properties/edit/:propertyId" element={<PropertyFormPage />} />
                <Route path="properties/listing-requests/:requestId" element={<AdminPropertyRequestDetailsPage />} />

                {/* Projects */}
                <Route path="projects" element={<AdminProjectsPage />} />
                <Route path="projects/new" element={<ProjectFormPage />} />
                <Route path="projects/edit/:projectId" element={<ProjectFormPage />} />

                {/* Request Triage / Contact */}
                <Route path="contact-requests" element={<AdminContactRequestsPage />} />

                {/* Platform Operations */}
                <Route path="platform-finishing/*" element={<AdminPlatformFinishingPage />} />
                <Route path="platform-finishing/requests/:requestId" element={<AdminFinishingRequestDetailsPage />} />
                
                <Route path="platform-decorations/*" element={<AdminPlatformDecorationsPage />} />
                <Route path="platform-decorations/portfolio/new" element={<AdminPortfolioFormPage />} />
                <Route path="platform-decorations/portfolio/edit/:itemId" element={<AdminPortfolioFormPage />} />
                
                <Route path="platform-properties" element={<AdminPlatformPropertiesPage />} />

                {/* Content Management */}
                <Route path="content" element={<AdminContentLayout />}>
                    <Route index element={<ContentHeroPage />} /> {/* Default to Hero */}
                    <Route path="hero" element={<ContentHeroPage />} />
                    <Route path="home-listings" element={<ContentHomeListingsPage />} />
                    <Route path="social-proof" element={<ContentSocialProofPage />} />
                    <Route path="why-new-heliopolis" element={<ContentWhyNewHeliopolisPage />} />
                    <Route path="why-us" element={<ContentWhyUsPage />} />
                    <Route path="partners" element={<ContentPartnersPage />} />
                    <Route path="testimonials" element={<ContentTestimonialsPage />} />
                    <Route path="home-cta" element={<ContentCTAPage />} />
                    <Route path="projects-page" element={<ContentProjectsPage />} />
                    <Route path="services" element={<ContentServicesPage />} />
                    <Route path="finishing-page" element={<ContentFinishingPage />} />
                    <Route path="decorations-page" element={<ContentDecorationsPage />} />
                    <Route path="privacy-policy" element={<ContentPrivacyPolicyPage />} />
                    <Route path="terms-of-use" element={<ContentTermsOfUsePage />} />
                    <Route path="quotes" element={<ContentQuotesPage />} />
                    <Route path="footer" element={<ContentFooterPage />} />
                </Route>
                <Route path="banners" element={<AdminBannersPage />} />
                <Route path="banners/new" element={<AdminBannerFormPage />} />
                <Route path="banners/edit/:bannerId" element={<AdminBannerFormPage />} />

                {/* System Administration */}
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/new" element={<AdminUserFormPage />} />
                <Route path="users/edit/:userId" element={<AdminUserFormPage />} />
                <Route path="roles" element={<AdminRolesPage />} />
                <Route path="automation" element={<RoutingRulesPage />} />
                <Route path="forms" element={<AdminFormsPage />} />
                <Route path="finance" element={<AdminFinancePage />} />
                
                {/* Settings */}
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="external-settings" element={<AdminExternalSettingsPage />} />
                <Route path="profile" element={<AdminProfilePage />} />
                <Route path="notifications" element={<AllNotificationsPage />} />
            </Routes>
        </Suspense>
    );
};

export default AdminRoutes;
