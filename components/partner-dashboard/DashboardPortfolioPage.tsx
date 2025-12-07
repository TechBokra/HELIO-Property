
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PortfolioItem } from '../../types';
import { Role } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { ArrowUpIcon, ArrowDownIcon, CubeIcon } from '../ui/Icons';
import { inputClasses } from '../ui/FormField';
import PortfolioItemFormModal from './PortfolioItemFormModal';
import UpgradePlanModal from '../shared/UpgradePlanModal';
import { deletePortfolioItem as apiDeletePortfolioItem } from '../../services/portfolio';
import { useSubscriptionUsage } from '../../hooks/useSubscriptionUsage';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent, CardFooter } from '../ui/Card';
import ConfirmationModal from '../shared/ConfirmationModal';
import { useToast } from '../shared/ToastContext';
import ErrorState from '../shared/ErrorState';
import PortfolioItemSkeleton from '../shared/PortfolioItemSkeleton';

type SortConfig = {
    key: 'title' | 'category';
    direction: 'ascending' | 'descending';
} | null;

const DashboardPortfolioPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const { currentUser } = useAuth();
    const t_shared = t.adminShared;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const {
        data: partnerPortfolio,
        isLoading: loading,
        isError,
        isLimitReached,
        refetch
    } = useSubscriptionUsage('portfolio');

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [modalState, setModalState] = useState<{ isOpen: boolean; itemToEdit?: PortfolioItem }>({ isOpen: false });
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const deleteMutation = useMutation({
        mutationFn: apiDeletePortfolioItem,
        onSuccess: () => {
            showToast('Portfolio item deleted successfully.', 'success');
            queryClient.invalidateQueries({ queryKey: [`subscription-usage-portfolio-${currentUser?.id}`] });
        },
        onError: () => {
            showToast('Failed to delete item.', 'error');
        }
    });

    const sortedAndFilteredPortfolio = useMemo(() => {
        if (!partnerPortfolio) return [];
        let filteredItems = [...(partnerPortfolio as PortfolioItem[])];

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(
                (item) =>
                    item.title[language].toLowerCase().includes(lowercasedFilter) ||
                    item.category[language].toLowerCase().includes(lowercasedFilter),
            );
        }

        if (sortConfig !== null) {
            filteredItems.sort((a, b) => {
                const aValue = a[sortConfig.key][language];
                const bValue = b[sortConfig.key][language];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredItems;
    }, [partnerPortfolio, searchTerm, sortConfig, language]);

    if (currentUser?.role !== Role.FINISHING_PARTNER) {
        return null;
    }
    
    if (isError) {
        return <ErrorState onRetry={refetch} />;
    }

    const requestSort = (key: 'title' | 'category') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        deleteMutation.mutate(itemToDelete);
        setItemToDelete(null);
    };

    const handleAddWorkClick = () => {
        if (isLimitReached) {
            setIsUpgradeModalOpen(true);
        } else {
            setModalState({ isOpen: true });
        }
    };

    const handleSave = () => {
        setModalState({ isOpen: false });
        queryClient.invalidateQueries({ queryKey: [`subscription-usage-portfolio-${currentUser?.id}`] });
    };

    return (
        <div>
            {modalState.isOpen && (
                <PortfolioItemFormModal
                    itemToEdit={modalState.itemToEdit}
                    onClose={() => setModalState({ isOpen: false })}
                    onSave={handleSave}
                />
            )}
            {isUpgradeModalOpen && <UpgradePlanModal onClose={() => setIsUpgradeModalOpen(false)} />}
            {itemToDelete && (
                <ConfirmationModal
                    isOpen={!!itemToDelete}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={handleDelete}
                    title="Delete Portfolio Item"
                    message={t_dash.confirmDeleteWork}
                    confirmText="Delete"
                />
            )}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t_dash.portfolioTitle}</h1>
                <button
                    onClick={handleAddWorkClick}
                    className="bg-amber-500 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                >
                    {t_dash.addWork}
                </button>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder={t_dash.filter.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={inputClasses + ' max-w-xs'}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => <PortfolioItemSkeleton key={i} />)}
                </div>
            ) : sortedAndFilteredPortfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedAndFilteredPortfolio.map((item) => (
                        <Card key={item.id} className="group flex flex-col p-0 overflow-hidden">
                            <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                                <picture>
                                    <source type="image/webp" srcSet={`${item.imageUrl}&fm=webp`} />
                                    <img src={item.imageUrl} alt={item.alt} className="w-full h-full object-cover" />
                                </picture>
                            </div>
                            <CardContent className="p-4 flex-grow">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate" title={item.title[language]}>
                                    {item.title[language]}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.category[language]}</p>
                            </CardContent>
                            <CardFooter className="p-3 border-t border-gray-200 dark:border-gray-700 justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                                <button
                                    onClick={() => setModalState({ isOpen: true, itemToEdit: item })}
                                    className="font-medium text-amber-600 dark:text-amber-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50"
                                >
                                    {t_shared.edit}
                                </button>
                                <button
                                    onClick={() => setItemToDelete(item.id)}
                                    className="font-medium text-red-600 dark:text-red-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50"
                                >
                                    {t_dash.portfolioTable.delete}
                                </button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <CubeIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">{t_dash.portfolioTable.noWorks}</p>
                </div>
            )}
        </div>
    );
};

export default DashboardPortfolioPage;
