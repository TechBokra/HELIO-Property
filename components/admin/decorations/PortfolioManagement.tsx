
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllPortfolioItems, deletePortfolioItem as apiDeletePortfolioItem } from '../../../services/portfolio';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { getDecorationCategories } from '../../../services/decorations';
import { useLanguage } from '../../shared/LanguageContext';
import { TrashIcon, SparklesIcon, ExclamationTriangleIcon } from '../../ui/Icons';
import { useToast } from '../../shared/ToastContext';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { resolveServiceReferenceCode } from '../../../utils/propertyFormShared';

const PortfolioManagement: React.FC = () => {
    const { language, t } = useLanguage();
    const t_decor = t.adminDashboard.decorationsManagement;
    const { showToast } = useToast();

    const { data: portfolio, refetch: refetchPortfolio, isLoading: loadingPortfolio, isError: portfolioError } = useQuery({
        queryKey: ['portfolio'],
        queryFn: () => getAllPortfolioItems({ throwOnError: true })
    });
    const { data: partners, isLoading: loadingPartners } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin
    });
    const { data: decorationCategories, isLoading: loadingCategories, isError: categoriesError } = useQuery({
        queryKey: ['decorationCategories'],
        queryFn: () => getDecorationCategories({ throwOnError: true })
    });

    const loading = loadingPortfolio || loadingPartners || loadingCategories;

    const resolvePartnerName = (partnerId?: string) => {
        if (!partnerId) return language === 'ar' ? 'استوديو المنصة' : 'Platform Studio';
        const match = (partners || []).find(p => p.id === partnerId);
        if (!match) return language === 'ar' ? 'استوديو المنصة' : 'Platform Studio';
        return language === 'ar' ? (match.nameAr || match.name) : match.name;
    };

    // Group items by categoryId (authoritative) or normalized bilingual category name
    const { groupedPortfolio, uncategorizedItems } = useMemo(() => {
        if (!portfolio || !decorationCategories) {
            return { groupedPortfolio: [], uncategorizedItems: [] };
        }

        const assignedIds = new Set<string>();
        const groups = decorationCategories.map(category => {
            const catEn = (category.name.en || '').trim().toLowerCase();
            const catAr = (category.name.ar || '').trim().toLowerCase();

            const categoryItems = portfolio
                .filter(item => {
                    const matched =
                        (item.categoryId && item.categoryId === category.id) ||
                        (item.category?.en || '').trim().toLowerCase() === catEn ||
                        (item.category?.ar || '').trim().toLowerCase() === catAr;
                    if (matched) assignedIds.add(item.id);
                    return matched;
                })
                .map(item => ({
                    ...item,
                    partnerName: resolvePartnerName(item.partnerId),
                    refCode: resolveServiceReferenceCode('decoration', item.id, item.referenceNumber),
                }));

            return {
                category,
                items: categoryItems
            };
        });

        const unassigned = portfolio
            .filter(item => !assignedIds.has(item.id))
            .map(item => ({
                ...item,
                partnerName: resolvePartnerName(item.partnerId),
                refCode: resolveServiceReferenceCode('decoration', item.id, item.referenceNumber),
            }));

        return { groupedPortfolio: groups, uncategorizedItems: unassigned };
    }, [portfolio, decorationCategories, partners, language]);

    const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await apiDeletePortfolioItem(itemToDelete);
            refetchPortfolio();
            showToast(language === 'ar' ? 'تم حذف العنصر بنجاح' : 'Item deleted successfully', 'success');
        } catch (e: any) {
            showToast(e?.message || 'Failed to delete item', 'error');
        } finally {
            setIsDeleting(false);
            setItemToDelete(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="animate-fadeIn">
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
                message={t_decor.confirmDelete}
                confirmText={t.adminShared.delete}
                cancelText={t.adminShared.cancel}
                isLoading={isDeleting}
            />

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t_decor.portfolioTab}</h2>
                <Link to="/admin/platform-decorations/portfolio/new" className="bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-amber-600 shadow-sm flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    {t_decor.addNewItem}
                </Link>
            </div>

            {(portfolioError || categoriesError) && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3 text-sm text-red-700 dark:text-red-300">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        <span>{language === 'ar' ? 'تعذر تحميل بيانات المعرض أو التصنيفات من قاعدة البيانات.' : 'Failed to load portfolio items or categories from database.'}</span>
                    </div>
                    <button type="button" onClick={() => refetchPortfolio()} className="font-bold underline">
                        {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            )}

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
                                            <span className="absolute bottom-2 left-2 bg-black/70 text-white font-mono text-[10px] px-2 py-0.5 rounded">
                                                {item.refCode}
                                            </span>
                                        </div>
                                        <div className="p-4 flex-grow space-y-1.5">
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate" title={item.title[language]}>{item.title[language]}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {language === 'ar' ? 'الشريك:' : 'Partner:'} <span className="font-semibold text-gray-700 dark:text-gray-200">{item.partnerName}</span>
                                            </p>
                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-sm text-amber-600 dark:text-amber-500 font-semibold">
                                                    {item.price ? `${item.price.toLocaleString()} EGP` : ''}
                                                </span>
                                            </div>
                                            {item.dimensions && <p className="text-xs text-gray-500">{item.dimensions}</p>}
                                        </div>
                                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                                            <Link to={`/admin/platform-decorations/portfolio/edit/${item.id}`} className="font-medium text-amber-600 dark:text-amber-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50">{t_decor.editItem}</Link>
                                            <button onClick={() => setItemToDelete(item.id)} disabled={isDeleting} className="font-medium text-red-600 dark:text-red-500 hover:underline text-sm px-3 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1 disabled:opacity-50">
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

                {uncategorizedItems.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {language === 'ar' ? 'أعمال غير مصنفة / تصنيف سابق' : 'Uncategorized / Legacy Category Items'}
                            </h3>
                            <span className="bg-amber-200 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {uncategorizedItems.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                            {uncategorizedItems.map(item => (
                                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                                        <img src={item.imageUrl} alt={item.alt} className="w-full h-full object-cover" loading="lazy" />
                                        <span className="absolute bottom-2 left-2 bg-black/70 text-white font-mono text-[10px] px-2 py-0.5 rounded">
                                            {item.refCode}
                                        </span>
                                    </div>
                                    <div className="p-4 flex-grow space-y-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{item.title[language]}</h3>
                                        <p className="text-xs text-gray-500">{item.category[language]}</p>
                                        <p className="text-xs text-gray-500">{item.partnerName}</p>
                                    </div>
                                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                                        <Link to={`/admin/platform-decorations/portfolio/edit/${item.id}`} className="font-medium text-amber-600 hover:underline text-sm px-3 py-1">{t_decor.editItem}</Link>
                                        <button onClick={() => setItemToDelete(item.id)} disabled={isDeleting} className="font-medium text-red-600 hover:underline text-sm px-3 py-1 flex items-center gap-1">
                                            <TrashIcon className="w-3 h-3" /> {t.adminShared.delete}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {groupedPortfolio.length === 0 && uncategorizedItems.length === 0 && (
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
