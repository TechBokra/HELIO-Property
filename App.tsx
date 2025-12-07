
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import ScrollToTop from './components/shared/ScrollToTop';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Permission } from './types';
import ToastContainer from './components/shared/ToastContainer';
import BackToTopButton from './components/shared/BackToTopButton';
import { useLanguage } from './components/shared/LanguageContext';
import { adminNavLinks, partnerNavLinks } from './data/navigation';
import LoadingFallback from './components/shared/LoadingFallback';

// --- Layouts (Static Imports to fix #525) ---
import DashboardLayout from './components/shared/DashboardLayout';
import PublicLayout from './components/shared/PublicLayout';

// --- Route Groups (Static Imports to fix #525) ---
import PartnerRoutes from './components/partner-dashboard/PartnerRoutes';
import AdminRoutes from './components/admin/AdminRoutes';

// --- Public Pages (Lazy Loaded) ---
const HomePage = lazy(() => import('./components/home/HomePage'));
const PropertiesPage = lazy(() => import('./components/properties/PropertiesPage'));
const ProjectsPage = lazy(() => import('./components/projects/ProjectsPage'));
const PropertyDetailsPage = lazy(() => import('./components/properties/PropertyDetailsPage'));
const ProjectDetailsPage = lazy(() => import('./components/projects/ProjectDetailsPage'));
const FinishingPage = lazy(() => import('./components/finishing/FinishingPage'));
const DecorationsPage = lazy(() => import('./components/decorations/DecorationsPage'));
const ContactPage = lazy(() => import('./components/contact/ContactPage'));
const FavoritesPage = lazy(() => import('./components/favorites/FavoritesPage'));
const PartnerProfilePage = lazy(() => import('./components/partners/PartnerProfilePage'));
const AddPropertyPage = lazy(() => import('./components/forms/AddPropertyPage'));
const ServiceRequestPage = lazy(() => import('./components/forms/ServiceRequestPage'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const RegisterPage = lazy(() => import('./components/auth/RegisterPage'));
const PaymentPage = lazy(() => import('./components/finance/PaymentPage'));
const PrivacyPolicyPage = lazy(() => import('./components/legal/PrivacyPolicyPage'));
const TermsOfUsePage = lazy(() => import('./components/legal/TermsOfUsePage'));
const NotFoundPage = lazy(() => import('./components/shared/NotFoundPage'));


const App = () => {
    const { t } = useLanguage();

    return (
        <div>
            <ScrollToTop />
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    {/* ================================================================== */}
                    {/*                        Protected Partner Dashboard                   */}
                    {/* ================================================================== */}
                    <Route
                        path="/dashboard/*"
                        element={
                            <ProtectedRoute permission={Permission.VIEW_PARTNER_DASHBOARD}>
                                <DashboardLayout navLinks={partnerNavLinks} pageTitle={t.dashboard.title} />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="*" element={<PartnerRoutes />} />
                    </Route>

                    {/* ================================================================== */}
                    {/*                   Protected Super Admin Dashboard                  */}
                    {/* ================================================================== */}
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute permission={Permission.VIEW_ADMIN_DASHBOARD}>
                                <DashboardLayout navLinks={adminNavLinks} pageTitle={t.adminDashboard.title} />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="*" element={<AdminRoutes />} />
                    </Route>

                    {/* ================================================================== */}
                    {/*                       Public Routes & Catch-all                    */}
                    {/* ================================================================== */}
                    <Route path="/" element={<PublicLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="properties" element={<PropertiesPage />} />
                        <Route path="projects" element={<ProjectsPage />} />
                        <Route path="properties/:propertyId" element={<PropertyDetailsPage />} />
                        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
                        <Route path="finishing" element={<FinishingPage />} />
                        <Route path="decorations" element={<DecorationsPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route path="favorites" element={<FavoritesPage />} />
                        <Route path="partners/:partnerId" element={<PartnerProfilePage />} />
                        <Route path="add-property" element={<AddPropertyPage />} />
                        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
                        <Route path="terms-of-use" element={<TermsOfUsePage />} />
                        <Route path="request-service" element={<ServiceRequestPage />} />
                        <Route path="login" element={<LoginPage />} />
                        <Route path="register" element={<RegisterPage />} />
                        <Route path="payment" element={<PaymentPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Routes>
            </Suspense>
            <ToastContainer />
            <BackToTopButton />
        </div>
    );
};

export default App;
