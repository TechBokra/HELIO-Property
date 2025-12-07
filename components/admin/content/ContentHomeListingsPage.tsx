
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { SiteContent } from '../../../types';
import { Input } from '../../ui/Input';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

type ContentFormContext = UseFormReturn<SiteContent>;

const ContentHomeListingsPage: React.FC = () => {
    const { register } = useOutletContext<ContentFormContext>();

    return (
        <div className="space-y-6 animate-fadeIn">
             <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle>Latest Properties Section</CardTitle>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Checkbox id="listings-enabled" {...register('homeListings.enabled')} />
                            <label htmlFor="listings-enabled" className="font-medium cursor-pointer text-sm">Enable Section</label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium mb-1">Number of items to show</label>
                        <Input type="number" {...register('homeListings.count', { valueAsNumber: true })} className="max-w-xs" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Arabic Content</h4>
                            <div>
                                <label className="block text-sm font-medium mb-1">Section Title</label>
                                <Input {...register('homeListings.ar.title')} dir="rtl" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">English Content</h4>
                            <div>
                                <label className="block text-sm font-medium mb-1">Section Title</label>
                                <Input {...register('homeListings.en.title')} dir="ltr" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ContentHomeListingsPage;
