
import React, { useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { addRequest } from '../../services/requests';
import { RequestType } from '../../types';
import { SiteIdentity } from '../shared/SiteIdentity';
import { useToast } from '../shared/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import { BanknotesIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, WhatsAppIcon } from '../ui/Icons';
import DynamicForm from '../shared/DynamicForm';
import { useSiteContent } from '../../hooks/useSiteContent';
import { getAttribution } from '../../utils/attribution';
import { PLATFORM_FINISHING_MANAGER_ID } from '../../services/finishing';

const DECORATION_MANAGER_ID = 'f476c295-e80a-41ca-a63b-61ff2f579f71';

const ServiceRequestPage: React.FC = () => {
    const { language, t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const t_modal = t.serviceRequestModal;
    const t_decor_modal = t.decorationRequestModal;
    const t_custom_decor_modal = t.customDecorationRequestModal;
    const t_decor = t.decorationsPage;
    
    // Get footer/contact info from global site content
    const { data: siteContent } = useSiteContent();
    const footerContent = siteContent?.footer;
    
    const { 
        serviceTitle, 
        partnerId: rawPartnerId, 
        propertyId, 
        propertyTitle,
        workItem, 
        isCustom, 
        serviceType, 
        tier, 
        isBooking, 
        isPurchase, 
        categoryName 
    } = location.state || {};

    const effectiveServiceType = serviceType || (categoryName?.toLowerCase().includes('finish') ? 'finishing' : 'finishing');

    // Route finishing without specific partner or with mock ID directly to Platform Finishing Manager
    const partnerId = useMemo(() => {
        if (!rawPartnerId || rawPartnerId === 'admin-user' || rawPartnerId === 'platform-finishing-manager-1') {
            if (effectiveServiceType === 'decorations') return DECORATION_MANAGER_ID;
            return PLATFORM_FINISHING_MANAGER_ID;
        }
        return rawPartnerId;
    }, [rawPartnerId, effectiveServiceType]);

    const { data: allPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { showToast } = useToast();
    
    React.useEffect(() => {
        if (!serviceTitle) {
            navigate('/');
        }
    }, [serviceTitle, navigate]);

    if (!serviceTitle) {
        return null;
    }

    const isPaymentFlow = isBooking || isPurchase;
    
    const formSlug = useMemo(() => {
        if (isCustom && serviceType === 'decorations') return 'decoration-request';
        if (serviceType === 'finishing' && !isBooking) return 'finishing-request';
        if (serviceType === 'decorations' && !isPurchase) return 'decoration-request';
        return 'service-request'; // Fallback for simple/payment requests
    }, [serviceType, isCustom, isBooking, isPurchase]);

    // Determine dynamic titles
    const pageTitle = isPurchase 
        ? (language === 'ar' ? 'إتمام الشراء' : 'Complete Purchase') 
        : isBooking 
            ? (language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking') 
            : isCustom 
                ? t_custom_decor_modal.title 
                : t_modal.title;

    const submitButtonText = isPaymentFlow
        ? (language === 'ar' ? 'متابعة للدفع' : 'Proceed to Payment')
        : (isCustom ? t_custom_decor_modal.submitButton : t_modal.submitButton);

    const handleCustomSubmit = (formData: any) => {
        // Extract special fields from specific forms and append to notes
        let finalNotes = formData.customerNotes || '';
        
        const extendedFieldsMap: Record<string, string> = {
            unitType: language === 'ar' ? 'نوع الوحدة' : 'Unit Type',
            unitArea: language === 'ar' ? 'المساحة' : 'Area',
            currentStatus: language === 'ar' ? 'الحالة الحالية' : 'Current Status',
            finishingLevel: language === 'ar' ? 'مستوى التشطيب' : 'Finishing Level',
            itemCategory: language === 'ar' ? 'نوع العمل' : 'Category',
            dimensions: language === 'ar' ? 'الأبعاد' : 'Dimensions',
        };

        const extraDetails: string[] = [];
        Object.keys(extendedFieldsMap).forEach(key => {
            if (formData[key]) {
                extraDetails.push(`${extendedFieldsMap[key]}: ${formData[key]}`);
            }
        });

        if (extraDetails.length > 0) {
            finalNotes = `${extraDetails.join('\n')}\n\n--- Notes ---\n${finalNotes}`;
        }

        if (formData.referenceImage) {
            finalNotes += `\n\n[Attached: Reference Image]`;
        }
        
        let managerId: string | undefined = undefined;
        // Only assign generic manager for services that do not have a dedicated partner
        if (!partnerId && serviceType && allPartners) {
             const manager = allPartners.find(p => p.type === 'service_manager');
            if (manager) {
                managerId = manager.id;
            }
        }

        const attribution = getAttribution({
            source: propertyId ? 'property_page' : 'inquiry_form',
            propertyId: propertyId,
            propertyTitle: serviceTitle,
            pageOrigin: window.location.pathname,
        });

        const submissionData = {
            ...formData,
            customerNotes: finalNotes
        };

        if (isBooking && tier) {
            // Redirect to Payment Page
            const bookingTitle = `${serviceTitle} - ${tier.unitType[language]} (${tier.areaRange[language]})`;
            navigate('/payment', {
                state: {
                    amount: tier.price,
                    description: `Finishing Service: ${bookingTitle}`,
                    type: 'service_payment',
                    userId: formData.customerPhone, // Temp ID
                    userName: formData.customerName,
                    data: {
                        ...submissionData,
                        serviceType: serviceType || 'finishing',
                        serviceTitle: bookingTitle,
                        partnerId: partnerId,
                        managerId: PLATFORM_FINISHING_MANAGER_ID,
                        propertyId: propertyId,
                        propertyTitle: propertyTitle,
                        tierDetails: tier,
                        pricingModel: tier?.priceModel || 'fixed_package',
                        status: 'new',
                        ...attribution,
                    }
                }
            });
        } else if (isPurchase && workItem) {
            // Redirect to Payment Page
            navigate('/payment', {
                state: {
                    amount: workItem.price,
                    description: `Product Purchase: ${workItem.title.en}`,
                    type: 'product_purchase',
                    userId: formData.customerPhone, // Temp ID
                    userName: formData.customerName,
                    data: {
                        ...submissionData,
                        serviceType: serviceType || 'decorations',
                        serviceTitle: `Order: ${workItem.title[language]}`,
                        partnerId: partnerId,
                        managerId: DECORATION_MANAGER_ID, 
                        workItem: workItem,
                        status: 'new',
                        ...attribution,
                    }
                }
            });
        } else {
            // Standard Lead Submission with Marketing & Conversion Attribution
            addRequest(RequestType.LEAD, {
                requesterInfo: { name: formData.customerName, phone: formData.customerPhone },
                assignedTo: partnerId,
                payload: {
                    customerName: formData.customerName,
                    customerPhone: formData.customerPhone,
                    contactTime: formData.contactTime,
                    customerNotes: finalNotes,
                    partnerId: partnerId,
                    serviceTitle: serviceTitle,
                    managerId: managerId || (effectiveServiceType === 'finishing' ? PLATFORM_FINISHING_MANAGER_ID : (effectiveServiceType === 'decorations' ? DECORATION_MANAGER_ID : undefined)),
                    propertyId: propertyId,
                    propertyTitle: propertyTitle,
                    serviceType: effectiveServiceType,
                    tierDetails: tier,
                    pricingModel: tier?.priceModel,
                    referenceImage: formData.referenceImage,
                    // Add specific fields to payload top-level for easy access in details view
                    dimensions: formData.dimensions,
                    itemCategory: formData.itemCategory,
                    // Persisted Attribution Data
                    source: attribution.source,
                    utmSource: attribution.utmSource,
                    utmCampaign: attribution.utmCampaign,
                    utmMedium: attribution.utmMedium,
                    utmTerm: attribution.utmTerm,
                    utmContent: attribution.utmContent,
                    referrer: attribution.referrer,
                    landingPage: attribution.landingPage,
                    pageOrigin: attribution.pageOrigin,
                    leadQuality: 'new',
                }
            }).then(() => {
                 showToast(t_modal.successMessage, 'success');
                 setTimeout(() => navigate(-1), 2000);
            }).catch(() => {
                showToast('Submission failed. Please try again.', 'error');
            });
        }
    };

    const headerContent = (
        <>
             {workItem && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">{isPurchase ? (language === 'ar' ? 'المنتج' : 'Product') : t_decor_modal.reference}</p>
                    <div className="flex gap-4 items-start">
                        <img src={workItem.imageUrl} alt={workItem.alt} className="w-24 h-24 object-cover rounded-lg flex-shrink-0 shadow-md" />
                        <div className="space-y-1 text-sm flex-grow">
                            <h3 className="font-bold text-gray-900 text-base">{workItem.title[language]}</h3>
                            {workItem.dimensions && <p className="text-gray-500">{t_decor.dimensions}: {workItem.dimensions}</p>}
                            {workItem.availability && <p className="text-gray-500">{t_decor.availability}: {workItem.availability === 'In Stock' ? t_decor.inStock : t_decor.madeToOrder}</p>}
                        </div>
                        {isPurchase && workItem.price && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500">{language === 'ar' ? 'السعر' : 'Price'}</p>
                                <p className="text-xl font-bold text-amber-600">{workItem.price.toLocaleString(language)} <span className="text-sm text-gray-500">EGP</span></p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isBooking && tier && (
                <div className="mb-6 p-5 bg-amber-50 rounded-lg border border-amber-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <p className="text-sm text-amber-800 font-semibold uppercase tracking-wider mb-1">{language === 'ar' ? 'تفاصيل الباقة' : 'Package Details'}</p>
                        <h3 className="text-xl font-bold text-gray-900">{tier.unitType[language]}</h3>
                        <p className="text-gray-600">{tier.areaRange[language]}</p>
                    </div>
                    <div className="text-center sm:text-right bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'السعر' : 'Price'}</p>
                        <p className="text-2xl font-bold text-amber-600 flex items-center gap-1 justify-end">
                            {tier.price.toLocaleString(language)} <span className="text-sm font-normal text-gray-500">EGP</span>
                        </p>
                    </div>
                </div>
            )}
        </>
    );
    
    const defaultValues = useMemo(() => {
        const vals: any = { customerNotes: '' };
        
        const mapCategoryToKey = (catName: string | undefined) => {
             if (!catName) return '';
             const lower = catName.toLowerCase();
             if (lower.includes('sculpture') || lower.includes('منحوتات')) return 'wall_sculpture';
             if (lower.includes('painting') || lower.includes('canvas') || lower.includes('لوحات')) return 'canvas_painting';
             if (lower.includes('antique') || lower.includes('decor') || lower.includes('تحف')) return 'antique_decor';
             if (lower.includes('furniture') || lower.includes('أثاث')) return 'custom_furniture';
             return '';
        };

        if (workItem) {
             vals.itemCategory = mapCategoryToKey(workItem.category?.en) || mapCategoryToKey(workItem.category?.ar);
        } else if (isCustom && categoryName) {
             vals.itemCategory = mapCategoryToKey(categoryName);
        }
        return vals;
    }, [isCustom, categoryName, workItem]);
    
    const hiddenFields = useMemo(() => {
         if ((isCustom && categoryName) || workItem) return ['itemCategory'];
         return [];
    }, [isCustom, categoryName, workItem]);

    const SidebarSupport = () => {
        if (!footerContent) return null;
        const phone = footerContent.phone;
        const email = footerContent.email;
        const address = footerContent[language]?.address;
        const whatsappOnly = footerContent.isWhatsAppOnly;
        
        return (
            <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        {language === 'ar' ? 'هل تحتاج مساعدة؟' : 'Need Help?'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                        {language === 'ar' 
                            ? 'فريقنا متاح للإجابة على استفساراتك ومساعدتك في اختيار الخدمة المناسبة.' 
                            : 'Our team is available to answer your questions and help you choose the right service.'}
                    </p>
                    
                    <ul className="space-y-4 text-sm">
                         <li className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-full text-green-600 shadow-sm">
                                <WhatsAppIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase">{language === 'ar' ? 'واتساب' : 'WhatsApp'}</p>
                                <a href={`https://wa.me/${phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-gray-900 dark:text-white font-mono hover:text-amber-600">
                                    {phone}
                                </a>
                            </div>
                        </li>
                        
                        {!whatsappOnly && (
                            <li className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-full text-blue-600 shadow-sm">
                                    <PhoneIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-semibold uppercase">{language === 'ar' ? 'اتصال' : 'Call Us'}</p>
                                    <a href={`tel:${phone?.replace(/\s/g, '')}`} className="text-gray-900 dark:text-white font-mono hover:text-amber-600">
                                        {phone}
                                    </a>
                                </div>
                            </li>
                        )}

                        <li className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-full text-amber-500 shadow-sm">
                                <EnvelopeIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                                <a href={`mailto:${email}`} className="text-gray-900 dark:text-white hover:text-amber-600">
                                    {email}
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                     <div className="flex items-start gap-3">
                        <MapPinIcon className="w-6 h-6 text-gray-400 mt-1" />
                        <div>
                             <p className="text-xs text-gray-500 font-semibold uppercase mb-1">{language === 'ar' ? 'مقر الشركة' : 'Office Location'}</p>
                             <p className="text-sm text-gray-800 dark:text-gray-200">{address}</p>
                        </div>
                     </div>
                </div>
            </div>
        );
    };

    return (
        <div className="py-20 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="container mx-auto px-6">
                 <div className="text-center mb-12">
                    <Link to="/" className="inline-block mb-6">
                            <SiteIdentity className="justify-center text-amber-500" textClassName="text-3xl" hideTextOnMobile={false} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    
                    {/* Main Form Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{pageTitle}</h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {serviceTitle}
                                </p>
                            </div>
                            
                            <DynamicForm 
                                slug={formSlug}
                                customSubmit={handleCustomSubmit}
                                submitButtonText={submitButtonText}
                                submitButtonIcon={isPaymentFlow ? <BanknotesIcon className="w-5 h-5" /> : undefined}
                                defaultValues={defaultValues}
                                hiddenFields={hiddenFields}
                                headerContent={headerContent}
                            />
                        </div>
                    </div>

                    {/* Sidebar Support Column */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <SidebarSupport />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ServiceRequestPage;