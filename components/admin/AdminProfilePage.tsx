

import React, { useState, useEffect } from 'react';
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

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const AdminProfilePage: React.FC = () => {
    const { t } = useLanguage();
    const t_dash = t.dashboard;
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const { register, handleSubmit, reset } = useForm();
    const [logoPreview, setLogoPreview] = useState<string | null>('');
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        if (currentUser) {
            // Cast to any to access nameAr if it exists on the specific type
            const user = currentUser as any;
            reset({
                nameAr: user.nameAr || user.name,
                nameEn: user.name,
                email: user.email,
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
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            // Force reload to update sidebar avatar immediately if changed
            setTimeout(() => window.location.reload(), 1000);
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
            nameAr: data.nameAr,
            name: data.nameEn, // Internal users mainly use 'name' as EN and 'nameAr' for AR
            email: data.email,
            imageUrl: imageUrl,
        };

        if (data.password) {
            updates.password = data.password;
        }

        mutation.mutate({ id: currentUser.id, updates });
    };

    if (!currentUser) return null;

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_dash.profileTitle}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t_dash.profileSubtitle}</p>

            <Card>
                <CardHeader>
                    <CardTitle>{t.dashboard.nav.profile}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative w-32 h-32 mb-4">
                                <img 
                                    src={logoPreview || currentUser.imageUrl} 
                                    alt="Profile" 
                                    className="w-full h-full rounded-full object-cover border-4 border-amber-100 dark:border-gray-700" 
                                />
                                <label 
                                    htmlFor="avatar-upload" 
                                    className="absolute bottom-0 right-0 bg-amber-500 text-white p-2 rounded-full cursor-pointer hover:bg-amber-600 transition-colors shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        {/* FIX: Corrected SVG attribute 'strokeLineCap' to 'strokeLinecap' and 'strokeLineJoin' to 'strokeLinejoin'. */}
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                        {/* FIX: Corrected SVG attribute 'strokeLineCap' to 'strokeLinecap' and 'strokeLineJoin' to 'strokeLinejoin'. */}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t.adminDashboard.userManagement.form.nameAr}
                                </label>
                                <Input {...register("nameAr", { required: true })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t.adminDashboard.userManagement.form.nameEn}
                                </label>
                                <Input {...register("nameEn", { required: true })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t.auth.email}
                            </label>
                            <Input type="email" {...register("email", { required: true })} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t.auth.password} <span className="text-xs text-gray-500 font-normal">({t.adminDashboard.userManagement.form.passwordHelp})</span>
                            </label>
                            <Input type="password" {...register("password")} placeholder="••••••••" />
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
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

export default AdminProfilePage;
