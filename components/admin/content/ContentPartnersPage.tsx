


import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Checkbox } from '../../ui/Checkbox';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentPartnersPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold">Partners Section</h3>

            <div className="flex items-center gap-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800/50">
                <Checkbox id="partners-enabled" {...register('partners.enabled')} />
                <label htmlFor="partners-enabled" className="font-medium cursor-pointer">Enable Partners section on homepage</label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium">Section Title (AR)</label>
                    <Input {...register('partners.ar.title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Section Title (EN)</label>
                    <Input {...register('partners.en.title')} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Section Description (AR)</label>
                    <Textarea {...register('partners.ar.description')} rows={2}/>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Section Description (EN)</label>
                    <Textarea {...register('partners.en.description')} rows={2}/>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium">"Major Developers" Title (AR)</label>
                    <Input {...register('partners.ar.mega_projects_title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">"Major Developers" Title (EN)</label>
                    <Input {...register('partners.en.mega_projects_title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">"City Developers" Title (AR)</label>
                    <Input {...register('partners.ar.developers_title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">"City Developers" Title (EN)</label>
                    <Input {...register('partners.en.developers_title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">"Finishing Companies" Title (AR)</label>
                    <Input {...register('partners.ar.finishing_companies_title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">"Finishing Companies" Title (EN)</label>
                    <Input {...register('partners.en.finishing_companies_title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">"Agencies" Title (AR)</label>
                    <Input {...register('partners.ar.agencies_title')} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">"Agencies" Title (EN)</label>
                    <Input {...register('partners.en.agencies_title')} />
                </div>
            </div>
        </div>
    );
};

export default ContentPartnersPage;