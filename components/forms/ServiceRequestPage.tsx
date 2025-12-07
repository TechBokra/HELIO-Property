
import React, { useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { addRequest } from '../../services/requests';
import { RequestType } from '../../types';
import { SiteIdentity } from '../shared/SiteIdentity';
import { useToast } from '../shared/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import { BanknotesIcon } from '../ui/Icons';
import DynamicForm from '../shared/DynamicForm';

const ServiceRequestPage: React.FC = () => {
    const { language, t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const t_modal = t.serviceRequestModal;
    const t_decor_modal = t.decorationRequestModal;
    const t_custom_decor_modal = t.customDecorationRequestModal;
    const t_decor = t.decorationsPage;
    
    const { serviceTitle, partnerId, propertyId, workItem, isCustom, serviceType, tier, isBooking, isPurchase, categoryName } = location.state || {};
    const { data: allPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { showToast } = useToast();
    
    React.useEffect(() => {
        if (!serviceTitle || !partnerId) {
            navigate('/');
        }
    }, [serviceTitle, partnerId, navigate]);

    if (!serviceTitle || !partnerId) {
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
        // This ensures all data is captured in the lead's notes field since the Lead model is simple
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
        if (serviceType && allPartners) {
             const manager = allPartners.find(p => p.type === 'service_manager');
            if (manager) {
                managerId = manager.id;
            }
        }

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
                        serviceType: serviceType,
                        serviceTitle: bookingTitle,
                        partnerId: partnerId,
                        managerId: 'platform-finishing-manager-1',
                        tierDetails: tier,
                        status: 'new'
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
                        serviceType: serviceType,
                        serviceTitle: `Order: ${workItem.title[language]}`,
                        partnerId: partnerId,
                        managerId: 'decoration-manager-1', 
                        workItem: workItem,
                        status: 'new'
                    }
                }
            });
        } else {
            // Standard Lead Submission
            addRequest(RequestType.LEAD, {
                requesterInfo: { name: formData.customerName, phone: formData.customerPhone },
                payload: {
                    contactTime: formData.contactTime,
                    customerNotes: finalNotes,
                    partnerId: partnerId,
                    serviceTitle: serviceTitle,
                    managerId: managerId,
                    propertyId: propertyId,
                    serviceType: serviceType,
                    referenceImage: formData.referenceImage,
                    // Add specific fields to payload top-level for easy access in details view
                    dimensions: formData.dimensions,
                    itemCategory: formData.itemCategory
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
         // If category is pre-selected (custom design from category page OR specific work item), hide the category selector
         if ((isCustom && categoryName) || workItem) return ['itemCategory'];
         return [];
    }, [isCustom, categoryName, workItem]);

    return (
        <div className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-block mb-6">
                             <SiteIdentity className="justify-center text-amber-500" textClassName="text-2xl" hideTextOnMobile={false} />
                        </Link>
                    </div>
                    
                    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                        <h2 className="text-3xl font-bold text-amber-500 mb-2 text-center">{pageTitle}</h2>
                        <p className="text-gray-500 text-center mb-8">({serviceTitle})</p>
                        
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
            </div>
        </div>
    );
};

export default ServiceRequestPage;
