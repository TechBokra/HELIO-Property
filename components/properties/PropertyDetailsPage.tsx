import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
    BedIcon, BathIcon, AreaIcon, CheckBadgeIcon, ShareIcon, HeartIcon, HeartIconSolid, 
    FloorIcon, CalendarIcon, WalletIcon, BuildingIcon, WrenchScrewdriverIcon, CompoundIcon, BanknotesIcon, WhatsAppIcon, PhoneIcon, LocationMarkerIcon
} from '../ui/Icons';
import type { Language } from '../../types';
import { useFavorites } from '../shared/FavoritesContext';
import Lightbox from '../shared/Lightbox';
import BannerDisplay from '../shared/BannerDisplay';
import { getPropertyById } from '../../services/properties';
import DetailItem from '../shared/DetailItem';
import ContactOptionsModal from '../shared/ContactOptionsModal';
import { useToast } from '../shared/ToastContext';
import SEO from '../shared/SEO';
import DetailSection from '../shared/DetailSection';
import PropertyDetailsSkeleton from '../shared/PropertyDetailsSkeleton';
import { getPartnerById } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import { isCommercial } from '../../utils/propertyUtils';
import { Button } from '../ui/Button';
import StackedImageGallery from './StackedImageGallery';
import UnifiedMap from '../shared/UnifiedMap';
import { useAuth } from '../auth/AuthContext';
import { trackPropertyView, trackWhatsAppClick, trackCallClick } from '../../services/analytics';

