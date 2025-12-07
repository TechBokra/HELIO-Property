


import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layout and pages are imported directly to be included in this code chunk.
import PublicLayout from '../shared/PublicLayout';
import HomePage from '../home/HomePage';
import PropertiesPage from '../properties/PropertiesPage';
import ProjectsPage from '../projects/ProjectsPage';
import PropertyDetailsPage from '../properties/PropertyDetailsPage';
import ProjectDetailsPage from '../projects/ProjectDetailsPage';
import FinishingPage from '../finishing/FinishingPage';
import DecorationsPage from '../decorations/DecorationsPage';
import ContactPage from '../contact/ContactPage';
import FavoritesPage from '../favorites/FavoritesPage';
import PartnerProfilePage from '../partners/PartnerProfilePage';
import AddPropertyPage from '../forms/AddPropertyPage';
import ServiceRequestPage from '../forms/ServiceRequestPage';
import LoginPage from '../auth/LoginPage';
import RegisterPage from '../auth/RegisterPage';
import PrivacyPolicyPage from '../legal/PrivacyPolicyPage';
import TermsOfUsePage from '../legal/TermsOfUsePage';
import NotFoundPage from '../shared/NotFoundPage';
import PaymentPage from '../finance/PaymentPage'; // NEW IMPORT

const PublicRoutes: React.FC = () => {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
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
                <Route path="payment" element={<PaymentPage />} /> {/* NEW ROUTE */}
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
};

export default PublicRoutes;
