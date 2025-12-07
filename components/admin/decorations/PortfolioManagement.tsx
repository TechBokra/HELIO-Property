
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { PortfolioItem } from '../../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllPortfolioItems, deletePortfolioItem as apiDeletePortfolioItem } from '../../../services/portfolio';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { getDecorationCategories } from '../../../services/decorations';
import { useLanguage } from '../../shared/LanguageContext';
import { TrashIcon, SparklesIcon } from '../../ui/Icons';
import { useToast } from '../../shared/ToastContext';

const PortfolioManagement: React.FC = () => {
    const { language, t } = useLanguage();
    const t_decor = t.adminDashboard.decorationsManagement;
    const t_shared = t.adminShared;
    const { showToast } = useToast();

    const { data: portfolio, refetch: refetchPortfolio, isLoading: loadingPortfolio } = useQuery({ queryKey: ['portfolio'], queryFn: getAllPortfolioItems });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { data: decorationCategories, isLoading: loadingCategories } = useQuery({ queryKey: ['decorationCategories'], queryFn: getDecorationCategories });
    
    const loading = loadingPortfolio || loadingPartners || loadingCategories;

    // Group items by category
    const groupedPortfolio = useMemo(() => {
        if (!portfolio || !decorationCategories) return [];

        // Map each category to a group containing its items
        return decorationCategories.map(category => {
            const categoryItems = portfolio.filter(item => 
                item.category.en === category.name.en || 
                item.category.ar === category.name.ar
            ).map(item => ({
                ...item,
                partnerName: (partners || []).find(p => p.id === item.partnerId)?.name || 'N/A'
            }));

            return {
                category,
                items: categoryItems
            };
        });
    }, [portfolio, decorationCategories, partners]);

    const handleDelete = async (itemId: string) => {
        if (window.confirm(t_decor.confirmDelete)) {
            await apiDeletePortfolioItem(itemId);
            refetchPortfolio();
            showToast('Item deleted successfully', 'success');
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t_decor.portfolioTab}</h2>
                <Link to="/admin/platform-decorations/portfolio/new" className="bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-amber-600 shadow-sm flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    {t_decor.addNewItem}
                </Link>
            </div>
            
            <div className="space-y-10">
                {groupedPortfolio.map((group) => (
                    <div key={group.category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {group.category.name[language]}
                            </h3>
                            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {group.items.length} {language === 'ar' ? 'عنصر' : 'Items'}
                            </span>
                        </div>
                        
                        {group.items.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                                {group.items.map(item => (
                                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden group flex flex-col hover:shadow-md transition-shadow">
                                        <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                                            <img src={item.imageUrl} alt={item.alt} className="w-full h-full object-cover" loading="lazy" />
                                            {item.availability === 'In Stock' && (
                                                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow">In Stock</span>
                                            )}
                                        </div>
                                        <div className="p-4 flex-grow">
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate" title={item.title[language]}>{item.title[language]}</h3>
                                            <div className="flex justify-between items-center mt-2">
                                                 <span className="text-sm text-amber-600 dark:text-amber-500 font-semibold">
                                                    {item.price ? `${item.price.toLocaleString()} EGP` : ''}
                                                </span>
                                            </div>
                                            {item.dimensions && <p className="text-xs text-gray-500 mt-1">{item.dimensions}</p>}
                                        </div>
                                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                                            <Link to={`/admin/platform-decorations/portfolio/edit/${item.id}`} className="font-medium text-amber-600 dark:text-amber-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50">{t_decor.editItem}</Link>
                                            <button onClick={() => handleDelete(item.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1">
                                                <TrashIcon className="w-3 h-3" /> {t.adminShared.delete}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                                {language === 'ar' ? 'لا توجد عناصر في هذا القسم.' : 'No items in this category.'}
                            </div>
                        )}
                    </div>
                ))}

                {groupedPortfolio.length === 0 && (
                    <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <p className="text-gray-500">{t_decor.noItems}</p>
                        <p className="text-sm text-gray-400 mt-2">Add categories first to start organizing portfolio items.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortfolioManagement;
