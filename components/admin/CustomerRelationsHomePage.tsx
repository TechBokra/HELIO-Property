
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { PartnerRequest, PropertyInquiryRequest, AddPropertyRequest, ContactRequest } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllPropertyRequests } from '../../services/propertyRequests';
import { getAllPropertyInquiries } from '../../services/propertyInquiries';
import { getAllContactRequests } from '../../services/contactRequests';
import { InboxIcon, ClipboardDocumentListIcon, SearchIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';
import RequestList from '../shared/RequestList';
import { useLanguage } from '../shared/LanguageContext';

const CustomerRelationsHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_home = t.adminDashboard.customerRelationsHome;

    const { data: propertyRequests, isLoading: loadingPropReqs } = useQuery({ queryKey: ['propertyRequests'], queryFn: getAllPropertyRequests });
    const { data: propertyInquiries, isLoading: loadingInquiries } = useQuery({ queryKey: ['propertyInquiries'], queryFn: getAllPropertyInquiries });
    const { data: contactRequests, isLoading: loadingContacts } = useQuery({ queryKey: ['contactRequests'], queryFn: getAllContactRequests });

    const isLoading = loadingPropReqs || loadingInquiries || loadingContacts;

    const stats = useMemo(() => {
        if (isLoading) return null;
        return {
            pendingPropertyRequests: (propertyRequests || []).filter(r => r.status === 'pending').length,
            pendingInquiries: (propertyInquiries || []).filter(r => r.status === 'pending').length,
            pendingContacts: (contactRequests || []).filter(r => r.status === 'pending').length,
        };
    }, [isLoading, propertyRequests, propertyInquiries, contactRequests]);

    if (isLoading || !stats) {
        return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_home.title}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t_home.subtitle}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title={t_home.newListingRequests} 
                    value={stats.pendingPropertyRequests}
                    icon={ClipboardDocumentListIcon}
                    linkTo="/admin/properties/listing-requests"
                />
                <StatCard 
                    title={t_home.newSearchRequests}
                    value={stats.pendingInquiries}
                    icon={SearchIcon}
                    linkTo="/admin/properties/search-requests"
                />
                <StatCard 
                    title={t_home.newContactMessages}
                    value={stats.pendingContacts}
                    icon={InboxIcon}
                    linkTo="/admin/contact-requests"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <RequestList<AddPropertyRequest>
                    title={t_home.recentPropertyRequests}
                    requests={propertyRequests}
                    linkTo="/admin/properties/listing-requests"
                    itemRenderer={(item) => (
                        <li key={item.id} className="py-3">
                            <Link to={`/admin/properties/listing-requests/${item.id}`} className="flex justify-between items-center group">
                                <div>
                                    <p className="font-medium group-hover:text-amber-600">{item.customerName}</p>
                                    <p className="text-sm text-gray-500">{item.propertyDetails.propertyType[language]} - {item.propertyDetails.area}m²</p>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString(language)}</p>
                            </Link>
                        </li>
                    )}
                />

                <RequestList<PropertyInquiryRequest>
                    title={t_home.recentInquiries}
                    requests={propertyInquiries}
                    linkTo="/admin/properties/search-requests"
                    itemRenderer={(item) => (
                         <li key={item.id} className="py-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{item.customerName}</p>
                                    <p className="text-sm text-gray-500 truncate max-w-xs" title={item.details}>{item.details}</p>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString(language)}</p>
                            </div>
                        </li>
                    )}
                />
            </div>
             <RequestList<ContactRequest>
                title={t_home.recentContacts}
                requests={contactRequests}
                linkTo="/admin/contact-requests"
                itemRenderer={(item) => (
                    <li key={item.id} className="py-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-500 truncate max-w-md" title={item.message}>{item.message}</p>
                            </div>
                            <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString(language)}</p>
                        </div>
                    </li>
                )}
            />
        </div>
    );
};

export default CustomerRelationsHomePage;
