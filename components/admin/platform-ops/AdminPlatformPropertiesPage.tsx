
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllProperties } from '../../../services/properties';
import { useLanguage } from '../../shared/LanguageContext';
import { Property } from '../../../types';
import AdminPropertiesListPage from '../properties/AdminPropertiesListPage';

const AdminPlatformPropertiesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t?.adminDashboard;

    const { data: allProperties, isLoading } = useQuery({ 
        queryKey: ['allPropertiesAdmin'], 
        queryFn: getAllProperties 
    });

    const platformProperties = useMemo(() => {
        if (!Array.isArray(allProperties)) return [];
        // Sort by creation/listing date desc so new drafts appear top
        return allProperties
            .filter(p => {
                if (!p) return false;
                const partnerId = (p.partnerId != null ? String(p.partnerId) : '').toLowerCase();
                const anyP = p as any;
                const source = (anyP.source != null ? String(anyP.source) : '').toLowerCase();
                return (
                    partnerId === 'individual-listings' || 
                    partnerId === 'admin-user' ||
                    (partnerId.length > 0 && partnerId.includes('platform')) ||
                    anyP.isPlatformOwned === true ||
                    source === 'individual' ||
                    (source.length > 0 && source.includes('platform'))
                );
            })
            // Ensure drafts come first or respect default sort
            .sort((a, b) => {
                if (a.listingStatus === 'draft' && b.listingStatus !== 'draft') return -1;
                if (a.listingStatus !== 'draft' && b.listingStatus === 'draft') return 1;
                return new Date(b.listingStartDate || 0).getTime() - new Date(a.listingStartDate || 0).getTime();
            });
    }, [allProperties]);
    
    const subtitle = language === 'ar' 
        ? 'إدارة العقارات المعروضة مباشرة من خلال المنصة أو نيابة عن الملاك الأفراد. تشمل المسودات قيد التجهيز.' 
        : 'Manage properties listed directly through the platform or on behalf of individual owners. Includes drafts in progress.';

    return (
        <AdminPropertiesListPage
            title={t_admin?.nav?.platformProperties || (language === 'ar' ? 'عقارات المنصة' : 'Platform Properties')}
            subtitle={subtitle}
            properties={platformProperties}
            isLoading={isLoading}
            hideFilters={['partner', 'source']} // Hide partner filter since these are platform props
        />
    );
};

export default AdminPlatformPropertiesPage;
