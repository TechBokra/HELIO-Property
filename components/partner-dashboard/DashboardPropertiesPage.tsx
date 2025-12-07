
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
                        return (
                            <Card key={prop.id} className="group flex flex-col p-0 overflow-hidden">
                                <div className="relative">
                                    <img src={prop.imageUrl} alt={prop.title[language]} className="w-full h-48 object-cover" />
                                    <span
                                        className={`absolute top-3 ${
                                            language === 'ar' ? 'right-3' : 'left-3'
                                        } text-white font-semibold px-3 py-1 rounded-md text-xs ${
                                            isForSale ? 'bg-green-600' : 'bg-sky-600'
                                        }`}
                                    >
                                        {prop.status[language]}
                                    </span>
                                </div>
                                <CardContent className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate" title={prop.title[language]}>
                                        {prop.title[language]}
                                    </h3>
                                    <p className="text-amber-500 font-semibold mt-1">{prop.price[language]}</p>
                                </CardContent>
                                <CardFooter className="p-3 border-t border-gray-200 dark:border-gray-700 justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                                    <Link
                                        to={`/dashboard/properties/edit/${prop.id}`}
                                        className="font-medium text-amber-600 dark:text-amber-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50"
                                    >
                                        {t_dash.propertyTable.edit}
                                    </Link>
                                    <button
                                        onClick={() => setPropertyToDelete(prop.id)}
                                        className="font-medium text-red-600 dark:text-red-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50"
                                    >
                                        {t_dash.propertyTable.delete}
                                    </button>
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
