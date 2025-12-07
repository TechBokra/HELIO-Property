import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { updateUser } from '../../services/partners';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { inputClasses } from '../ui/FormField';
import { ShieldCheckIcon } from '../ui/Icons';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const UserProfilePage = () => {
    const { t, language } = useLanguage();
    const t_dash = t.dashboard;
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const { register, handleSubmit, reset } = useForm();
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        if (currentUser) {
             const user = currentUser as any;
            reset({
                name: user.name,
                email: user.email,
                phone: user.contactMethods?.phone?.number || '',
                password: '',
            });
            setLogoPreview(currentUser.imageUrl);
        }
    }, [currentUser, reset]);

    const mutation = useMutation({
        mutationFn: (data: { id: string, updates: any }) => updateUser(data.id, data.updates),
        onSuccess: () => {
            showToast(t_dash.profileUpdateSuccess, 'success');
            queryClient.invalidateQueries({ queryKey: [`partner-${currentUser?.id}`] });
            // Reload to update header
            setTimeout(() => window.location.reload(), 500);
        },
        onError: () => {
            showToast('Failed to update profile.', 'error');
        },
    });

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const previewUrl = URL.createObjectURL(file);
            setLogoPreview(previewUrl);
        }
    };

    const onSubmit = async (data: any) => {
        if (!currentUser) return;

        let imageUrl = currentUser.imageUrl;
        if (logoFile) {
            imageUrl = await fileToBase64(logoFile);
        }
        
        const updates: any = {
            name: data.name,
            email: data.email,
            imageUrl: imageUrl,
            contactMethods: {
                ...currentUser.contactMethods,
                phone: { enabled: true, number: data.phone }
            }
        };

        if (data.password) {
            updates.password = data.password;
        }

        mutation.mutate({ id: currentUser.id, updates });
    };

    if (!currentUser) return null;

    return (
        <div className="max-w-2xl mx-auto animate-fadeIn">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_dash.profileTitle}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Manage your personal information and security.</p>

            <Card>
                <CardHeader>
                    <CardTitle>{t.dashboard.nav.profile}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative w-28 h-28 mb-4">
                                <img 
                                    src={logoPreview || 'https://via.placeholder.com/150'} 
                                    alt="Profile" 
                                    className="w-full h-full rounded-full object-cover border-4 border-amber-100 dark:border-gray-700" 
                                />
                                <label 
                                    htmlFor="avatar-upload" 
                                    className="absolute bottom-0 right-0 bg-amber-500 text-white p-2 rounded-full cursor-pointer hover:bg-amber-600 transition-colors shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                    </svg>
                                    <input 
                                        id="avatar-upload" 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleLogoChange} 
                                        className="hidden" 
                                    />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t.dashboard.teamManagement.name}
                            </label>
                            <Input {...register("name", { required: true })} className={inputClasses} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t.auth.email}
                                </label>
                                <Input type="email" {...register("email", { required: true })} className={inputClasses} />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t.partnerRequestForm.contactPhone}
                                </label>
                                <Input type="tel" {...register("phone")} className={inputClasses} />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5 text-amber-500" /> Security
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                                </label>
                                <Input type="password" {...register("password")} placeholder="••••••••" className={inputClasses} />
                                <p className="text-xs text-gray-500 mt-1">{t.adminDashboard.userManagement.form.passwordHelp}</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <Button type="submit" isLoading={mutation.isPending}>
                                {t_dash.saveChanges}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserProfilePage;