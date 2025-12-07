
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { TrashIcon, SparklesIcon, CogIcon } from '../../ui/Icons';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentServicesPage: React.FC = () => {
    const { register, control } = useOutletContext<ContentFormContext>();
    const { fields: serviceFields, append, remove } = useFieldArray({ control, name: 'services.en.features' });
    const { remove: removeAr } = useFieldArray({ control, name: 'services.ar.features' });

    return (
        <div className="space-y-8 animate-fadeIn">
            
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <CogIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div>
                                <CardTitle>General Settings</CardTitle>
                                <p className="text-sm text-gray-500">Configure the section header and visibility.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Checkbox id="services-enabled" {...register('services.enabled')} />
                            <label htmlFor="services-enabled" className="font-medium cursor-pointer text-sm">Enable Section</label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                         <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Title</label>
                            <Input {...register('services.ar.title')} dir="rtl" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Description</label>
                            <Textarea {...register('services.ar.description')} rows={3} dir="rtl" />
                        </div>
                    </div>
                     <div className="space-y-4">
                         <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Title</label>
                            <Input {...register('services.en.title')} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Description</label>
                            <Textarea {...register('services.en.description')} rows={3} dir="ltr" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-amber-500" />
                        Service Cards
                    </h3>
                    <Button 
                        type="button" 
                        onClick={() => {
                            const newFeature = { title: '', description: '', link: '/', icon: 'SparklesIcon' };
                            append(newFeature);
                            // Manually sync the second language array
                            (control as any)._formValues.services.ar.features.push(newFeature);
                        }}
                    >
                        Add Service Card
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {serviceFields.map((field, index) => (
                        <div key={field.id} className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-bl-xl border-l border-b border-gray-200 dark:border-gray-700 z-10">
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { remove(index); removeAr(index); }}><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                     <div className="space-y-3">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Arabic</span>
                                        <div><label className="text-xs mb-1 block text-gray-500">Title</label><Input {...register(`services.ar.features.${index}.title`)} dir="rtl" /></div>
                                        <div><label className="text-xs mb-1 block text-gray-500">Description</label><Textarea {...register(`services.ar.features.${index}.description`)} rows={3} dir="rtl"/></div>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">English</span>
                                        <div><label className="text-xs mb-1 block text-gray-500">Title</label><Input {...register(`services.en.features.${index}.title`)} dir="ltr" /></div>
                                        <div><label className="text-xs mb-1 block text-gray-500">Description</label><Textarea {...register(`services.en.features.${index}.description`)} rows={3} dir="ltr"/></div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-gray-500">Link (e.g., /properties)</label>
                                        <Input {...register(`services.en.features.${index}.link`)} className="font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-gray-500">Icon Name</label>
                                        <Input {...register(`services.en.features.${index}.icon`)} className="font-mono text-sm" placeholder="e.g. BuildingIcon" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                 {serviceFields.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                        <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No service cards added yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentServicesPage;
