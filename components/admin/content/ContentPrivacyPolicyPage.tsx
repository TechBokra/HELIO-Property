
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { TrashIcon, ArrowUpIcon, ArrowDownIcon, ShieldCheckIcon } from '../../ui/Icons';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentPrivacyPolicyPage: React.FC = () => {
    const { register, control } = useOutletContext<ContentFormContext>();
    
    // Arrays for sections
    const { fields: arFields, append: appendAr, remove: removeAr, swap: swapAr } = useFieldArray({ control, name: 'privacyPolicy.ar.sections' });
    const { fields: enFields, append: appendEn, remove: removeEn, swap: swapEn } = useFieldArray({ control, name: 'privacyPolicy.en.sections' });

    const addSection = () => {
        appendAr({ title: 'New Section', content: '' });
        appendEn({ title: 'New Section', content: '' });
    };

    const removeSection = (index: number) => {
        if (window.confirm('Are you sure you want to remove this section from both languages?')) {
            removeAr(index);
            removeEn(index);
        }
    };
    
    const swapSection = (index1: number, index2: number) => {
        swapAr(index1, index2);
        swapEn(index1, index2);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
             <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <ShieldCheckIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>Privacy Policy</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Edit the main title and last updated text.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Header</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Page Title</label>
                            <Input {...register('privacyPolicy.ar.title')} dir="rtl" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Last Updated Text</label>
                            <Input {...register('privacyPolicy.ar.lastUpdated')} dir="rtl" />
                        </div>
                    </div>
                     <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Header</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Page Title</label>
                            <Input {...register('privacyPolicy.en.title')} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Last Updated Text</label>
                            <Input {...register('privacyPolicy.en.lastUpdated')} dir="ltr" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Policy Sections</h3>
                    <Button type="button" onClick={addSection}>Add New Section</Button>
                </div>

                {arFields.map((field, index) => (
                    <Card key={field.id} className="overflow-hidden border-l-4 border-l-amber-500">
                         <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-500 uppercase">Section {index + 1}</span>
                            <div className="flex gap-1">
                                <Button type="button" size="icon" variant="ghost" onClick={() => swapSection(index, index - 1)} disabled={index === 0}><ArrowUpIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => swapSection(index, index + 1)} disabled={index === arFields.length - 1}><ArrowDownIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="danger" className="ml-2" onClick={() => removeSection(index)}><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                        </div>
                        <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h5 className="text-sm font-bold text-gray-400 uppercase">Arabic</h5>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-500">Title</label>
                                    <Input {...register(`privacyPolicy.ar.sections.${index}.title`)} dir="rtl" className="font-bold" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-500">Content (Markdown supported)</label>
                                    <Textarea {...register(`privacyPolicy.ar.sections.${index}.content`)} rows={6} dir="rtl" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h5 className="text-sm font-bold text-gray-400 uppercase">English</h5>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-500">Title</label>
                                    <Input {...register(`privacyPolicy.en.sections.${index}.title`)} dir="ltr" className="font-bold" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-500">Content (Markdown supported)</label>
                                    <Textarea {...register(`privacyPolicy.en.sections.${index}.content`)} rows={6} dir="ltr" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                 {arFields.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                        <p className="text-gray-500">No sections added yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentPrivacyPolicyPage;
