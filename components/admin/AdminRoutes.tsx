import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingFallback from '../shared/LoadingFallback';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Permission } from '../../types';

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
const AdminMediaLibraryPage = React.lazy(() => import('./media/AdminMediaLibraryPage'));

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
const AdminCustomersPage = React.lazy(() => import('./customers/AdminCustomersPage'));
const AdminAuditLogPage = React.lazy(() => import('./governance/AdminAuditLogPage'));

const AdminRoutes: React.FC = () => {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                {/* 1. Control Center Dashboard */}
                <Route index element={<AdminHomePage />} />

                {/* 2. Commercial Intelligence */}
                <Route 
                    path="analytics" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_ANALYTICS}>
                            <AdminAnalyticsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="reports" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_REPORTS}>
                            <AdminReportsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="leads" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_LEADS}>
                            <AdminLeadsPage />
                        </ProtectedRoute>
                    } 
                />
                
                {/* 3. Partners Management */}
                <Route 
                    path="partners" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_PARTNERS}>
                            <AdminPartnersLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<AdminPartnersDashboard />} />
                    <Route path="list" element={<AdminPartnersPage />} />
                    <Route 
                        path="requests" 
                        element={
                            <ProtectedRoute permission={Permission.MANAGE_PARTNER_REQUESTS}>
                                <AdminPartnerRequestsPage />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="plans" 
                        element={
                            <ProtectedRoute permission={Permission.MANAGE_PLANS}>
                                <AdminPlansPage />
                            </ProtectedRoute>
                        } 
                    />
                </Route>
                <Route 
                    path="partners/new" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_ALL_PARTNERS}>
                            <AdminPartnerFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="partners/edit/:partnerId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_ALL_PARTNERS}>
                            <AdminPartnerFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="partners/requests/:requestId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_PARTNER_REQUESTS}>
                            <AdminPartnerRequestDetailsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="partners/plans/edit/:planCategory/:planKey" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_PLANS}>
                            <AdminPlanEditPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="partners/inquiry-routing" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_INQUIRY_ROUTING}>
                            <AdminInquiryManagementPage />
                        </ProtectedRoute>
                    } 
                />

                {/* 4. Properties Management */}
                <Route 
                    path="properties" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_PROPERTIES}>
                            <AdminPropertiesLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<AdminPropertiesDashboard />} />
                    <Route path="list" element={<AdminPropertiesListPage />} />
                    <Route 
                        path="listing-requests" 
                        element={
                            <ProtectedRoute permission={Permission.MANAGE_PROPERTY_REQUESTS}>
                                <AdminPropertyRequestsPage />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="search-requests" 
                        element={
                            <ProtectedRoute permission={Permission.MANAGE_PROPERTY_INQUIRIES}>
                                <AdminPropertyInquiriesPage />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="filters" 
                        element={
                            <ProtectedRoute permission={Permission.MANAGE_FILTERS}>
                                <AdminFilterManagementPage />
                            </ProtectedRoute>
                        } 
                    />
                </Route>
                <Route 
                    path="properties/new" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_ALL_PROPERTIES}>
                            <PropertyFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="properties/edit/:propertyId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_ALL_PROPERTIES}>
                            <PropertyFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="properties/listing-requests/:requestId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_PROPERTY_REQUESTS}>
                            <AdminPropertyRequestDetailsPage />
                        </ProtectedRoute>
                    } 
                />

                {/* 5. Projects */}
                <Route 
                    path="projects" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_PROJECTS}>
                            <AdminProjectsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="projects/new" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_ALL_PROJECTS}>
                            <ProjectFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="projects/edit/:projectId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_ALL_PROJECTS}>
                            <ProjectFormPage />
                        </ProtectedRoute>
                    } 
                />

                {/* 6. Contact & Service Requests */}
                <Route 
                    path="contact-requests" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_CONTACT_REQUESTS}>
                            <AdminContactRequestsPage />
                        </ProtectedRoute>
                    } 
                />

                {/* 7. Platform Operations */}
                <Route 
                    path="platform-finishing/*" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_PLATFORM_FINISHING_LEADS}>
                            <AdminPlatformFinishingPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="platform-finishing/requests/:requestId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_PLATFORM_FINISHING_LEADS}>
                            <AdminFinishingRequestDetailsPage />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="platform-decorations/*" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_DECORATIONS_LEADS}>
                            <AdminPlatformDecorationsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="platform-decorations/portfolio/new" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_DECORATIONS_CONTENT}>
                            <AdminPortfolioFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="platform-decorations/portfolio/edit/:itemId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_DECORATIONS_CONTENT}>
                            <AdminPortfolioFormPage />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="platform-properties" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_PLATFORM_PROPERTIES}>
                            <AdminPlatformPropertiesPage />
                        </ProtectedRoute>
                    } 
                />

                {/* 8. Content Management */}
                <Route 
                    path="content" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_SITE_CONTENT}>
                            <AdminContentLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<ContentHeroPage />} />
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
                <Route 
                    path="banners" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_BANNERS}>
                            <AdminBannersPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="banners/new" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_BANNERS}>
                            <AdminBannerFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="banners/edit/:bannerId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_BANNERS}>
                            <AdminBannerFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="media" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_MEDIA}>
                            <AdminMediaLibraryPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="cloudinary" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_MEDIA}>
                            <AdminMediaLibraryPage />
                        </ProtectedRoute>
                    } 
                />

                {/* 9. System Administration & Governance */}
                <Route 
                    path="users" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_USERS}>
                            <AdminUsersPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="users/new" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_USERS}>
                            <AdminUserFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="users/edit/:userId" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_USERS}>
                            <AdminUserFormPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="roles" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_ROLES_PERMISSIONS}>
                            <AdminRolesPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="audit-log" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_AUDIT_LOG}>
                            <AdminAuditLogPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="customers" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_CUSTOMERS}>
                            <AdminCustomersPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="automation" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_AUTOMATION}>
                            <RoutingRulesPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="forms" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_FORMS}>
                            <AdminFormsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="finance" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_FINANCE}>
                            <AdminFinancePage />
                        </ProtectedRoute>
                    } 
                />
                
                {/* 10. Settings & Preferences */}
                <Route 
                    path="settings" 
                    element={
                        <ProtectedRoute permission={Permission.VIEW_SETTINGS}>
                            <AdminSettingsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="external-settings" 
                    element={
                        <ProtectedRoute permission={Permission.MANAGE_SETTINGS}>
                            <AdminExternalSettingsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route path="profile" element={<AdminProfilePage />} />
                <Route path="notifications" element={<AllNotificationsPage />} />
            </Routes>
        </Suspense>
    );
};

export default AdminRoutes;
