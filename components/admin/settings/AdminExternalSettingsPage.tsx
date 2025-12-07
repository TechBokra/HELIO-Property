
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContent, updateContent } from '../../../services/content';
import type { SiteContent, IntegrationConfiguration } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { CloudIcon, DatabaseIcon, ServerIcon, LinkIcon } from '../../ui/Icons';

const AdminExternalSettingsPage: React.FC = () => {
    const { t, language } = useLanguage();
    const t_page = t.adminDashboard.externalSettings;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: siteContent, isLoading } = useQuery({ queryKey: ['siteContent'], queryFn: getContent });
    
    const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<IntegrationConfiguration>();
    const [activeTab, setActiveTab] = useState<'vercel' | 'supabase' | 'cloudinary'>('vercel');

    useEffect(() => {
        if (siteContent?.integrationConfiguration) {
            reset(siteContent.integrationConfiguration);
        }
    }, [siteContent, reset]);

    const mutation = useMutation({
        mutationFn: (data: IntegrationConfiguration) => updateContent({ integrationConfiguration: data } as Partial<SiteContent>),
        onSuccess: () => {
            showToast(t_page.saveSuccess, 'success');
            queryClient.invalidateQueries({ queryKey: ['siteContent'] });
        },
        onError: () => {
            showToast('Failed to save settings.', 'error');
        }
    });

    const onSubmit = (data: IntegrationConfiguration) => {
        mutation.mutate(data);
    };

    if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;

    const TabButton: React.FC<{ tabKey: 'vercel' | 'supabase' | 'cloudinary', label: string, icon: any }> = ({ tabKey, label, icon: Icon }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`flex items-center gap-2 px-6 py-3 font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tabKey 
                ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/10' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
             <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <LinkIcon className="w-8 h-8 text-amber-500" />
                    {t_page.title}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">{t_page.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                     <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                         <div className="flex" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            <TabButton tabKey="vercel" label={t_page.tabs.vercel} icon={ServerIcon} />
                            <TabButton tabKey="supabase" label={t_page.tabs.supabase} icon={DatabaseIcon} />
                            <TabButton tabKey="cloudinary" label={t_page.tabs.cloudinary} icon={CloudIcon} />
                         </div>
                    </div>

                    <div className="p-6">
                        {activeTab === 'vercel' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                        <ServerIcon className="w-5 h-5" /> {t_page.vercel.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{t_page.vercel.desc}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-6 max-w-2xl">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.vercel.accessToken}</label>
                                        <Input type="password" {...register('vercel.accessToken')} placeholder="vc_..." className="font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.vercel.projectId}</label>
                                        <Input {...register('vercel.projectId')} placeholder="prj_..." className="font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.vercel.teamId}</label>
                                        <Input {...register('vercel.teamId')} placeholder="team_... (Optional)" className="font-mono" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'supabase' && (
                            <div className="space-y-6 animate-fadeIn">
                                 <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-6">
                                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 flex items-center gap-2">
                                        <DatabaseIcon className="w-5 h-5" /> {t_page.supabase.title}
                                    </h3>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">{t_page.supabase.desc}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6 max-w-2xl">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.supabase.url}</label>
                                        <Input {...register('supabase.url')} placeholder="https://xyz.supabase.co" className="font-mono" dir="ltr" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.supabase.anonKey}</label>
                                        <Input type="password" {...register('supabase.anonKey')} placeholder="public-anon-key" className="font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-red-600 dark:text-red-400">{t_page.supabase.serviceRoleKey}</label>
                                        <Input type="password" {...register('supabase.serviceRoleKey')} placeholder="secret-service-role-key" className="font-mono border-red-200 focus:ring-red-500" />
                                        <p className="text-xs text-red-500 mt-1">Keep this key secret. It has full access to your database.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'cloudinary' && (
                             <div className="space-y-6 animate-fadeIn">
                                 <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-2">
                                        <CloudIcon className="w-5 h-5" /> {t_page.cloudinary.title}
                                    </h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{t_page.cloudinary.desc}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6 max-w-2xl">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.cloudinary.cloudName}</label>
                                        <Input {...register('cloudinary.cloudName')} placeholder="my-cloud-name" className="font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.cloudinary.apiKey}</label>
                                        <Input {...register('cloudinary.apiKey')} placeholder="123456789" className="font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t_page.cloudinary.apiSecret}</label>
                                        <Input type="password" {...register('cloudinary.apiSecret')} placeholder="****************" className="font-mono" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Button type="submit" isLoading={mutation.isPending} disabled={!isDirty}>
                            {t_page.saveSuccess ? 'Save Configuration' : 'Save Configuration'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AdminExternalSettingsPage;
