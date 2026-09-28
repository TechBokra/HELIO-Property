
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Property } from '../../types';
import { Role } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { BuildingIcon } from '../ui/Icons';
import { inputClasses } from '../ui/FormField';
import UpgradePlanModal from '../shared/UpgradePlanModal';
import ExportDropdown from '../shared/ExportDropdown';
import { deleteProperty as apiDeleteProperty } from '../../services/properties';
import { useSubscriptionUsage } from '../../hooks/useSubscriptionUsage';
import { useLanguage } from '../shared/LanguageContext';
import { Select } from '../ui/Select';
import { Card, CardContent, CardFooter } from '../ui/Card';
import ConfirmationModal from '../shared/ConfirmationModal';
import ErrorState from '../shared/ErrorState';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';

const DashboardPropertiesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const {
        data: partnerProperties,
        isLoading: loading,
        isError,
        isLimitReached,
        refetch,
    } = useSubscriptionUsage('properties');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

    const filteredProperties = useMemo(() => {
        if (!partnerProperties) return [];
        let filteredProps = [...(partnerProperties as Property[])];

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredProps = filteredProps.filter((prop) => prop.title[language].toLowerCase().includes(lowercasedFilter));
        }

        if (statusFilter !== 'all') {
            filteredProps = filteredProps.filter((prop) => prop.status.en === statusFilter);
        }

        return filteredProps;
    }, [partnerProperties, searchTerm, statusFilter, language]);

    if (currentUser?.role !== Role.AGENCY_PARTNER && currentUser?.role !== Role.DEVELOPER_PARTNER) {
        return null;
    }

    const handleDelete = async () => {
        if (!propertyToDelete) return;
        await apiDeleteProperty(propertyToDelete);
        setPropertyToDelete(null);
        refetch();
    };

    const handleAddPropertyClick = () => {
        if (isLimitReached) {
            setIsUpgradeModalOpen(true);
        } else {
            navigate('/dashboard/properties/new');
        }
    };

    const exportColumns = {
        [`title.${language}`]: t_dash.propertyTable.title,
        [`status.${language}`]: t_dash.propertyTable.status,
        [`price.${language}`]: t_dash.propertyTable.price,
        area: language === 'ar' ? 'المساحة (م²)' : 'Area (m²)',
    };

    if (isError) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div>
            {isUpgradeModalOpen && <UpgradePlanModal onClose={() => setIsUpgradeModalOpen(false)} />}
            {propertyToDelete && (
                <ConfirmationModal
                    isOpen={!!propertyToDelete}
                    onClose={() => setPropertyToDelete(null)}
                    onConfirm={handleDelete}
                    title="Delete Property"
                    message={t_dash.propertyTable.confirmDelete}
                    confirmText="Delete"
                />
            )}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t_dash.propertiesTitle}</h1>
                <div className="flex items-center gap-4">
                    <ExportDropdown data={filteredProperties} columns={exportColumns} filename="my-properties" />
                    <button
                        onClick={handleAddPropertyClick}
                        className="bg-amber-500 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                    >
                        {t_dash.addProperty}
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-4">
                <input
                    type="text"
                    placeholder={t_dash.filter.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={inputClasses + ' max-w-xs'}
                />
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="max-w-xs"
                >
                    <option value="all">
                        {t_dash.filter.filterByStatus} ({t_dash.filter.all})
                    </option>
                    <option value="For Sale">{t.propertiesPage.forSale}</option>
                    <option value="For Rent">{t.propertiesPage.forRent}</option>
                </Select>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
                </div>
            ) : filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProperties.map((prop) => {
                        const isForSale = prop.status.en === 'For Sale';
                        const isVerified = prop.verificationStatus === 'verified';
                        const availability = prop.availabilityStatus || 'available';
                        const refCode = prop.referenceNumber || prop.id.slice(0, 8);

                        return (
                            <Card key={prop.id} className="group flex flex-col p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="relative">
                                    <img src={prop.imageUrl} alt={prop.title[language]} className="w-full h-48 object-cover" />
                                    <div className={`absolute top-3 ${language === 'ar' ? 'right-3' : 'left-3'} flex flex-col gap-1 items-start`}>
                                        <span className={`text-white font-semibold px-2.5 py-0.5 rounded-md text-xs shadow-sm ${
                                            isForSale ? 'bg-green-600' : 'bg-sky-600'
                                        }`}>
                                            {prop.status[language]}
                                        </span>
                                        {availability === 'sold' && (
                                            <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">
                                                {language === 'ar' ? 'تم البيع' : 'Sold'}
                                            </span>
                                        )}
                                        {availability === 'reserved' && (
                                            <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">
                                                {language === 'ar' ? 'محجوز' : 'Reserved'}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`absolute top-3 ${language === 'ar' ? 'left-3' : 'right-3'} flex flex-col items-end gap-1`}>
                                        {isVerified ? (
                                            <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">
                                                ✓ {language === 'ar' ? 'موثق' : 'Verified'}
                                            </span>
                                        ) : (
                                            <span className="bg-gray-800/80 text-gray-200 px-2 py-0.5 rounded text-[10px] shadow-sm">
                                                {language === 'ar' ? 'قيد المراجعة' : 'In Review'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <CardContent className="p-4 flex flex-col flex-grow">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <span className="font-mono text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                            {refCode}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                            prop.listingStatus === 'active' 
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                        }`}>
                                            {prop.listingStatus === 'active' ? (language === 'ar' ? 'منشور' : 'Published') : (language === 'ar' ? 'مسودة' : 'Draft')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate text-base" title={prop.title[language]}>
                                        {prop.title[language]}
                                    </h3>
                                    <p className="text-amber-500 font-bold mt-1 text-lg">{prop.price[language]}</p>
                                    {prop.priceUpdatedAt && (
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            {language === 'ar' ? 'تأكيد السعر:' : 'Price updated:'} {new Date(prop.priceUpdatedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter className="p-3 border-t border-gray-200 dark:border-gray-700 justify-between gap-2 bg-gray-50 dark:bg-gray-800/50">
                                    <Link
                                        to={`/properties/${prop.id}`}
                                        target="_blank"
                                        className="text-xs text-gray-600 dark:text-gray-300 hover:text-amber-600 underline"
                                    >
                                        {language === 'ar' ? 'معاينة' : 'Preview'}
                                    </Link>
                                    <div className="flex gap-2">
                                        <Link
                                            to={`/dashboard/properties/edit/${prop.id}`}
                                            className="font-medium text-amber-600 dark:text-amber-500 hover:underline text-xs px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40"
                                        >
                                            {t_dash.propertyTable.edit}
                                        </Link>
                                        <button
                                            onClick={() => setPropertyToDelete(prop.id)}
                                            className="font-medium text-red-600 dark:text-red-500 hover:underline text-xs px-2.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                                        >
                                            {t_dash.propertyTable.delete}
                                        </button>
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <BuildingIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">{t_dash.propertyTable.noProperties}</p>
                </div>
            )}
        </div>
    );
};

export default DashboardPropertiesPage;
