

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { TrashIcon, ArrowUpIcon, ArrowDownIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentSocialProofPage: React.FC = () => {
    const { register, control } = useOutletContext<ContentFormContext>();
    const { fields, append, remove, swap } = useFieldArray({ control, name: 'socialProof.stats' });

    return (
        <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold">Social Proof Section</h3>
            <div className="flex items-center gap-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
                <input type="checkbox" {...register('socialProof.enabled')} className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500" />
                <label className="font-medium">Enable Social Proof section on homepage</label>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-2">Stats</h4>
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md space-y-3 relative bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex justify-end gap-1 absolute top-2 right-2">
                                <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index - 1)} disabled={index === 0}><ArrowUpIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index + 1)} disabled={index === fields.length - 1}><ArrowDownIcon className="w-4 h-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium">Value (e.g., "150+")</label><Input {...register(`socialProof.stats.${index}.value`)} /></div>
                                <div><label className="block text-sm font-medium">Name (AR)</label><Input {...register(`socialProof.stats.${index}.name.ar`)} /></div>
                                <div><label className="block text-sm font-medium">Name (EN)</label><Input {...register(`socialProof.stats.${index}.name.en`)} /></div>
                            </div>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="secondary" className="mt-4" onClick={() => append({ value: '', name: { ar: '', en: '' } })}>
                    Add Stat
                </Button>
            </div>
        </div>
    );
};

export default ContentSocialProofPage;