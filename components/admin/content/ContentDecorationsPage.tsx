
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { SparklesIcon, PhotoIcon } from '../../ui/Icons';
import { uploadFile } from '../../../services/upload';
import { useToast } from '../../shared/ToastContext';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentDecorationsPage: React.FC = () => {
    const { register, watch, setValue } = useOutletContext<ContentFormContext>();
    const { showToast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const heroImageUrl = watch('decorationsPage.heroImageUrl');

    const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await uploadFile(file);
            setValue('decorationsPage.heroImageUrl', url, { shouldDirty: true, shouldTouch: true });
            showToast('Hero image uploaded successfully!', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Image upload failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <SparklesIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>Decorations Page Content</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Manage text content for the /decorations page.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                        
                        {/* Hero Section */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Hero Section</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('decorationsPage.ar.heroTitle')} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('decorationsPage.ar.heroSubtitle')} rows={3} dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Custom Request Button Text</label>
                                <Input {...register('decorationsPage.ar.customRequestButton')} dir="rtl" />
                            </div>
                        </div>

                         {/* Tabs Descriptions */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Category Descriptions</h5>
                             <div>
                                <label className="block text-xs font-medium mb-1">Wall Sculptures Description</label>
                                <Textarea {...register('decorationsPage.ar.sculptures_desc')} rows={3} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Canvas Paintings Description</label>
                                <Textarea {...register('decorationsPage.ar.paintings_desc')} rows={3} dir="rtl" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Antiques Description</label>
                                <Textarea {...register('decorationsPage.ar.antiques_desc')} rows={3} dir="rtl" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                        
                         {/* Hero Section */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Hero Section</h5>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title</label>
                                <Input {...register('decorationsPage.en.heroTitle')} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Subtitle</label>
                                <Textarea {...register('decorationsPage.en.heroSubtitle')} rows={3} dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Custom Request Button Text</label>
                                <Input {...register('decorationsPage.en.customRequestButton')} dir="ltr" />
                            </div>
                        </div>

                         {/* Tabs Descriptions */}
                        <div className="space-y-3">
                            <h5 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Category Descriptions</h5>
                             <div>
                                <label className="block text-xs font-medium mb-1">Wall Sculptures Description</label>
                                <Textarea {...register('decorationsPage.en.sculptures_desc')} rows={3} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Canvas Paintings Description</label>
                                <Textarea {...register('decorationsPage.en.paintings_desc')} rows={3} dir="ltr" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium mb-1">Antiques Description</label>
                                <Textarea {...register('decorationsPage.en.antiques_desc')} rows={3} dir="ltr" />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div>
                            <label className="block text-xs font-medium mb-1 text-gray-500">Custom Design CTA Target Link</label>
                            <Input {...register('decorationsPage.customRequestLink')} dir="ltr" className="font-mono text-sm max-w-md" placeholder="/request-service" />
                        </div>

                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
                                <PhotoIcon className="w-5 h-5 text-amber-500" />
                                <span>Editorial Hero Background Image (صورة الغلاف الرئيسية للصفحة)</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {heroImageUrl && (
                                    <img loading="lazy" decoding="async" src={heroImageUrl} alt="Decorations Hero Preview" className="w-40 h-24 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0" />
                                )}
                                <div className="flex-1 w-full space-y-2">
                                    <Input {...register('decorationsPage.heroImageUrl')} dir="ltr" className="font-mono text-xs" placeholder="https://..." />
                                    <div className="flex items-center gap-3">
                                        <input type="file" accept="image/*" onChange={handleHeroImageUpload} disabled={isUploading} className="text-xs text-gray-500 file:me-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-amber-500/20 file:text-amber-700 dark:file:text-amber-300 file:font-semibold" />
                                        {isUploading && <span className="text-xs text-amber-600">Uploading...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentDecorationsPage;
