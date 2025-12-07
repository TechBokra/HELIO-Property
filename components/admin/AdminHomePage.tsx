
import React from 'react';
import { Role } from '../../types';
import { useAuth } from '../auth/AuthContext';

// Import Dashboards
import SuperAdminHomePage from './SuperAdminHomePage';
import ServiceManagerHomePage from './ServiceManagerHomePage';
import CustomerRelationsHomePage from './CustomerRelationsHomePage';
import ListingsManagerHomePage from './ListingsManagerHomePage';
import PartnerRelationsHomePage from './partners/AdminPartnersDashboard'; // Updated path
import ContentManagerHomePage from './ContentManagerHomePage';

// New Specific Dashboards
import DecorationsDashboardHomePage from './decorations/DecorationsDashboardHomePage';
import AdminFinishingDashboardPage from './finishing/AdminFinishingDashboardPage';
import RealEstatePlatformHomePage from './RealEstatePlatformHomePage';
import RealEstateMarketHomePage from './RealEstateMarketHomePage';
import FinishingMarketHomePage from './FinishingMarketHomePage';

const AdminHomePage: React.FC = () => {
    const { currentUser } = useAuth();
    
    if (!currentUser) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    switch (currentUser.role) {
        // --- High Level Admins ---
        case Role.SUPER_ADMIN:
            return <SuperAdminHomePage />;
        
        // --- Decorations ---
        case Role.DECORATION_MANAGER:
            return <DecorationsDashboardHomePage />;
            
        // --- Finishing ---
        case Role.PLATFORM_FINISHING_MANAGER: // Internal Team
            return <AdminFinishingDashboardPage />;
        case Role.FINISHING_MARKET_MANAGER: // Partners Oversight
            return <FinishingMarketHomePage />;
            
        // --- Real Estate ---
        case Role.PLATFORM_REAL_ESTATE_MANAGER: // Brokerage
            return <RealEstatePlatformHomePage />;
        case Role.REAL_ESTATE_MARKET_MANAGER: // Market
            return <RealEstateMarketHomePage />;

        // --- Relations & Content ---
        case Role.PARTNER_RELATIONS_MANAGER:
            return <PartnerRelationsHomePage />;
        case Role.CONTENT_MANAGER:
            return <ContentManagerHomePage />;

        // --- Legacy / Fallback Roles (Kept for backward compatibility if needed) ---
        case Role.SERVICE_MANAGER:
            return <ServiceManagerHomePage />;
        case Role.CUSTOMER_RELATIONS_MANAGER:
            return <CustomerRelationsHomePage />;
        case Role.LISTINGS_MANAGER:
            return <ListingsManagerHomePage />;
            
        default:
            return (
                <div className="text-center p-12">
                    <h2 className="text-xl font-bold text-gray-700">Dashboard Not Available</h2>
                    <p className="text-gray-500 mt-2">
                        Your role ({currentUser.role}) does not have a dedicated dashboard home page yet.
                        Please use the sidebar navigation.
                    </p>
                </div>
            );
    }
};

export default AdminHomePage;
