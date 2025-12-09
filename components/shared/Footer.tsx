
import { type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TwitterIcon, LinkedInIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, PhoneIcon, MapPinIcon, EnvelopeIcon } from '../ui/Icons';
import { SiteIdentity } from './SiteIdentity';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from './LanguageContext';

const FooterLink: FC<{ to: string; children: ReactNode }> = ({ to, children }) => (
    <li>
        <Link to={to} className="text-gray-500 hover:text-amber-500 transition-colors duration-200 text-sm">
            {children}
        </Link>
    </li>
);

const SocialLink: FC<{ href: string; children: ReactNode }> = ({ href, children }) => {
    if (!href || href === '#' || href.trim() === '') {
        return null;
    }
    
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-amber-500 transition-colors duration-200"
        >
            {children}
        </a>
    );
};

const Footer: FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent, isLoading } = useSiteContent();

    // Safety check: Ensure siteContent and footer object exist before accessing
    if (isLoading || !siteContent || !siteContent.footer) {
        return <footer className="bg-gray-100 pt-12 h-64 animate-pulse"></footer>;
    }

    const content = siteContent.footer;
    // Safety check: Ensure language key exists in footer content
    const contentLang = content[language] || content['en'] || {};

    const phoneLink = content.isWhatsAppOnly 
        ? `https://wa.me/${(content.phone || '').replace(/\D/g, '')}` 
        : `tel:${(content.phone || '').replace(/\s/g, '')}`;

    return (
        <footer className="bg-gray-100 pt-16 pb-8 border-t border-gray-200">
            <div className="container mx-auto px-6">
                {/* Main Footer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* 1. Brand & Description */}
                    <div className="space-y-6">
                        <Link to="/" className="text-amber-500">
                            <SiteIdentity logoClassName="h-8 w-8" textClassName="text-2xl" hideTextOnMobile={false} />
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-sm">{contentLang.description || 'Loading description...'}</p>
                        
                        {content.social && (
                            <div className={`flex space-x-4 ${language === 'ar' ? 'space-x-reverse' : ''}`}>
                                <SocialLink href={content.social.facebook}><FacebookIcon className="h-5 w-5" /></SocialLink>
                                <SocialLink href={content.social.twitter}><TwitterIcon className="h-5 w-5" /></SocialLink>
                                <SocialLink href={content.social.instagram}><InstagramIcon className="h-5 w-5" /></SocialLink>
                                <SocialLink href={content.social.linkedin}><LinkedInIcon className="h-5 w-5" /></SocialLink>
                            </div>
                        )}
                    </div>

                    {/* 2. Combined Links (Simplified) */}
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-gray-900 mb-4">{t.nav.home}</h3>
                            <ul className="space-y-2">
                                <FooterLink to="/properties">{t.nav.properties}</FooterLink>
                                <FooterLink to="/projects">{t.nav.projects}</FooterLink>
                                <FooterLink to="/finishing">{t.nav.finishing}</FooterLink>
                                <FooterLink to="/decorations">{t.nav.decorations}</FooterLink>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-4">{t.footer.forPartners}</h3>
                            <ul className="space-y-2">
                                <FooterLink to="/add-property">{t.addProperty}</FooterLink>
                                <FooterLink to="/register">{t.joinAsPartner}</FooterLink>
                                <FooterLink to="/login">{t.auth.login}</FooterLink>
                            </ul>
                        </div>
                    </div>

                    {/* 3. Contact Info */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">{t.footer.contactUs}</h3>
                        <ul className="space-y-4 text-sm text-gray-600">
                            <li className="flex items-start gap-3">
                                <div className="mt-0.5 text-amber-500">
                                    <MapPinIcon className="w-5 h-5" />
                                </div>
                                <span>{contentLang.address}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="text-amber-500">
                                    {content.isWhatsAppOnly ? <WhatsAppIcon className="w-5 h-5 text-green-600" /> : <PhoneIcon className="w-5 h-5" />}
                                </div>
                                <div className="flex flex-col">
                                    <a href={phoneLink} target={content.isWhatsAppOnly ? '_blank' : undefined} rel={content.isWhatsAppOnly ? "noopener noreferrer" : undefined} className="hover:text-amber-500 transition-colors font-mono" dir="ltr">
                                        {content.phone}
                                    </a>
                                    {content.isWhatsAppOnly && (
                                        <span className="text-xs text-green-600">
                                            {language === 'ar' ? '(واتساب فقط)' : '(WhatsApp Only)'}
                                        </span>
                                    )}
                                </div>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="text-amber-500">
                                    <EnvelopeIcon className="w-5 h-5" />
                                </div>
                                <a href={`mailto:${content.email}`} className="hover:text-amber-500 transition-colors">{content.email}</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                    <p>{content.copyright ? content.copyright[language] : 'All rights reserved.'}</p>
                    
                    <div className="flex flex-wrap justify-center gap-6">
                        <Link to="/privacy-policy" className="hover:text-amber-600 transition-colors">{t.nav.privacyPolicy}</Link>
                        <Link to="/terms-of-use" className="hover:text-amber-600 transition-colors">{t.nav.termsOfUse}</Link>
                        <a href={`mailto:${content.email}?subject=Feedback`} className="hover:text-amber-600 transition-colors">
                            {content.feedbackText ? content.feedbackText[language] : 'Feedback'}
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;