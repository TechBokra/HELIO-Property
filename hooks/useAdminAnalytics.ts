
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRequests } from '../services/requests';
import { getAllProperties } from '../services/properties';
import { getAllPartnersForAdmin } from '../services/partners';
import { useLanguage } from '../components/shared/LanguageContext';

export type TimePeriod = '7d' | '30d' | 'month' | 'year';

export const useAdminAnalytics = () => {
    const { language, t } = useLanguage();
    const t_request_types = t.adminDashboard.requestTypes;
    const t_dashboard = t.dashboard;

    const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');

    const { data: requests, isLoading: loadingRequests } = useQuery({ queryKey: ['allRequests'], queryFn: getAllRequests });
    const { data: properties, isLoading: loadingProperties } = useQuery({ queryKey: ['allPropertiesAnalytics'], queryFn: getAllProperties });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAnalytics'], queryFn: getAllPartnersForAdmin });

    const loading = loadingRequests || loadingProperties || loadingPartners;

    const { rangeStart, rangeEnd } = useMemo(() => {
        const end = new Date();
        let start = new Date();
        switch(timePeriod) {
            case '7d': start.setDate(end.getDate() - 7); break;
            case '30d': start.setDate(end.getDate() - 30); break;
            case 'month': start = new Date(end.getFullYear(), end.getMonth(), 1); break;
            case 'year': start = new Date(end.getFullYear(), 0, 1); break;
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { rangeStart: start, rangeEnd: end };
    }, [timePeriod]);

    const analyticsData = useMemo(() => {
        if (!requests || !properties || !partners) return null;

        const filteredRequests = requests.filter(l => {
            const reqDateTs = new Date(l.createdAt).getTime();
            return reqDateTs >= rangeStart.getTime() && reqDateTs <= rangeEnd.getTime();
        });

        const allLeads = requests.filter(r => r.type === 'LEAD');
        const completedLeads = allLeads.filter(l => (l.payload as any).status === 'completed');
        const conversionRate = allLeads.length > 0 ? `${((completedLeads.length / allLeads.length) * 100).toFixed(1)}%` : "0%";
        
        const leadsByProperty = allLeads.reduce((acc, lead) => {
            const propertyId = (lead.payload as any).propertyId;
            if(propertyId) acc[propertyId] = (acc[propertyId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topProperties = Object.entries(leadsByProperty)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, 5)
            .map(([id, count]) => ({ property: properties.find(p => p.id === id), count }))
            .filter(p => p.property);

        const leadsByPartner = allLeads.reduce((acc, lead) => {
            const partnerId = (lead.payload as any).partnerId;
            acc[partnerId] = (acc[partnerId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topPartners = Object.entries(leadsByPartner)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, 5)
            .map(([id, count]) => ({ partner: partners.find(p => p.id === id), count }))
            .filter(p => p.partner);

        const leadsOverTime = (() => {
            const groupedData = new Map<string, number>();
            const leadsInPeriod = filteredRequests.filter(r => r.type === 'LEAD');

            leadsInPeriod.forEach(lead => {
                const date = new Date(lead.createdAt);
                const key = timePeriod === 'year'
                    ? `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`
                    : date.toISOString().split('T')[0];
                groupedData.set(key, (groupedData.get(key) || 0) + 1);
            });

            const labels: string[] = [];
            const data: number[] = [];
            let currentDate = new Date(rangeStart);

            if (timePeriod === 'year') {
                for (let i = 0; i < 12; i++) {
                    const monthDate = new Date(rangeStart.getFullYear(), i, 1);
                    labels.push(monthDate.toLocaleString(language, { month: 'short' }));
                    const key = `${monthDate.getFullYear()}-${String(i).padStart(2, '0')}`;
                    data.push(groupedData.get(key) || 0);
                }
            } else {
                while (currentDate <= rangeEnd) {
                    labels.push(currentDate.toLocaleDateString(language, { day: 'numeric', month: 'short' }));
                    const key = currentDate.toISOString().split('T')[0];
                    data.push(groupedData.get(key) || 0);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            return { labels, data };
        })();
        
        const requestTypeDistribution = requests.reduce((acc, req) => {
            const typeName = t_request_types[req.type as keyof typeof t_request_types] || req.type;
            acc[typeName] = (acc[typeName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            newLeads: filteredRequests.filter(r => r.type === 'LEAD').length,
            newPartners: partners.filter(p => new Date(p.createdAt || 0) > rangeStart).length,
            newProperties: properties.filter(p => new Date(p.listingStartDate || 0) > rangeStart).length,
            conversionRate,
            topProperties,
            topPartners,
            leadsOverTime,
            requestTypeDistribution
        };
    }, [requests, properties, partners, rangeStart, rangeEnd, language, timePeriod, t_request_types]);

    return {
        loading,
        analyticsData,
        timePeriod,
        setTimePeriod
    };
};