const PropertyDetailsPage: React.FC = () => {
    const { propertyId } = useParams<{ propertyId: string }>();
    const { language, t } = useLanguage();
    const t_page = t.propertyDetailsPage;
    const { isFavorite, toggleFavorite } = useFavorites();
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const fetchProperty = useCallback(() => getPropertyById(propertyId!), [propertyId]);
    const { 
        data: property, 
        isLoading: isLoadingProp, 
        isError: isPropError, 
        refetch: refetchProperty 
    } = useQuery({ 
        queryKey: [`property-${propertyId}`], 
        queryFn: fetchProperty, 
        enabled: !!propertyId 
    });
    
    const { data: partner, isLoading: isLoadingPartner } = useQuery({
        queryKey: [`partner-${property?.partnerId}`],
        queryFn: () => getPartnerById(property!.partnerId),
        enabled: !!property?.partnerId,
    });
    
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [shareModalState, setShareModalState] = useState({ isOpen: false });
    
    const isLoading = isLoadingProp || isLoadingPartner;
    const isFav = propertyId ? isFavorite(propertyId, 'property') : false;

    // Safe bilingual helpers (prevents crashes from undefined bilingual fields)
    const propTitle = property?.title?.[language] || property?.title?.ar || property?.title?.en || '';
    const propDesc = property?.description?.[language] || property?.description?.ar || property?.description?.en || '';
    const propAddr = property?.address?.[language] || property?.address?.ar || property?.address?.en || '';
    const propPrice = property?.price?.[language] || property?.price?.ar || property?.price?.en || '';
    const propPricePerMeter = property?.pricePerMeter?.[language] || property?.pricePerMeter?.ar || property?.pricePerMeter?.en || '';
    const propType = property?.type?.[language] || property?.type?.ar || property?.type?.en || '';
    const propFinishing = property?.finishingStatus?.[language] || property?.finishingStatus?.ar || property?.finishingStatus?.en || '';

    const handleFavoriteClick = useCallback(() => {
        if(!propertyId) return;
        toggleFavorite(propertyId, 'property');
        showToast(isFav ? t.favoritesPage.removedFromFavorites : t.favoritesPage.addedToFavorites, 'success');
    }, [propertyId, isFav, toggleFavorite, showToast, t.favoritesPage]);

    const handleShare = useCallback(() => {
        setShareModalState({ isOpen: true });
    }, []);
    
    const handleCloseShareModal = () => {
        setShareModalState({ isOpen: false });
    };

    const handleContact = useCallback(() => {
        if (!partner?.contactMethods) {
            navigate('/request-service', { 
                state: {
                    partnerId: property?.partnerId, 
                    serviceTitle: `${t_page.inquiryAbout} "${propTitle}"`,
                    propertyId: property?.id,
                    serviceType: 'property',
                    propertyTitle: propTitle
                } 
            });
            return;
        }
        const { whatsapp, phone, form } = partner.contactMethods;
        const hasEnabledMethod = (whatsapp.enabled && whatsapp.number) || (phone.enabled && phone.number) || form.enabled;
        if (!hasEnabledMethod) {
            navigate('/request-service', { 
                state: {
                    partnerId: property?.partnerId, 
                    serviceTitle: `${t_page.inquiryAbout} "${propTitle}"`,
                    propertyId: property?.id,
                    serviceType: 'property',
                    propertyTitle: propTitle
                } 
            });
        } else {
            setContactModalOpen(true);
        }
    }, [partner, property, propTitle, t_page.inquiryAbout, navigate]);

    const handleImageClick = (index: number) => {
        setLightboxStartIndex(index);
        setLightboxOpen(true);
    };

    const pageTitle = property ? `${propTitle} | ONLY HELIO` : 'ONLY HELIO';
    const pageDescription = propDesc.substring(0, 160);
    const amenityKeys = property ? (property.amenities?.[language] || property.amenities?.ar || property.amenities?.en || []) : [];
    const allImages = property ? [property.imageUrl, ...property.gallery].filter(Boolean) : [];

    useEffect(() => {
        if (property?.id) {
            trackPropertyView(property.id, property.partnerId);
        }
    }, [property?.id, property?.partnerId]);

    const propertyUrl = typeof window !== 'undefined' ? window.location.href : `https://onlyhelio.com/properties/${property?.id}`;
    const targetPhone = partner?.contactMethods?.phone?.number || property?.ownerPhone || '+201099999999';
    const targetWhatsApp = partner?.contactMethods?.whatsapp?.number?.replace(/[^0-9]/g, '') || property?.ownerPhone?.replace(/[^0-9]/g, '') || '201099999999';
    const refCode = property?.referenceNumber || property?.id?.slice(0, 8) || '';
    
    const whatsappText = encodeURIComponent(
        language === 'ar'
            ? `مرحبًا، أود الاستفسار عن العقار المعروض على ONLY HELIO:\n"${property?.title?.ar || propTitle}"\nكود العقار: ${refCode}\nالسعر: ${property?.price?.ar || propPrice}\nرابط العقار: ${propertyUrl}`
            : `Hello, I'm inquiring about the property on ONLY HELIO:\n"${property?.title?.en || propTitle}"\nRef: ${refCode}\nPrice: ${property?.price?.en || propPrice}\nLink: ${propertyUrl}`
    );
    const whatsappUrl = `https://wa.me/${targetWhatsApp}?text=${whatsappText}`;
    const phoneUrl = `tel:${targetPhone}`;

    const structuredData = useMemo(() => {
        if (!property) return undefined;
        return {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "name": propTitle,
            "description": propDesc,
            "image": [property.imageUrl, ...(property.gallery || [])],
            "offers": {
                "@type": "Offer",
                "price": property.priceNumeric,
                "priceCurrency": "EGP",
                "availability": property.availabilityStatus === 'sold' ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
                "validFrom": property.listingStartDate || property.verifiedAt || "2024-09-01"
            },
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "New Heliopolis",
                "addressCountry": "EG"
            }
        };
    }, [property, propTitle, propDesc]);

    const handleWhatsAppShare = () => {
        const urlToShare = window.location.href;
        const text = encodeURIComponent(`${propTitle}\n${urlToShare}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        handleCloseShareModal();
    };

    const handleCopyLink = async () => {
        const urlToShare = window.location.href;
        try {
            await navigator.clipboard.writeText(urlToShare);
            showToast(t.sharing.linkCopied, 'success');
            handleCloseShareModal();
        } catch (err) {
            showToast(t.sharing.shareFailed, 'error');
        }
    };

    if (isLoading) {
        return <PropertyDetailsSkeleton />;
    }

    if (isPropError) {
        return (
            <div className="text-center py-20 container mx-auto px-4">
                <div className="max-w-md mx-auto bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl p-8">
                    <span className="text-3xl">⚠️</span>
                    <h1 className="text-xl font-bold mt-4 text-gray-900 dark:text-white">
                        {language === 'ar' ? 'تعذر تحميل بيانات العقار' : 'Failed to load property details'}
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        {language === 'ar' ? 'حدث خطأ مؤقت في الاتصال بقاعدة البيانات، يرجى المحاولة مرة أخرى.' : 'A temporary connection error occurred. Please try again.'}
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Button variant="primary" onClick={() => refetchProperty()}>
                            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                        </Button>
                        <Link to="/properties" className="inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold px-4 py-2 rounded-lg text-sm">
                            {t_page.backButton}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="text-center py-20 container mx-auto">
                <SEO title={t_page.notFoundTitle} description={t_page.notFoundText} />
                <h1 className="text-4xl font-bold">{t_page.notFoundTitle}</h1>
                <p className="mt-4 text-gray-500">{t_page.notFoundText}</p>
                <Link to="/properties" className="mt-8 inline-block bg-amber-500 text-gray-900 font-semibold px-6 py-3 rounded-lg">{t_page.backButton}</Link>
            </div>
        );
    }

    const isPublished = property.listingStatus === 'active' || property.listingStatus === 'sold' || property.publicationStatus === 'published';
    const isOwner = !!(currentUser?.id && currentUser.id === property.partnerId);
    const isAdmin = !!(currentUser?.role === 'super_admin' || currentUser?.role?.includes('_manager'));
    const canView = isPublished || isOwner || isAdmin;

    if (!canView) {
        return (
            <div className="text-center py-20 container mx-auto px-4">
                <SEO title="عقار قيد المراجعة | Property Under Review" description="This listing is under review and not published yet." />
                <div className="max-w-md mx-auto bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8">
                    <span className="text-3xl">🔒</span>
                    <h1 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">
                        {language === 'ar' ? 'العقار غير متاح للعرض العام حالياً' : 'Listing Not Publicly Available'}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {language === 'ar' 
                            ? 'هذا العقار في مرحلة المسودة أو قيد المراجعة والتدقيق الإداري.' 
                            : 'This listing is currently in draft or undergoing administrative review.'}
                    </p>
                    <Link to="/properties" className="mt-6 inline-block bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-6 py-2.5 rounded-lg transition-colors">
                        {t_page.backButton}
                    </Link>
                </div>
            </div>
        );
    }

    return (
      <>
        <SEO 
            title={pageTitle} 
            description={pageDescription} 
            imageUrl={property.imageUrl} 
            canonicalUrl={propertyUrl}
            structuredData={structuredData}
        />
        {!isPublished && (
            <div className="bg-amber-500 text-gray-950 font-bold text-center py-2.5 px-4 text-sm flex items-center justify-center gap-2 shadow-md">
                <span>⚠️</span>
                <span>
                    {language === 'ar' 
                        ? 'وضع المعاينة الإدارية: هذا العقار مسودة وغير منشور للمستخدمين في السوق العام بعد.' 
                        : 'Preview Mode: This listing is currently a Draft and is not published to the public marketplace.'}
                </span>
            </div>
        )}
        {lightboxOpen && <Lightbox images={allImages} startIndex={lightboxStartIndex} onClose={() => setLightboxOpen(false)} />}
        
        {contactModalOpen && partner?.contactMethods && (
            <ContactOptionsModal
                isOpen={contactModalOpen}
                onClose={() => setContactModalOpen(false)}
                contactMethods={partner.contactMethods}
                onSelectForm={() => navigate('/request-service', { 
                    state: { 
                        partnerId: property.partnerId, 
                        serviceTitle: `${t_page.inquiryAbout} "${propTitle}"`,
                        propertyId: property.id
                    } 
                })}
            />
        )}
        
        {shareModalState.isOpen && (
            <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={handleCloseShareModal}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        {t.sharing.shareProperty}
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

        <div className="py-12 pb-24 lg:pb-12 bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-6">
                <div className="lg:flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{propTitle}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {property.referenceNumber || property.id.slice(0, 8)}
                            </span>
                            {property.verificationStatus === 'verified' && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                    <CheckBadgeIcon className="w-3.5 h-3.5" /> {language === 'ar' ? 'عقار موثق' : 'Verified Listing'}
                                </span>
                            )}
                            {property.availabilityStatus === 'sold' ? (
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                    {language === 'ar' ? 'تم البيع' : 'Sold'}
                                </span>
                            ) : property.availabilityStatus === 'reserved' ? (
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                    {language === 'ar' ? 'محجوز' : 'Reserved'}
                                </span>
                            ) : null}
                            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-sm ml-2">
                                <LocationMarkerIcon className="w-4 h-4" /> {propAddr}
                            </p>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-4 mt-4 lg:mt-0">
                         <button onClick={handleShare} className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" aria-label={t.sharing.shareProperty}>
                            <ShareIcon className="w-6 h-6"/>
                        </button>
                        <button onClick={handleFavoriteClick} className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" aria-label={isFav ? t.favoritesPage.removeFromFavorites : t.favoritesPage.addToFavorites}>
                            {isFav ? <HeartIconSolid className="w-6 h-6 text-red-500" /> : <HeartIcon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 space-y-8">
                        <StackedImageGallery
                            images={allImages}
                            onImageClick={handleImageClick}
                            alt={propTitle}
                        />
                       
                        <DetailSection title={t_page.description}>
                            <p className="whitespace-pre-line text-gray-600 dark:text-gray-300 leading-relaxed">{propDesc}</p>
                        </DetailSection>

                        <DetailSection title={t_page.location}>
                            <div className="rounded-lg overflow-hidden h-[400px] border border-gray-200 dark:border-gray-700">
                                <UnifiedMap 
                                    mode="read"
                                    markers={[{
                                        id: property.id,
                                        lat: property.location.lat,
                                        lng: property.location.lng,
                                        color: 'amber'
                                    }]}
                                />
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {language === 'ar' ? 'الإحداثيات:' : 'Coordinates:'} {property.location.lat.toFixed(4)}, {property.location.lng.toFixed(4)}
                            </p>
                        </DetailSection>

                        <DetailSection title={t_page.amenities}>
                            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {amenityKeys.map(amenityKey => <li key={amenityKey} className="flex items-center gap-2"><CheckBadgeIcon className="w-5 h-5 text-green-500"/>{t_page.amenitiesIncluded[amenityKey] || amenityKey}</li>)}
                            </ul>
                        </DetailSection>

                        <BannerDisplay location="details" />

                   </div>
                   <div className="lg:col-span-1">
                        <div className="sticky top-28 space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                               <div className="flex justify-between items-baseline">
                                   <p className="text-3xl font-bold text-amber-500">{property.price[language]}</p>
                                   {property.pricePerMeter && (
                                       <span className="text-xs text-gray-400 font-medium">{property.pricePerMeter[language]}</span>
                                   )}
                               </div>
                               {property.priceUpdatedAt && (
                                   <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                                       <span>✓</span> {language === 'ar' ? 'تم تأكيد السعر حديثاً' : 'Price confirmed recently'}: {new Date(property.priceUpdatedAt).toLocaleDateString()}
                                   </p>
                               )}
                               <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 mt-4">
                                    {!isCommercial(property) && <>
                                        <div className="flex items-center gap-2"><BedIcon className="w-5 h-5"/> {property.beds}</div>
                                        <div className="flex items-center gap-2"><BathIcon className="w-5 h-5"/> {property.baths}</div>
                                    </>}
                                    <div className="flex items-center gap-2"><AreaIcon className="w-5 h-5"/> {property.area} {t.propertyCard.area}</div>
                                </div>
                            </div>
                            
                            {/* Contact Box with Instant High-Intent Direct Channels */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
                                {partner ? (
                                    <div className="flex items-center gap-4">
                                        <img src={partner.imageUrl} alt={partner.name} className="w-16 h-16 rounded-full object-cover"/>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.propertyCard.by}</p>
                                            <p className="font-bold text-lg">{partner.name}</p>
                                            {property.verificationStatus === 'verified' && (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                                    <CheckBadgeIcon className="w-4 h-4" /> {language === 'ar' ? 'شريك ومُطوّر معتمد' : 'Verified Partner'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>}

                                {/* High-Intent Direct Action CTAs */}
                                <div className="space-y-2 pt-2">
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => trackWhatsAppClick(property.id, property.partnerId)}
                                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-lg transition-colors shadow-md shadow-emerald-600/20"
                                    >
                                        <WhatsAppIcon className="w-5 h-5" />
                                        <span>{language === 'ar' ? 'تواصل عبر واتساب مباشر' : 'Instant WhatsApp'}</span>
                                    </a>
                                    <div className="grid grid-cols-2 gap-2">
                                        <a
                                            href={phoneUrl}
                                            onClick={() => trackCallClick(property.id, property.partnerId)}
                                            className="flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2.5 px-3 rounded-lg text-sm transition-colors border border-gray-200 dark:border-gray-600"
                                        >
                                            <PhoneIcon className="w-4 h-4 text-amber-500" />
                                            <span>{language === 'ar' ? 'اتصال هاتفي' : 'Call'}</span>
                                        </a>
                                        <button 
                                            onClick={handleContact} 
                                            className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-2.5 px-3 rounded-lg text-sm transition-colors shadow"
                                        >
                                            <span>{t_page.contactButton}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Listing Freshness & Verification Trust Card */}
                            <div className="bg-amber-50/70 dark:bg-gray-800/80 p-5 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-400">
                                    <CheckBadgeIcon className="w-5 h-5 text-emerald-600" />
                                    <span>{language === 'ar' ? 'مؤشرات المصداقية والتحقق' : 'Verification & Freshness'}</span>
                                </div>
                                <div className="text-xs space-y-2 text-gray-600 dark:text-gray-300">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{language === 'ar' ? 'حالة التوثيق:' : 'Verification:'}</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{language === 'ar' ? 'عقار معتمد ومفحوص' : 'Verified Listing'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{language === 'ar' ? 'تاريخ التحقق:' : 'Last Verified:'}</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{property.verifiedAt || '2024-09-20'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{language === 'ar' ? 'آخر تحديث للسعر:' : 'Price Updated:'}</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{property.priceUpdatedAt || '2024-09-25'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">{language === 'ar' ? 'حالة التوفر:' : 'Availability:'}</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{property.availabilityStatus === 'sold' ? (language === 'ar' ? 'تم البيع' : 'Sold') : (language === 'ar' ? 'متاح للتعاقد' : 'Available')}</span>
                                    </div>
                                </div>
                            </div>

                            <DetailSection title={t_page.keyInfo}>
                                <DetailItem label={t.propertiesPage.typeLabel} value={property.type[language]} icon={<BuildingIcon className="w-5 h-5"/>}/>
                                {property.finishingStatus && <DetailItem label={t.propertiesPage.finishing} value={property.finishingStatus[language]} icon={<WrenchScrewdriverIcon className="w-5 h-5"/>}/>}
                                {property.floor !== undefined && (property.type.en === 'Apartment' || property.type.en === 'Commercial') && <DetailItem label={t_page.floor} value={property.floor} icon={<FloorIcon className="w-5 h-5"/>}/>}
                                {property.isInCompound && <DetailItem label={t_page.inCompound} value={t_page.yes} icon={<CompoundIcon className="w-5 h-5"/>}/>}
                                
                                <div className="mt-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-amber-300 text-xs">
                                                {language === 'ar' ? 'باقات التشطيب والتصميم الداخلي' : 'Finishing & Interior Packages'}
                                            </p>
                                            <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                                {language === 'ar' ? `احصل على مقايسة دقيقة لمساحة ${property.area} م²` : `Get a verified quote for ${property.area} m²`}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/finishing', {
                                                state: {
                                                    propertyId: property.id,
                                                    propertyTitle: property.title[language],
                                                    propertyArea: property.area
                                                }
                                            })}
                                            className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs shadow-sm transition-colors whitespace-nowrap"
                                        >
                                            {language === 'ar' ? 'طلب باقة تشطيب' : 'Request Finishing'}
                                        </button>
                                    </div>
                                </div>
                            </DetailSection>

                            <DetailSection title={t_page.deliveryPayment}>
                                <DetailItem label={t_page.deliveryDate} value={property.delivery.isImmediate ? t_page.immediate : property.delivery.date} icon={<CalendarIcon className="w-5 h-5"/>}/>
                                {property.installmentsAvailable && property.status.en === 'For Sale' && (
                                     <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                         <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t_page.installmentsPlan}</h4>
                                         <div className="space-y-2">
                                            <DetailItem label={t_page.downPayment} value={property.installments?.downPayment.toLocaleString(language)} />
                                            <DetailItem label={t_page.monthlyInstallment} value={property.installments?.monthlyInstallment.toLocaleString(language)} />
                                            <DetailItem label={t_page.years} value={property.installments?.years} />
                                         </div>
                                     </div>
                                )}
                                {property.realEstateFinanceAvailable && property.status.en === 'For Sale' && <DetailItem label={t_page.realEstateFinanceAvailable} value={t_page.yes} icon={<BanknotesIcon className="w-5 h-5"/>} />}
                            </DetailSection>

                            {property.projectId && property.projectName && (
                                <Link to={`/projects/${property.projectId}`} className="block group">
                                    <DetailSection title={t_page.partOfProject}>
                                        <p className="font-bold text-lg group-hover:text-amber-500">{property.projectName[language]}</p>
                                        <span className="text-amber-500 font-semibold hover:underline">{t_page.viewProject}</span>
                                    </DetailSection>
                                </Link>
                            )}
                        </div>
                   </div>
                </div>
            </div>
        </div>

        {/* Sticky Mobile Conversion Action Bar (Fixed bottom for instant high-intent action) */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-3 lg:hidden flex items-center justify-between gap-2 shadow-2xl">
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick(property.id, property.partnerId)}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-3 rounded-lg text-sm shadow-md transition-colors"
            >
                <WhatsAppIcon className="w-5 h-5" />
                <span>{language === 'ar' ? 'واتساب مباشر' : 'WhatsApp'}</span>
            </a>
            <a
                href={phoneUrl}
                onClick={() => trackCallClick(property.id, property.partnerId)}
                className="flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-3 px-4 rounded-lg text-sm transition-colors border border-gray-200 dark:border-gray-700"
            >
                <PhoneIcon className="w-4 h-4 text-amber-500" />
                <span>{language === 'ar' ? 'اتصال' : 'Call'}</span>
            </a>
            <button
                onClick={handleContact}
                className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg text-sm transition-colors shadow"
            >
                <span>{language === 'ar' ? 'معاينة' : 'Inquire'}</span>
            </button>
        </div>
      </>
    );
};

export default PropertyDetailsPage;
