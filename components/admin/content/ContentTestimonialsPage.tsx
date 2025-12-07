

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { TrashIcon, ArrowUpIcon, ArrowDownIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentTestimonialsPage: React.FC = () => {
    const { register, control } = useOutletContext<ContentFormContext>();
    const { fields, append, remove, swap } = useFieldArray({ control, name: 'testimonials.items' });
    
    return (
        <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold">Testimonials Section</h3>
            <div className="flex items-center gap-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
                <input type="checkbox" {...register('testimonials.enabled')} className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500" />
                <label className="font-medium">Enable Testimonials section on homepage</label>
            </div>
            
            <div><label className="block text-sm font-medium">Section Title (AR)</label><Input {...register('testimonials.ar.title')} /></div>
            <div><label className="block text-sm font-medium">Section Title (EN)</label><Input {...register('testimonials.en.title')} /></div>
            <div><label className="block text-sm font-medium">Section Subtitle (AR)</label><Textarea {...register('testimonials.ar.subtitle')} rows={2}/></div>
            <div><label className="block text-sm font-medium">Section Subtitle (EN)</label><Textarea {...register('testimonials.en.subtitle')} rows={2}/></div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-2">Testimonial Items</h4>
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md space-y-3 relative bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex justify-end gap-1 absolute top-2 right-2">
                                <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index - 1)} disabled={index === 0}><ArrowUpIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index + 1)} disabled={index === fields.length - 1}><ArrowDownIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Quote (AR)</label><Textarea {...register(`testimonials.items.${index}.quote.ar`)} rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Quote (EN)</label><Textarea {...register(`testimonials.items.${index}.quote.en`)} rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Author (AR)</label><Input {...register(`testimonials.items.${index}.author.ar`)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Author (EN)</label><Input {...register(`testimonials.items.${index}.author.en`)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Location (AR)</label><Input {...register(`testimonials.items.${index}.location.ar`)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Location (EN)</label><Input {...register(`testimonials.items.${index}.location.en`)} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="secondary" className="mt-4" onClick={() => append({ quote: { ar: '', en: '' }, author: { ar: '', en: '' }, location: { ar: '', en: '' } })}>
                    Add Testimonial
                </Button>
            </div>
        </div>
    );
};
export default ContentTestimonialsPage;