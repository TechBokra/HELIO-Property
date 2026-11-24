import React from 'react';
import SEO from '../shared/SEO';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';
import { WhatsAppIcon, PhoneIcon } from '../ui/Icons';
import DynamicForm from '../shared/DynamicForm';
import { siteContentData as fallbackData } from '../../data/content';

const ContactPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent, isLoading: isLoadingContent } = useSiteContent();

    const footerContent = siteContent?.footer || fallbackData.footer;
    const footerLang = footerContent?.[language] || footerContent?.en || fallbackData.footer[language];
    const phone = footerContent?.phone || fallbackData.footer.phone;
    const email = footerContent?.email || fallbackData.footer.email;
    const isWhatsAppOnly = Boolean(footerContent?.isWhatsAppOnly);
    const phoneHref = isWhatsAppOnly
        ? `https://wa.me/${String(phone).replace(/\D/g, '')}`
        : `tel:${String(phone).replace(/\s/g, '')}`;

    const cmsContact = siteContent?.contactPage?.[language];
    const defaultContact = fallbackData.contactPage?.[language] || t.contactPage;

    const contactCopy = {
        title: cmsContact?.title || defaultContact.title || t.contactPage.title,
        subtitle: cmsContact?.subtitle || defaultContact.subtitle || t.contactPage.subtitle,
        formTitle: cmsContact?.formTitle || defaultContact.formTitle || t.contactPage.formTitle,
        formDescription: cmsContact?.formDescription ?? defaultContact.formDescription ?? '',
        contactInfoTitle: cmsContact?.contactInfoTitle || defaultContact.contactInfoTitle || t.contactPage.contactInfoTitle,
        contactInfoDescription: cmsContact?.contactInfoDescription ?? defaultContact.contactInfoDescription ?? '',
        addressTitle: cmsContact?.addressTitle || defaultContact.addressTitle || t.contactPage.addressTitle,
        phoneTitle: cmsContact?.phoneTitle || defaultContact.phoneTitle || t.contactPage.phoneTitle,
        emailTitle: cmsContact?.emailTitle || defaultContact.emailTitle || t.contactPage.emailTitle,
        hoursTitle: cmsContact?.hoursTitle || defaultContact.hoursTitle || t.contactPage.hoursTitle,
    };

    return (
        <div className="py-20 bg-white">
            <SEO
                title={`${contactCopy.title} | ONLY HELIO`}
                description={contactCopy.subtitle}
            />
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{contactCopy.title}</h1>
                    <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">{contactCopy.subtitle}</p>
                </div>
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 bg-gray-50 p-8 rounded-lg border border-gray-200">
                    <div>
                        <h2 className={`text-2xl font-bold text-amber-500 ${contactCopy.formDescription ? 'mb-2' : 'mb-6'}`}>
                            {contactCopy.formTitle}
                        </h2>
                        {contactCopy.formDescription && (
                            <p className="text-sm text-gray-600 mb-6">{contactCopy.formDescription}</p>
                        )}
                        {/* Replaced hardcoded form with DynamicForm engine */}
                        <DynamicForm slug="contact-us" />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h2 className={`text-2xl font-bold text-amber-500 ${contactCopy.contactInfoDescription ? 'mb-2' : 'mb-6'}`}>
                                {contactCopy.contactInfoTitle}
                            </h2>
                            {contactCopy.contactInfoDescription && (
                                <p className="text-sm text-gray-600 mb-6">{contactCopy.contactInfoDescription}</p>
                            )}
                        </div>
                        {isLoadingContent && !footerContent ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start gap-4">
                                    <span className="text-amber-500 mt-1">📍</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{contactCopy.addressTitle}</h3>
                                        <p className="text-gray-600">{footerLang?.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        {isWhatsAppOnly ? (
                                            <WhatsAppIcon className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <PhoneIcon className="w-5 h-5 text-amber-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{contactCopy.phoneTitle}</h3>
                                        <a
                                            href={phoneHref}
                                            target={isWhatsAppOnly ? '_blank' : undefined}
                                            rel={isWhatsAppOnly ? 'noopener noreferrer' : undefined}
                                            className="text-gray-600 hover:text-amber-500 transition-colors font-mono inline-block"
                                            dir="ltr"
                                        >
                                            {phone}
                                        </a>
                                        {isWhatsAppOnly && (
                                            <p className="text-xs text-green-600 mt-1">
                                                {language === 'ar' ? '(واتساب فقط)' : '(WhatsApp Only)'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-amber-500 mt-1">✉️</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{contactCopy.emailTitle}</h3>
                                        <a href={`mailto:${email}`} className="text-gray-600 hover:text-amber-500 transition-colors">
                                            {email}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-amber-500 mt-1">⏰</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{contactCopy.hoursTitle}</h3>
                                        <p className="text-gray-600">{footerLang?.hours}</p>
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
