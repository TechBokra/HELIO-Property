
import React from 'react';
import type { Language } from '../../types';
import { useToast } from '../shared/ToastContext';
import SEO from '../shared/SEO';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';
import { WhatsAppIcon, PhoneIcon } from '../ui/Icons';
import DynamicForm from '../shared/DynamicForm';

const ContactPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent, isLoading: isLoadingContent } = useSiteContent();

    return (
        <div className="py-20 bg-white">
            <SEO 
                title={`${t.nav.contact} | ONLY HELIO`}
                description={t.contactPage.subtitle}
            />
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{t.contactPage.title}</h1>
                    <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">{t.contactPage.subtitle}</p>
                </div>
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 bg-gray-50 p-8 rounded-lg border border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-amber-500 mb-6">{t.contactPage.formTitle}</h2>
                        {/* Replaced hardcoded form with DynamicForm engine */}
                        <DynamicForm slug="contact-us" />
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-amber-500 mb-6">{t.contactPage.contactInfoTitle}</h2>
                        {isLoadingContent ? <div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 rounded w-3/4"></div><div className="h-6 bg-gray-200 rounded w-1/2"></div></div> : (
                            <>
                                <div className="flex items-start gap-4">
                                    <span className="text-amber-500 mt-1">📍</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{t.contactPage.addressTitle}</h3>
                                        <p className="text-gray-600">{siteContent?.footer[language].address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        {siteContent?.footer.isWhatsAppOnly ? (
                                            <WhatsAppIcon className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <PhoneIcon className="w-5 h-5 text-amber-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{t.contactPage.phoneTitle}</h3>
                                        <p className="text-gray-600" dir="ltr">{siteContent?.footer.phone}</p>
                                        {siteContent?.footer.isWhatsAppOnly && (
                                            <p className="text-xs text-green-600 mt-1">
                                                {language === 'ar' ? '(واتساب فقط)' : '(WhatsApp Only)'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-amber-500 mt-1">✉️</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{t.contactPage.emailTitle}</h3>
                                        <p className="text-gray-600">{siteContent?.footer.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-amber-500 mt-1">⏰</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{t.contactPage.hoursTitle}</h3>
                                        <p className="text-gray-600">{siteContent?.footer[language].hours}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
