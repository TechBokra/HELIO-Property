

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { TrashIcon, ArrowUpIcon, ArrowDownIcon } from '../../ui/Icons';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentQuotesPage: React.FC = () => {
    const { register, control } = useOutletContext<ContentFormContext>();
    const { fields, append, remove, swap } = useFieldArray({ control, name: 'quotes' });

    return (
        <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold">Wisdom Quotes</h3>
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md space-y-3 relative bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex justify-end gap-1 absolute top-2 right-2">
                            <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index - 1)} disabled={index === 0}><ArrowUpIcon className="w-4 h-4" /></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index + 1)} disabled={index === fields.length - 1}><ArrowDownIcon className="w-4 h-4" /></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Quote (AR)</label>
                                <Textarea {...register(`quotes.${index}.quote.ar`)} rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Quote (EN)</label>
                                <Textarea {...register(`quotes.${index}.quote.en`)} rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Author (AR)</label>
                                <Input {...register(`quotes.${index}.author.ar`)} />
                            </div>
                             <div>
                                <label className="block text-sm font-medium">Author (EN)</label>
                                <Input {...register(`quotes.${index}.author.en`)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <Button type="button" variant="secondary" onClick={() => append({ quote: { ar: '', en: '' }, author: { ar: '', en: '' } })}>
                Add Quote
            </Button>
        </div>
    );
};

export default ContentQuotesPage;