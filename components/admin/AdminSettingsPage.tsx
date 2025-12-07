
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Language, SiteContent } from '../../types';
import { inputClasses, selectClasses } from '../ui/FormField';
// FIX: Corrected import path for Icons
import { CloseIcon, PhotoIcon, MegaphoneIcon, CreditCardIcon, BanknotesIcon, GlobeAltIcon } from '../ui/Icons';
import { getContent, updateContent as updateSiteContent } from '../../services/content';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const AdminSettingsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent, isLoading: dataLoading, refetch } = useQuery({ queryKey: ['siteContent'], queryFn: getContent });
    const { showToast } = useToast();
    
    const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting, isDirty } } = useForm<SiteContent>();
    
    const [activeTab, setActiveTab] = useState<'general' | 'banner' | 'contact' | 'social' | 'finance'>('general');

    useEffect(() => {
        if (siteContent) {
            reset(siteContent); // Populate form with fetched data
        }
    }, [siteContent, reset]);

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setValue('logoUrl', base64, { shouldDirty: true });
        }
    };

    const handleQrCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setValue('paymentConfiguration.instapay.qrCodeUrl', base64, { shouldDirty: true });
        }
    };
    
    const watchLogoUrl = watch('logoUrl');
    const watchRouting = watch('contactConfiguration.routing');
    const watchQrCode = watch('paymentConfiguration.instapay.qrCodeUrl');

    const onSubmit = async (formData: SiteContent) => {
        // Exclude finishingServices from the update
        const { finishingServices, ...dataToSave } = formData;
        await updateSiteContent(dataToSave as Partial<SiteContent>);
        refetch();
        showToast('Settings updated successfully!', 'success');
    };

    if (dataLoading) {
        return <div>Loading settings...</div>;
    }
    
    const TabButton: React.FC<{tabKey: 'general' | 'banner' | 'contact' | 'social' | 'finance', label: string}> = ({tabKey, label}) => (
        <button
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`px-4 py-2 font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === tabKey ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.adminDashboard.nav.settings}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Manage global settings for the website, such as footer content and contact information.</p>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div className="px-6 border-b border-gray-200 dark:border-gray-700">
                         <div className="flex -mb-px space-x-6 overflow-x-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            <TabButton tabKey="general" label="General Settings" />
                            <TabButton tabKey="banner" label="Top Banner" />
                            <TabButton tabKey="contact" label="Contact Info" />
                            <TabButton tabKey="finance" label="Finance & Payment" />
                            <TabButton tabKey="social" label="Social Media" />
                         </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {activeTab === 'general' && (
                             <div className="space-y-6 animate-fadeIn">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                     <h4 className="text-lg font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-4">
                                         <GlobeAltIcon className="w-5 h-5" /> Site Identity
                                     </h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site Name (AR)</label>
                                            <Input {...register('siteName.ar')} className={inputClasses} dir="rtl" placeholder="أونلي هيليو" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site Name (EN)</label>
                                            <Input {...register('siteName.en')} className={inputClasses} dir="ltr" placeholder="ONLY HELIO" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Logo</label>
                                            <div className="flex items-center gap-4">
                                                {watchLogoUrl ? <img src={watchLogoUrl} alt="Logo Preview" className="h-12 bg-gray-200 dark:bg-gray-700 p-1 rounded-md object-contain" /> : <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center"><PhotoIcon className="w-6 h-6 text-gray-400" /></div>}
                                                <Input type="file" id="logoUrl" onChange={handleLogoChange} accept="image/*" className="p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
                                            </div>
                                        </div>
                                     </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site Description (in Footer) (AR)</label>
                                    <Textarea {...register('footer.ar.description')} className={inputClasses} rows={3}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site Description (in Footer) (EN)</label>
                                    <Textarea {...register('footer.en.description')} className={inputClasses} rows={3}/>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Copyright Text (AR)</label>
                                        <Input {...register('footer.copyright.ar')} className={inputClasses} dir="rtl"/>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Copyright Text (EN)</label>
                                        <Input {...register('footer.copyright.en')} className={inputClasses} dir="ltr"/>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback Link Text (AR)</label>
                                        <Input {...register('footer.feedbackText.ar')} className={inputClasses} dir="rtl"/>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback Link Text (EN)</label>
                                        <Input {...register('footer.feedbackText.en')} className={inputClasses} dir="ltr"/>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <label htmlFor="locationPickerMapUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Picker Map Image URL</label>
                                    <Input id="locationPickerMapUrl" {...register('locationPickerMapUrl')} />
                                </div>
                             </div>
                        )}

                        {activeTab === 'finance' && (
                             <div className="space-y-8 animate-fadeIn">
                                <Card>
                                    <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <BanknotesIcon className="w-6 h-6 text-amber-600" />
                                            InstaPay Configuration
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                         <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                                            <Checkbox id="instapay-enabled" {...register('paymentConfiguration.instapay.enabled')} />
                                            <label htmlFor="instapay-enabled" className="font-medium cursor-pointer">Enable InstaPay Method</label>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Wallet Number (Vodafone Cash/InstaPay)</label>
                                                <Input {...register('paymentConfiguration.instapay.number')} placeholder="010xxxxxxxx" dir="ltr" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Wallet Name / Owner</label>
                                                <Input {...register('paymentConfiguration.instapay.walletName')} placeholder="e.g. John Doe" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Direct Payment Link (Optional)</label>
                                            <Input {...register('paymentConfiguration.instapay.paymentLink')} placeholder="https://instapay.eg/..." dir="ltr" />
                                            <p className="text-xs text-gray-500 mt-1">A direct link to open the app or a payment gateway.</p>
                                        </div>

                                         <div>
                                            <label className="block text-sm font-medium mb-1">QR Code Image</label>
                                            <div className="flex items-center gap-4">
                                                 {watchQrCode ? <img src={watchQrCode} alt="QR Code" className="h-24 w-24 object-contain border rounded-md bg-white p-1" /> : <div className="h-24 w-24 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-xs">No QR</div>}
                                                <Input type="file" accept="image/*" onChange={handleQrCodeChange} className="max-w-sm" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <div>
                                                 <label className="block text-sm font-medium mb-1">Instructions (AR)</label>
                                                 <Textarea {...register('paymentConfiguration.instapay.instructions.ar')} rows={3} dir="rtl" />
                                            </div>
                                            <div>
                                                 <label className="block text-sm font-medium mb-1">Instructions (EN)</label>
                                                 <Textarea {...register('paymentConfiguration.instapay.instructions.en')} rows={3} dir="ltr" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <CreditCardIcon className="w-6 h-6 text-blue-600" />
                                            Paymob Configuration
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                         <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                                            <Checkbox id="paymob-enabled" {...register('paymentConfiguration.paymob.enabled')} />
                                            <label htmlFor="paymob-enabled" className="font-medium cursor-pointer">Enable Paymob (Card) Method</label>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Paymob API Key</label>
                                            <Input type="password" {...register('paymentConfiguration.paymob.apiKey')} placeholder="Enter API Key" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Paymob Live Secret Key</label>
                                            <Input type="password" {...register('paymentConfiguration.paymob.secretKey')} placeholder="Enter Live Secret Key" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Paymob Live Public Key</label>
                                            <Input type="text" {...register('paymentConfiguration.paymob.publicKey')} placeholder="Enter Live Public Key" />
                                        </div>
                                    </CardContent>
                                </Card>
                             </div>
                        )}

                        {activeTab === 'banner' && (
                             <div className="space-y-6 animate-fadeIn">
                                 <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-4">
                                     <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
                                         <MegaphoneIcon className="w-6 h-6" />
                                     </div>
                                     <div>
                                         <h4 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Top Notification Banner</h4>
                                         <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">This banner appears at the very top of every page to announce important news or beta status.</p>
                                     </div>
                                 </div>

                                 <div className="flex items-center gap-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
                                    <Checkbox id="top-banner-enabled" {...register('topBanner.enabled')} />
                                    <label htmlFor="top-banner-enabled" className="font-medium cursor-pointer text-gray-900 dark:text-white">Enable Top Banner</label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Text (AR)</label>
                                        <Input {...register('topBanner.content.ar')} dir="rtl" placeholder="تنويه: الموقع في مرحلة تجريبية..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Text (EN)</label>
                                        <Input {...register('topBanner.content.en')} dir="ltr" placeholder="Notice: Site is in beta..." />
                                    </div>
                                </div>
                             </div>
                        )}

                        {activeTab === 'contact' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Form Routing</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Contact Form Routing</label>
                                            <Select {...register('contactConfiguration.routing')} className={selectClasses}>
                                                <option value="internal">Internal Messages (Dashboard)</option>
                                                <option value="email">External Email Only</option>
                                                <option value="both">Both (Internal & Email)</option>
                                            </Select>
                                        </div>
                                        {(watchRouting === 'email' || watchRouting === 'both') && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Target Email Address</label>
                                                <Input type="email" {...register('contactConfiguration.targetEmail')} placeholder="admin@example.com" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Phone Number</label>
                                        <Input {...register('footer.phone')} />
                                        <div className="mt-2 flex items-center gap-2">
                                            <Checkbox id="isWhatsAppOnly" {...register('footer.isWhatsAppOnly')} />
                                            <label htmlFor="isWhatsAppOnly" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                                This number is for WhatsApp only (no calls)
                                            </label>
                                        </div>
                                    </div>
                                    <div><label className="block text-sm font-medium">Email Address</label><Input type="email" {...register('footer.email')} /></div>
                                    <div><label className="block text-sm font-medium">Address (AR)</label><Input {...register('footer.ar.address')} /></div>
                                    <div><label className="block text-sm font-medium">Address (EN)</label><Input {...register('footer.en.address')} /></div>
                                    <div><label className="block text-sm font-medium">Working Hours (AR)</label><Input {...register('footer.ar.hours')} /></div>
                                    <div><label className="block text-sm font-medium">Working Hours (EN)</label><Input {...register('footer.en.hours')} /></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'social' && (
                             <div className="space-y-4 animate-fadeIn">
                                <div><label className="block text-sm font-medium">Facebook URL</label><Input {...register('footer.social.facebook')} /></div>
                                <div><label className="block text-sm font-medium">Twitter URL</label><Input {...register('footer.social.twitter')} /></div>
                                <div><label className="block text-sm font-medium">Instagram URL</label><Input {...register('footer.social.instagram')} /></div>
                                <div><label className="block text-sm font-medium">LinkedIn URL</label><Input {...register('footer.social.linkedin')} /></div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-8 flex justify-end items-center gap-4">
                    {isDirty && <span className="text-sm text-yellow-600 dark:text-yellow-400">You have unsaved changes.</span>}
                    <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
                        {isSubmitting ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettingsPage;
