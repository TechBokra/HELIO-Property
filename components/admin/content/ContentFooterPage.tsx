import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Checkbox } from '../../ui/Checkbox';
import { useLanguage } from '../../shared/LanguageContext';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentFooterPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();
    const { language } = useLanguage();

    return (
        <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold">
                {language === 'ar' ? 'محتوى التذييل وبيانات التواصل' : 'Footer & Contact Content'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Description (AR)</label>
                    <Textarea {...register('footer.ar.description')} rows={4} dir="rtl" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Description (EN)</label>
                    <Textarea {...register('footer.en.description')} rows={4} dir="ltr" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Address (AR)</label>
                    <Input {...register('footer.ar.address')} dir="rtl" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Address (EN)</label>
                    <Input {...register('footer.en.address')} dir="ltr" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Working Hours (AR)</label>
                    <Input {...register('footer.ar.hours')} dir="rtl" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Working Hours (EN)</label>
                    <Input {...register('footer.en.hours')} dir="ltr" />
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <Input {...register('footer.phone')} dir="ltr" />
                    <div className="mt-2 flex items-center gap-2">
                        <Checkbox id="footer-whatsapp-only" {...register('footer.isWhatsAppOnly')} />
                        <label htmlFor="footer-whatsapp-only" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                            {language === 'ar' ? 'هذا الرقم للواتساب فقط (بدون مكالمات)' : 'This number is for WhatsApp only (no calls)'}
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input type="email" {...register('footer.email')} dir="ltr" />
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-2">Social Media Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium mb-1">Facebook URL</label><Input {...register('footer.social.facebook')} dir="ltr" /></div>
                    <div><label className="block text-xs font-medium mb-1">Twitter URL</label><Input {...register('footer.social.twitter')} dir="ltr" /></div>
                    <div><label className="block text-xs font-medium mb-1">Instagram URL</label><Input {...register('footer.social.instagram')} dir="ltr" /></div>
                    <div><label className="block text-xs font-medium mb-1">LinkedIn URL</label><Input {...register('footer.social.linkedin')} dir="ltr" /></div>
                </div>
            </div>
        </div>
    );
};

export default ContentFooterPage;
