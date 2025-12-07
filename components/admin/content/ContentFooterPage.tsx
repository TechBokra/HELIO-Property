
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentFooterPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold">Footer Content</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium">Description (AR)</label>
                    <Textarea {...register('footer.ar.description')} rows={4} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Description (EN)</label>
                    <Textarea {...register('footer.en.description')} rows={4} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Address (AR)</label>
                    <Input {...register('footer.ar.address')} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Address (EN)</label>
                    <Input {...register('footer.en.address')} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Working Hours (AR)</label>
                    <Input {...register('footer.ar.hours')} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Working Hours (EN)</label>
                    <Input {...register('footer.en.hours')} />
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium">Phone Number</label>
                    <Input {...register('footer.phone')} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Email</label>
                    <Input type="email" {...register('footer.email')} />
                </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                 <h4 className="font-semibold mb-2">Social Media Links</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium">Facebook URL</label><Input {...register('footer.social.facebook')} /></div>
                    <div><label className="block text-xs font-medium">Twitter URL</label><Input {...register('footer.social.twitter')} /></div>
                    <div><label className="block text-xs font-medium">Instagram URL</label><Input {...register('footer.social.instagram')} /></div>
                    <div><label className="block text-xs font-medium">LinkedIn URL</label><Input {...register('footer.social.linkedin')} /></div>
                 </div>
            </div>
        </div>
    );
};

export default ContentFooterPage;
