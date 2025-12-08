
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PortfolioItem } from '../../types';
import BannerDisplay from '../shared/BannerDisplay';
import SEO from '../shared/SEO';
import { usePortfolioItems } from '../../hooks/usePortfolioItems';
import { useDecorationCategories } from '../../hooks/useDecorationCategories';
import { useLanguage } from '../shared/LanguageContext';
import { useFavorites } from '../shared/FavoritesContext';
import { useToast } from '../shared/ToastContext';
import { HeartIcon, HeartIconSolid, ShareIcon, WhatsAppIcon, ShoppingCartIcon, SparklesIcon } from '../ui/Icons';
import { Button } from '../ui/Button';
import { useSiteContent } from '../../hooks/useSiteContent';

const DecorationsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_decor_page = t.decorationsPage;
    const t_decor_modal = t.decorationRequestModal;
    const t_custom_decor_modal = t.customDecorationRequestModal;
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { isFavorite, toggleFavorite } = useFavorites();

    // Fetch dynamic data
    const { data: siteContent } = useSiteContent();
    const { data: allWorks, isLoading: isLoadingWorks } = usePortfolioItems();
    const { data: decorationCategories, isLoading: isLoadingCats } = useDecorationCategories();
    
    const isLoading = isLoadingWorks || isLoadingCats;

    // Use dynamic content if available, fallback to translation file
    const content = siteContent?.decorationsPage?.[language] || t_decor_page;

    // Dynamic Tabs based on API Data
    const tabs = useMemo(() => (decorationCategories || []).map(cat => ({
        id: cat.id, 
        name: cat.name[language],
        desc: cat.description[language]
    })), [decorationCategories, language]);
    
    const [activeTabId, setActiveTabId] = useState('');
    const [shareModalOpen, setShareModalOpen] = useState(false);

    // Set initial active tab once categories are loaded
    useEffect(() => {
        if (tabs.length > 0 && !activeTabId) {
            setActiveTabId(tabs[0].id);
        }
    }, [tabs, activeTabId]);

    const activeTabInfo = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

    // Filter works based on category
    const filteredWorks = useMemo(() => {
        if (!activeTabId || !allWorks || !decorationCategories) return [];
        
        const currentCategory = decorationCategories.find(c => c.id === activeTabId);
        if (!currentCategory) return [];

        // Normalize names for comparison (DB stores category names in items)
        const categoryNameAr = currentCategory.name.ar.trim().toLowerCase();
        const categoryNameEn = currentCategory.name.en.trim().toLowerCase();

        return allWorks.filter(work => {
            const workCatAr = (work.category.ar || '').trim().toLowerCase();
            const workCatEn = (work.category.en || '').trim().toLowerCase();
            
            return workCatAr === categoryNameAr || workCatEn === categoryNameEn;
        });
    }, [allWorks, activeTabId, decorationCategories]);

    const openRequestPage = (work: PortfolioItem) => {
        const isBuyNow = work.availability === 'In Stock' && work.price;
        const serviceTitle = isBuyNow 
            ? `${language === 'ar' ? 'شراء:' : 'Purchase:'} ${work.title[language]}`
            : `${t_decor_modal.reference} ${work.title[language]}`;
            
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: 'admin-user',
                workItem: work,
                serviceType: 'decorations',
                isPurchase: isBuyNow
            }
        });
    };
    
    const openCustomRequestPage = () => {
        const serviceTitle = `${t_custom_decor_modal.serviceTitle}: ${activeTabInfo?.name || ''}`;
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: 'admin-user',
                categoryName: activeTabInfo?.name,
                isCustom: true,
                serviceType: 'decorations'
            }
        });
    };
    
    const handleWhatsAppShare = () => {
        const urlToShare = window.location.href;
        const text = encodeURIComponent(`${t.nav.decorations} | ONLY HELIO\n${content.heroSubtitle}\n${urlToShare}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        setShareModalOpen(false);
    };

    const handleCopyLink = async () => {
        const urlToShare = window.location.href;
        try {
            await navigator.clipboard.writeText(urlToShare);
            showToast(t.sharing.linkCopied, 'success');
            setShareModalOpen(false);
        } catch (err) {
            showToast(t.sharing.shareFailed, 'error');
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <SEO 
                title={`${t.nav.decorations} | ONLY HELIO`}
                description={content.heroSubtitle}
            />
            {shareModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={() => setShareModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            {t.sharing.shareDecorations}
                        </h3>
                        <div className="space-y-3">
                             <Button onClick={handleCopyLink} variant="outline" className="w-full justify-center">
                                {t.sharing.copyLink}
                            </Button>
                            <Button onClick={handleWhatsAppShare} className="w-full justify-center bg-green-500 hover:bg-green-600 text-white">
                                <WhatsAppIcon className="w-5 h-5 mr-2" />
                                {t.sharing.shareOnWhatsApp}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Hero Section */}
            <section className="relative h-[50vh] flex items-center justify-center text-center bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1616046229478-9901c5536a45?fm=webp&q=75&w=1600&auto=format&fit=crop')" }}>
                <div className="absolute top-0 left-0 w-full h-full bg-black/70 z-10"></div>
                <div className="relative z-20 px-4 container mx-auto text-white">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-shadow">{content.heroTitle}</h1>
                    <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-200 mt-4 text-shadow">{content.heroSubtitle}</p>
                     <div className="mt-6">
                        <Button
                            onClick={() => setShareModalOpen(true)}
                            variant="secondary"
                            className="bg-white/20 text-white border-white/50 hover:bg-white/30 backdrop-blur-sm"
                        >
                            <ShareIcon className="w-5 h-5 mr-2" />
                            {t.sharing.share}
                        </Button>
                    </div>
                </div>
            </section>

            <div className="py-20">
                <div className="container mx-auto px-6">
                    {/* Tabs Navigation */}
                    <div className="flex justify-center mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <div className="flex flex-nowrap -mb-px space-x-4 pb-2" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTabId(tab.id)}
                                    className={`px-4 py-2 font-semibold text-lg border-b-2 transition-colors duration-200 whitespace-nowrap ${
                                        activeTabId === tab.id
                                        ? 'border-amber-500 text-amber-600 dark:text-amber-500'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-amber-500'
                                    }`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-center max-w-4xl mx-auto mb-12 animate-fadeIn">
                         <p className="text-lg text-gray-600 dark:text-gray-300 min-h-[3rem]">
                            {activeTabInfo?.desc}
                        </p>
                        <button
                            onClick={openCustomRequestPage}
                            className="mt-6 bg-amber-500 text-gray-900 font-bold px-8 py-3 rounded-full hover:bg-amber-600 transition-colors duration-200 shadow-lg hover:shadow-amber-500/20 transform hover:-translate-y-1"
                        >
                            {t_decor_page.requestCustomDesign}
                        </button>
                    </div>

                    <BannerDisplay location="decorations" />
                   
                   {/* Portfolio Grid */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fadeIn mt-12 min-h-[400px]">
                       {isLoading ? (
                           Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl aspect-[4/5] animate-pulse"></div>
                           ))
                       ) : filteredWorks.length > 0 ? (
                           filteredWorks.map((work, index) => {
                                const isFav = isFavorite(work.id, 'portfolio');
                                const isBuyNow = work.availability === 'In Stock' && work.price;
                                
                                const handleFavoriteClick = (e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleFavorite(work.id, 'portfolio');
                                    showToast(isFav ? t.favoritesPage.removedFromFavorites : t.favoritesPage.addedToFavorites, 'success');
                                };
                                
                               return (
                                   <div key={`${work.imageUrl}-${index}`} className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden flex flex-col transform hover:-translate-y-2 transition-all duration-300 hover:shadow-lg">
                                       <div className="relative overflow-hidden">
                                           <div className="aspect-[4/5] bg-gray-100 dark:bg-gray-700">
                                               <picture>
                                                   <source type="image/webp" srcSet={`${work.imageUrl}&fm=webp`} />
                                                   <img 
                                                       src={work.imageUrl} 
                                                       alt={work.alt} 
                                                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                       loading="lazy" 
                                                   />
                                               </picture>
                                           </div>
                                           
                                           {/* Availability Badge */}
                                           {work.availability && (
                                               <span className={`absolute top-3 ${language === 'ar' ? 'left-3' : 'right-3'} text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm ${work.availability === 'In Stock' ? 'bg-green-600' : 'bg-sky-600'}`}>
                                                   {work.availability === 'In Stock' ? t_decor_page.inStock : t_decor_page.madeToOrder}
                                               </span>
                                           )}

                                           {/* Favorite Button */}
                                           <button 
                                                onClick={handleFavoriteClick} 
                                                className="absolute top-3 left-3 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all z-10 opacity-0 group-hover:opacity-100"
                                                aria-label={isFav ? t.favoritesPage.removeFromFavorites : t.favoritesPage.addToFavorites}
                                           >
                                                {isFav ? <HeartIconSolid className="w-5 h-5 text-red-500" /> : <HeartIcon className="w-5 h-5 text-white" />}
                                           </button>
                                       </div>
                                       
                                       <div className="p-5 flex flex-col flex-grow">
                                           <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate mb-1 group-hover:text-amber-500 transition-colors">{work.title[language]}</h3>
                                           
                                           <div className="flex justify-between items-end mb-4 mt-auto pt-2">
                                                <div>
                                                    {work.dimensions && <p className="text-xs text-gray-500 dark:text-gray-400">{t_decor_page.dimensions}: {work.dimensions}</p>}
                                                </div>
                                                {work.price != null && (
                                                    <span className="font-bold text-amber-600 dark:text-amber-500 text-lg">
                                                        {new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }).format(work.price)}
                                                    </span>
                                                )}
                                           </div>
                                           
                                           <button 
                                               onClick={() => openRequestPage(work)}
                                               className={`w-full py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${isBuyNow ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-amber-500 dark:hover:bg-amber-500 hover:text-gray-900'}`}
                                           >
                                               {isBuyNow && <ShoppingCartIcon className="w-4 h-4" />}
                                               {isBuyNow ? (language === 'ar' ? 'شراء الآن' : 'Buy Now') : t_decor_page.inquireNow}
                                           </button>
                                       </div>
                                   </div>
                               )
                           })
                        ) : (
                            <div className="col-span-full text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <SparklesIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-xl text-gray-500 dark:text-gray-400">
                                    {language === 'ar' ? 'لا توجد أعمال في هذا القسم حاليًا.' : 'No works in this section currently.'}
                                </p>
                            </div>
                        )}
                   </div>

                </div>
            </div>
        </div>
    );
};

export default DecorationsPage;
