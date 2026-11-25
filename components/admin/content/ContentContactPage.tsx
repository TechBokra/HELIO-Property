import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { PhoneIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentContactPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-6 animate-fadeIn">
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <PhoneIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div>
                                <CardTitle>
                                    {isAr ? 'محتوى صفحة تواصل معنا (/contact)' : 'Contact Page Content (/contact)'}
                                </CardTitle>
                                <p className="text-sm text-gray-500 mt-1">
                                    {isAr
                                        ? 'تعديل العناوين والوصف وعناوين النموذج وبطاقة البيانات بالعربية والإنجليزية.'
                                        : 'Customize Contact page headlines, descriptions, form heading, and contact info labels in Arabic & English.'}
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/admin/content/footer"
                            className="text-xs font-semibold text-amber-600 hover:underline whitespace-nowrap shrink-0"
                        >
                            {isAr ? 'تعديل رقم الهاتف والعنوان في الفوتر ←' : 'Edit Phone & Address in Footer →'}
                        </Link>
                    </div>
                </CardHeader>

                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Arabic */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                            {isAr ? 'المحتوى العربي (RTL)' : 'Arabic Content (RTL)'}
                        </h4>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'العنوان الرئيسي للصفحة' : 'Page Main Title (AR)'}
                            </label>
                            <Input {...register('contactPage.ar.title')} dir="rtl" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'الوصف الفرعي تحت العنوان' : 'Page Subtitle / Description (AR)'}
                            </label>
                            <Textarea {...register('contactPage.ar.subtitle')} rows={3} dir="rtl" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'عنوان قسم النموذج' : 'Form Section Title (AR)'}
                            </label>
                            <Input {...register('contactPage.ar.formTitle')} dir="rtl" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'وصف قسم النموذج (اختياري)' : 'Form Section Description (AR)'}
                            </label>
                            <Textarea {...register('contactPage.ar.formDescription')} rows={2} dir="rtl" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'عنوان قسم بيانات الاتصال' : 'Contact Info Section Title (AR)'}
                            </label>
                            <Input {...register('contactPage.ar.contactInfoTitle')} dir="rtl" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'وصف قسم بيانات الاتصال (اختياري)' : 'Contact Info Description (AR)'}
                            </label>
                            <Textarea {...register('contactPage.ar.contactInfoDescription')} rows={2} dir="rtl" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية العنوان' : 'Address Label (AR)'}
                                </label>
                                <Input {...register('contactPage.ar.addressTitle')} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية الهاتف' : 'Phone Label (AR)'}
                                </label>
                                <Input {...register('contactPage.ar.phoneTitle')} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية البريد' : 'Email Label (AR)'}
                                </label>
                                <Input {...register('contactPage.ar.emailTitle')} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية ساعات العمل' : 'Hours Label (AR)'}
                                </label>
                                <Input {...register('contactPage.ar.hoursTitle')} dir="rtl" />
                            </div>
                        </div>
                    </div>

                    {/* English */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                            {isAr ? 'المحتوى الإنجليزي (LTR)' : 'English Content (LTR)'}
                        </h4>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'العنوان الرئيسي (EN)' : 'Page Main Title (EN)'}
                            </label>
                            <Input {...register('contactPage.en.title')} dir="ltr" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'الوصف الفرعي (EN)' : 'Page Subtitle / Description (EN)'}
                            </label>
                            <Textarea {...register('contactPage.en.subtitle')} rows={3} dir="ltr" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'عنوان قسم النموذج (EN)' : 'Form Section Title (EN)'}
                            </label>
                            <Input {...register('contactPage.en.formTitle')} dir="ltr" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'وصف قسم النموذج (EN)' : 'Form Section Description (EN)'}
                            </label>
                            <Textarea {...register('contactPage.en.formDescription')} rows={2} dir="ltr" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'عنوان قسم بيانات الاتصال (EN)' : 'Contact Info Section Title (EN)'}
                            </label>
                            <Input {...register('contactPage.en.contactInfoTitle')} dir="ltr" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                {isAr ? 'وصف قسم بيانات الاتصال (EN)' : 'Contact Info Description (EN)'}
                            </label>
                            <Textarea {...register('contactPage.en.contactInfoDescription')} rows={2} dir="ltr" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية العنوان (EN)' : 'Address Label (EN)'}
                                </label>
                                <Input {...register('contactPage.en.addressTitle')} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية الهاتف (EN)' : 'Phone Label (EN)'}
                                </label>
                                <Input {...register('contactPage.en.phoneTitle')} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية البريد (EN)' : 'Email Label (EN)'}
                                </label>
                                <Input {...register('contactPage.en.emailTitle')} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    {isAr ? 'تسمية ساعات العمل (EN)' : 'Hours Label (EN)'}
                                </label>
                                <Input {...register('contactPage.en.hoursTitle')} dir="ltr" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentContactPage;
