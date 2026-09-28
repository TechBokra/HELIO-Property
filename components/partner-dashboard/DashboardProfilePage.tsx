
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionPlan } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { inputClasses } from '../ui/FormField';
import { updatePartner } from '../../services/partners';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { WhatsAppIcon, PhoneIcon, ClipboardDocumentListIcon, ShieldCheckIcon, WrenchScrewdriverIcon } from '../ui/Icons';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { uploadFile } from '../../services/upload';

const textareaClasses = `${inputClasses} min-h-[120px]`;

const DashboardProfilePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const t_plans_base = t.subscriptionPlans;
    const { currentUser, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    // Use form hook for profile data
    const { register, handleSubmit, reset, setValue, watch } = useForm();
    
    // Password change state
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [logoPreview, setLogoPreview] = useState<string | null>('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Contact Methods State
    const [contactMethods, setContactMethods] = useState({
        whatsapp: { enabled: false, number: '' },
        phone: { enabled: false, number: '' },
        form: { enabled: true },
    });

    const mutation = useMutation({
        mutationFn: (data: { id: string, updates: any }) => updatePartner(data.id, data.updates),
        onSuccess: () => {
            showToast(t_dash.profileUpdateSuccess, 'success');
            queryClient.invalidateQueries({ queryKey: [`partner-${currentUser?.id}`] });
             // Clear password fields
            setPasswordData({ newPassword: '', confirmPassword: '' });
        },
        onError: () => {
            showToast('Failed to update profile.', 'error');
        },
    });
    
    useEffect(() => {
        if (currentUser && 'type' in currentUser) {
            const partnerInfo = t.partnerInfo[currentUser.id];
            reset({
                nameAr: partnerInfo?.name,
                descriptionAr: partnerInfo?.description,
                nameEn: partnerInfo?.name, 
                descriptionEn: partnerInfo?.description,
            });
            setLogoPreview(currentUser.imageUrl);
            
            if (currentUser.contactMethods) {
                setContactMethods(currentUser.contactMethods);
            }
        }
    }, [currentUser, reset, t.partnerInfo]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const previewUrl = URL.createObjectURL(file);
            setLogoPreview(previewUrl);
        }
    };

    const handleContactToggle = (method: 'whatsapp' | 'phone' | 'form') => {
        setContactMethods(prev => ({
            ...prev,
            [method]: { ...prev[method], enabled: !prev[method].enabled }
        }));
    };

    const handleContactNumberChange = (method: 'whatsapp' | 'phone', value: string) => {
         setContactMethods(prev => ({
            ...prev,
            [method]: { ...prev[method], number: value }
        }));
    };

    const onSubmit = async (data: any) => {
        if (!currentUser || !('type' in currentUser)) return;

        let imageUrl = currentUser.imageUrl;
        if (logoFile) {
            setIsUploading(true);
            try {
                imageUrl = await uploadFile(logoFile);
            } catch (error) {
                showToast("Failed to upload image", "error");
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }
        
        const updates: any = {
            nameAr: data.nameAr,
            nameEn: data.nameEn,
            descriptionAr: data.descriptionAr,
            descriptionEn: data.descriptionEn,
            imageUrl: imageUrl,
            contactMethods: contactMethods
        };
        
        if (passwordData.newPassword) {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                showToast(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match', 'error');
                return;
            }
            if (passwordData.newPassword.length < 6) {
                showToast(language === 'ar' ? 'كلمة المرور قصيرة جداً' : 'Password is too short', 'error');
                return;
            }
            updates.password = passwordData.newPassword;
        }

        mutation.mutate({ id: currentUser.id, updates });
    };
    
    if (authLoading || !currentUser || !('type' in currentUser)) return null;
    
    const partnerTypeKey = currentUser.type as 'developer' | 'agency' | 'finishing';
    const plansForType = (t_plans_base as any)[partnerTypeKey];
    const planDetails = plansForType ? plansForType[currentUser.subscriptionPlan as keyof typeof plansForType] : null;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_dash.profileTitle}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t_dash.profileSubtitle}</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info Card */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
                            {language === 'ar' ? 'معلومات الشركة' : 'Company Information'}
                        </h2>
                        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="nameAr" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t_dash.partnerName} (AR)</label>
                                    <input type="text" id="nameAr" {...register("nameAr", { required: true })} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="nameEn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t_dash.partnerName} (EN)</label>
                                    <input type="text" id="nameEn" {...register("nameEn", { required: true })} className={inputClasses} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="descriptionAr" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t_dash.partnerDescription} (AR)</label>
                                <textarea id="descriptionAr" {...register("descriptionAr", { required: true })} className={textareaClasses} />
                            </div>
                            <div>
                                <label htmlFor="descriptionEn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t_dash.partnerDescription} (EN)</label>
                                <textarea id="descriptionEn" {...register("descriptionEn", { required: true })} className={textareaClasses} />
                            </div>
                            <div>
                                <label htmlFor="partnerImageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t_dash.partnerImageUrl}</label>
                                <div className="flex items-center gap-4">
                                    {logoPreview && <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600" />}
                                    <input 
                                        type="file" 
                                        id="partnerImageUrl" 
                                        accept="image/*"
                                        onChange={handleLogoChange} 
                                        className={`${inputClasses} p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100`}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Contact Preferences Card */}
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
                            {language === 'ar' ? 'تفضيلات التواصل' : 'Contact Preferences'}
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">
                            {language === 'ar' 
                                ? 'اختر الوسائل التي يمكن للعملاء استخدامها للتواصل معك.' 
                                : 'Choose which methods customers can use to contact you directly.'}
                        </p>

                        <div className="space-y-6">
                            {/* WhatsApp */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${contactMethods.whatsapp.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <WhatsAppIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">WhatsApp</p>
                                        <p className="text-xs text-gray-500">Direct chat link</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-grow justify-end">
                                    {contactMethods.whatsapp.enabled && (
                                        <input 
                                            type="text" 
                                            placeholder="+201..." 
                                            value={contactMethods.whatsapp.number}
                                            onChange={(e) => handleContactNumberChange('whatsapp', e.target.value)}
                                            className="p-2 border rounded text-sm w-40 font-mono"
                                            dir="ltr"
                                        />
                                    )}
                                    <ToggleSwitch 
                                        checked={contactMethods.whatsapp.enabled} 
                                        onChange={() => handleContactToggle('whatsapp')} 
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${contactMethods.phone.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <PhoneIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">Phone Call</p>
                                        <p className="text-xs text-gray-500">Click to call</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-grow justify-end">
                                    {contactMethods.phone.enabled && (
                                        <input 
                                            type="text" 
                                            placeholder="+201..." 
                                            value={contactMethods.phone.number}
                                            onChange={(e) => handleContactNumberChange('phone', e.target.value)}
                                            className="p-2 border rounded text-sm w-40 font-mono"
                                            dir="ltr"
                                        />
                                    )}
                                    <ToggleSwitch 
                                        checked={contactMethods.phone.enabled} 
                                        onChange={() => handleContactToggle('phone')} 
                                    />
                                </div>
                            </div>

                            {/* System Form */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${contactMethods.form.enabled ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <ClipboardDocumentListIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">Platform Form</p>
                                        <p className="text-xs text-gray-500">Leads appear in your dashboard</p>
                                    </div>
                                </div>
                                <div>
                                    <ToggleSwitch 
                                        checked={contactMethods.form.enabled} 
                                        onChange={() => handleContactToggle('form')} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Security / Password */}
                     <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <ShieldCheckIcon className="w-6 h-6 text-amber-500" />
                            {language === 'ar' ? 'الأمان وكلمة المرور' : 'Security & Password'}
                        </h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                                <input 
                                    type="password" 
                                    className={inputClasses} 
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="******"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                                <input 
                                    type="password" 
                                    className={inputClasses} 
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    placeholder="******"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSubmit(onSubmit)} isLoading={mutation.isPending || isUploading} size="lg">
                            {t_dash.saveChanges}
                        </Button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700 h-fit">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t_dash.subscription}</h2>
                    {planDetails ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-lg text-center">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{t_dash.currentPlan}</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{planDetails.name}</p>
                            <Link 
                                to="/dashboard/subscription"
                                className="mt-4 inline-block w-full text-center text-amber-600 dark:text-amber-400 font-semibold px-4 py-2 rounded-lg hover:bg-amber-500/20 transition-colors"
                            >
                                {t_dash.manageSubscription}
                            </Link>
                        </div>
                    ) : <p className="text-sm text-gray-500">No active subscription.</p>}

                    {/* Finishing Capabilities Card */}
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="w-5 h-5 text-amber-500" />
                            {language === 'ar' ? 'قدرات وتغطية التشطيب' : 'Finishing Capabilities & Scope'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                            {language === 'ar'
                                ? 'حدد مجالات العمل (تسليم مفتاح، ديكور، تجاري، ترميم) والمدن وميزانيات المشاريع.'
                                : 'Define your disciplines (turnkey, commercial, renovation) and target cities for RFQs.'}
                        </p>
                        <Link 
                            to="/dashboard/capabilities"
                            className="inline-flex items-center justify-center w-full text-center bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold px-4 py-2.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors text-xs"
                        >
                            {language === 'ar' ? 'إدارة التخصصات ومناطق الخدمة ⚙' : 'Configure Capabilities & Areas ⚙'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardProfilePage;
