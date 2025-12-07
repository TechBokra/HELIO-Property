
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllPropertyRequests } from '../../services/propertyRequests';
import { getAllPropertyInquiries } from '../../services/propertyInquiries';
import { getAllContactRequests } from '../../services/contactRequests';
import { ClipboardDocumentListIcon, SearchIcon, InboxIcon, UsersIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';
import RequestList from '../shared/RequestList';
import { useLanguage } from '../shared/LanguageContext';
import type { AddPropertyRequest, PropertyInquiryRequest, ContactRequest } from '../../types';

const RealEstateMarketHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_home = t.adminDashboard.customerRelationsHome; // Reusing translations where appropriate

    const { data: propertyRequests, isLoading: loadingPropReqs } = useQuery({ queryKey: ['propertyRequests'], queryFn: getAllPropertyRequests });
    const { data: propertyInquiries, isLoading: loadingInquiries } = useQuery({ queryKey: ['propertyInquiries'], queryFn: getAllPropertyInquiries });
    const { data: contactRequests, isLoading: loadingContacts } = useQuery({ queryKey: ['contactRequests'], queryFn: getAllContactRequests });

    const isLoading = loadingPropReqs || loadingInquiries || loadingContacts;

    const stats = useMemo(() => {
        if (isLoading) return null;
        return {
            pendingListings: (propertyRequests || []).filter(r => r.status === 'pending').length,
            pendingInquiries: (propertyInquiries || []).filter(r => r.status === 'pending').length,
            pendingContacts: (contactRequests || []).filter(r => r.status === 'pending').length,
        };
    }, [isLoading, propertyRequests, propertyInquiries, contactRequests]);

    if (isLoading || !stats) return <div>Loading dashboard...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
             <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {language === 'ar' ? 'لوحة تحكم سوق العقارات' : 'Real Estate Market Dashboard'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {language === 'ar' 
                        ? 'متابعة طلبات العرض من الملاك، وطلبات البحث عن عقارات، ورسائل التواصل العامة.' 
                        : 'Oversee listing requests, property inquiries, and general contact messages.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title={t_home.newListingRequests} 
                    value={stats.pendingListings}
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
                                    <p className="font-medium group-hover:text-amber-600">{item.customerName}</p>
                                    <p className="text-sm text-gray-500 truncate max-w-xs" title={item.details}>{item.details}</p>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString(language)}</p>
                            </div>
                        </li>
                    )}
                />
            </div>
        </div>
    );
};

export default RealEstateMarketHomePage;
