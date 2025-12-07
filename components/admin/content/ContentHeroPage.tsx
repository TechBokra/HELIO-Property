
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { TrashIcon, ArrowUpIcon, ArrowDownIcon, PhotoIcon, SparklesIcon } from '../../ui/Icons';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

type ContentFormContext = UseFormReturn<SiteContent>;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const ContentHeroPage: React.FC = () => {
    const { register, control, setValue } = useOutletContext<ContentFormContext>();
    const { fields, append, remove, swap } = useFieldArray({ control, name: 'hero.images' });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setValue(`hero.images.${index}.src`, base64, { shouldDirty: true });
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            
            {/* Hero Text Section */}
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <SparklesIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>Main Text Content</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Edit the headline and subtitle displayed over the slider.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Headline</label>
                            <Input {...register('hero.ar.title')} className="font-bold text-lg" dir="rtl" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Subtitle</label>
                            <Textarea {...register('hero.ar.subtitle')} rows={4} dir="rtl" />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                         <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Headline</label>
                            <Input {...register('hero.en.title')} className="font-bold text-lg" dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Subtitle</label>
                            <Textarea {...register('hero.en.subtitle')} rows={4} dir="ltr" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Hero Slider Section */}
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <PhotoIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                            </div>
                            <div>
                                <CardTitle>Background Slider Images</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">Manage the rotating background images. Upload high-quality images for best results.</p>
                            </div>
                        </div>
                        <Button 
                            type="button" 
                            onClick={() => append({ src: '', alt: { ar: '', en: '' } })}
                        >
                            Add New Slide
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {fields.map((field, index) => (
                        <div key={field.id} className="group relative bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-all hover:shadow-md">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={() => swap(index, index - 1)} disabled={index === 0}><ArrowUpIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="secondary" className="h-8 w-8" onClick={() => swap(index, index + 1)} disabled={index === fields.length - 1}><ArrowDownIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="danger" className="h-8 w-8" onClick={() => remove(index)}><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-1/3 shrink-0">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Preview (Slide {index + 1})</label>
                                    <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                                        <img 
                                            src={(field as any).src || 'https://via.placeholder.com/300x169?text=No+Image'} 
                                            alt="preview" 
                                            className="w-full h-full object-cover"
                                        />
                                        <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white font-semibold text-sm">
                                            Change Image
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, index)} />
                                        </label>
                                    </div>
                                    {!((field as any).src) && <p className="text-xs text-red-500 mt-1">* Image required</p>}
                                </div>
                                
                                <div className="flex-grow grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alt Text (Arabic) - For Accessibility</label>
                                        <Input {...register(`hero.images.${index}.alt.ar`)} placeholder="وصف الصورة" dir="rtl" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alt Text (English) - For Accessibility</label>
                                        <Input {...register(`hero.images.${index}.alt.en`)} placeholder="Image description" dir="ltr" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {fields.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                            <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No images added yet.</p>
                            <Button type="button" variant="link" onClick={() => append({ src: '', alt: { ar: '', en: '' } })}>Add your first image</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
export default ContentHeroPage;
