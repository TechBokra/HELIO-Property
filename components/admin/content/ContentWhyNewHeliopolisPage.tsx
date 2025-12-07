

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn, Control } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { TrashIcon, ArrowUpIcon, ArrowDownIcon } from '../../ui/Icons';
import { Checkbox } from '../../ui/Checkbox';

type ContentFormContext = UseFormReturn<SiteContent>;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const ContentWhyNewHeliopolisPage: React.FC = () => {
    const { register, control, setValue } = useOutletContext<ContentFormContext>();
    const { fields: statFields, append: appendStat, remove: removeStat } = useFieldArray({ control, name: 'whyNewHeliopolis.en.location.stats' });
    const { remove: removeArStat } = useFieldArray({ control, name: 'whyNewHeliopolis.ar.location.stats' });

    const { fields: imageFields, append: appendImage, remove: removeImage, swap: swapImage } = useFieldArray({ control, name: 'whyNewHeliopolis.images' });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setValue(`whyNewHeliopolis.images.${index}.src`, base64, { shouldDirty: true });
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold">"Why New Heliopolis" Section</h3>

            <div className="flex items-center gap-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
                <Checkbox id="whyNewHeliopolis-enabled" {...register('whyNewHeliopolis.enabled')} />
                <label htmlFor="whyNewHeliopolis-enabled" className="font-medium cursor-pointer">Enable "Why New Heliopolis" section on homepage</label>
            </div>

            <div><label className="block text-sm font-medium">Section Title (AR)</label><Input {...register('whyNewHeliopolis.ar.title')} /></div>
            <div><label className="block text-sm font-medium">Section Title (EN)</label><Input {...register('whyNewHeliopolis.en.title')} /></div>
            <div><label className="block text-sm font-medium">Location Title (AR)</label><Input {...register('whyNewHeliopolis.ar.location.title')} /></div>
            <div><label className="block text-sm font-medium">Location Title (EN)</label><Input {...register('whyNewHeliopolis.en.location.title')} /></div>
            <div><label className="block text-sm font-medium">Location Description (AR)</label><Textarea {...register('whyNewHeliopolis.ar.location.description')} rows={3}/></div>
            <div><label className="block text-sm font-medium">Location Description (EN)</label><Textarea {...register('whyNewHeliopolis.en.location.description')} rows={3}/></div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-2">Location Stats</h4>
                <div className="space-y-3">
                    {statFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md relative bg-gray-50 dark:bg-gray-800/50">
                             <Button type="button" size="icon" variant="ghost" onClick={() => { removeStat(index); removeArStat(index); }} className="absolute top-1 right-1"><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs">Value (AR)</label><Input {...register(`whyNewHeliopolis.ar.location.stats.${index}.value`)} /></div>
                                <div><label className="text-xs">Value (EN)</label><Input {...register(`whyNewHeliopolis.en.location.stats.${index}.value`)} /></div>
                                <div><label className="text-xs">Description (AR)</label><Input {...register(`whyNewHeliopolis.ar.location.stats.${index}.desc`)} /></div>
                                <div><label className="text-xs">Description (EN)</label><Input {...register(`whyNewHeliopolis.en.location.stats.${index}.desc`)} /></div>
                            </div>
                        </div>
                    ))}
                </div>
                 <Button type="button" variant="secondary" className="mt-4" onClick={() => { appendStat({ value: '', desc: ''}); (control as any)._formValues.whyNewHeliopolis.ar.location.stats.push({ value: '', desc: ''}); }}>Add Stat</Button>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-2 text-lg">Images</h4>
                <div className="space-y-3">
                    {imageFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md space-y-3 relative bg-gray-50 dark:bg-gray-800/50">
                             <div className="flex justify-end gap-1 absolute top-2 right-2 z-10">
                                <Button type="button" size="icon" variant="ghost" onClick={() => swapImage(index, index - 1)} disabled={index === 0}><ArrowUpIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => swapImage(index, index + 1)} disabled={index === imageFields.length - 1}><ArrowDownIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => removeImage(index)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                            </div>
                             <div className="flex gap-4 items-start">
                                <img src={(field as any).src} alt="preview" className="w-36 h-24 object-cover rounded-md bg-gray-200 dark:bg-gray-700"/>
                                <div className="flex-grow space-y-2">
                                     <div>
                                        <label className="text-xs">Upload Image</label>
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-xs">Alt Text (AR)</label><Input {...register(`whyNewHeliopolis.images.${index}.alt.ar`)} /></div>
                                        <div><label className="text-xs">Alt Text (EN)</label><Input {...register(`whyNewHeliopolis.images.${index}.alt.en`)} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                 <Button type="button" variant="secondary" className="mt-4" onClick={() => appendImage({ src: '', alt: { ar: '', en: '' } })}>Add Image</Button>
            </div>
        </div>
    );
};

export default ContentWhyNewHeliopolisPage;