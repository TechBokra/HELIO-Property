
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { CubeIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentProjectsPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-8 animate-fadeIn">
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <CubeIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>Projects Page Content</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Manage the titles and descriptions for the /projects page.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Page Title</label>
                            <Input {...register('projectsPage.ar.title')} className="font-bold" dir="rtl" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Subtitle</label>
                            <Textarea {...register('projectsPage.ar.subtitle')} rows={3} dir="rtl" />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                         <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Page Title</label>
                            <Input {...register('projectsPage.en.title')} className="font-bold" dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Subtitle</label>
                            <Textarea {...register('projectsPage.en.subtitle')} rows={3} dir="ltr" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentProjectsPage;
