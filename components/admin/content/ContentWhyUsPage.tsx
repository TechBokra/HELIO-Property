
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { TrashIcon, CheckCircleIcon, CogIcon } from '../../ui/Icons';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentWhyUsPage: React.FC = () => {
    const { register, control } = useOutletContext<ContentFormContext>();
    const { fields, append, remove } = useFieldArray({ control, name: 'whyUs.en.features' });
    const { remove: removeAr } = useFieldArray({ control, name: 'whyUs.ar.features' });

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
                            <Checkbox id="whyus-enabled" {...register('whyUs.enabled')} />
                            <label htmlFor="whyus-enabled" className="font-medium cursor-pointer text-sm">Enable Section</label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                         <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Title</label>
                            <Input {...register('whyUs.ar.title')} dir="rtl" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Description</label>
                            <Textarea {...register('whyUs.ar.description')} rows={3} dir="rtl" />
                        </div>
                    </div>
                     <div className="space-y-4">
                         <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Title</label>
                            <Input {...register('whyUs.en.title')} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Section Description</label>
                            <Textarea {...register('whyUs.en.description')} rows={3} dir="ltr" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                        Features List
                    </h3>
                    <Button 
                        type="button" 
                        onClick={() => { 
                            const newFeature = { title: '', description: '' };
                            append(newFeature); 
                            // Manually sync the second language array
                            (control as any)._formValues.whyUs.ar.features.push(newFeature);
                        }}
                    >
                        Add Feature
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {fields.map((field, index) => (
                        <div key={field.id} className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden group hover:border-amber-400 transition-colors">
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => { remove(index); removeAr(index); }}><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                            <div className="p-6 space-y-4">
                                 <div className="space-y-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Arabic</span>
                                    <Input {...register(`whyUs.ar.features.${index}.title`)} placeholder="Title" dir="rtl" className="font-medium" />
                                    <Textarea {...register(`whyUs.ar.features.${index}.description`)} placeholder="Description" rows={2} dir="rtl" className="text-sm"/>
                                </div>
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">English</span>
                                    <Input {...register(`whyUs.en.features.${index}.title`)} placeholder="Title" dir="ltr" className="font-medium" />
                                    <Textarea {...register(`whyUs.en.features.${index}.description`)} placeholder="Description" rows={2} dir="ltr" className="text-sm"/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                 {fields.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                        <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No features added yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentWhyUsPage;
