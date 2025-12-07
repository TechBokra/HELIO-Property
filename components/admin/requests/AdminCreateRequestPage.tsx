

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { RequestType } from '../../../types';
import { addRequest } from '../../../services/requests';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { ArrowLeftIcon, ClipboardDocumentListIcon } from '../../ui/Icons';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';

const AdminCreateRequestPage: React.FC = () => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
        defaultValues: {
            type: RequestType.LEAD,
            name: '',
            phone: '',
            email: '',
            // Lead specific
            serviceType: 'finishing',
            serviceTitle: '',
            notes: '',
            // Inquiry/Contact specific
            details: '',
            message: ''
        }
    });
    
    const selectedType = watch('type');

    const mutation = useMutation({
        mutationFn: (data: any) => {
            const { type, name, phone, email, ...rest } = data;
            
            let payload = {};
            if (type === RequestType.LEAD) {
                payload = {
                    serviceType: rest.serviceType,
                    serviceTitle: rest.serviceTitle,
                    customerNotes: rest.notes,
                    contactTime: 'Any time',
                    customerName: name,
                    customerPhone: phone,
                    // Assignment will be handled by the backend service logic based on rules
                };
            } else if (type === RequestType.PROPERTY_INQUIRY) {
                payload = { details: rest.details, customerName: name, customerPhone: phone };
            } else if (type === RequestType.CONTACT_MESSAGE) {
                 payload = { message: rest.message, inquiryType: 'client', name: name, phone: phone };
            }
            
            return addRequest(type, {
                requesterInfo: { name, phone, email },
                payload
            });
        },
        onSuccess: () => {
            showToast('Request created successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['allRequests'] });
            navigate('/admin/requests');
        },
        onError: () => {
            showToast('Failed to create request', 'error');
        }
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="mb-6">
                <Link to="/admin/requests" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t.adminShared.backToRequests}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Request</h1>
                <p className="text-gray-500 dark:text-gray-400">Manually add a new lead, inquiry, or message to the system.</p>
            </div>

            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <ClipboardDocumentListIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <CardTitle>Request Information</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        
                        <FormField label="Request Type" id="type">
                            <select {...register('type')} className={selectClasses}>
                                <option value={RequestType.LEAD}>Service Lead (Finishing/Decor)</option>
                                <option value={RequestType.PROPERTY_INQUIRY}>Property Inquiry (Buyer)</option>
                                <option value={RequestType.CONTACT_MESSAGE}>General Message</option>
                            </select>
                        </FormField>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Requester Name" id="name">
                                <Input {...register('name', { required: true })} placeholder="Full Name" />
                            </FormField>
                             <FormField label="Phone Number" id="phone">
                                <Input {...register('phone', { required: true })} placeholder="+20..." dir="ltr" />
                            </FormField>
                        </div>
                        
                        <FormField label="Email (Optional)" id="email">
                            <Input {...register('email')} placeholder="client@example.com" type="email" />
                        </FormField>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Details</h3>
                            
                            {selectedType === RequestType.LEAD && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField label="Service Type" id="serviceType">
                                            <select {...register('serviceType')} className={selectClasses}>
                                                <option value="finishing">Finishing</option>
                                                <option value="decorations">Decorations</option>
                                                <option value="property">Property</option>
                                            </select>
                                        </FormField>
                                        <FormField label="Title / Subject" id="serviceTitle">
                                            <Input {...register('serviceTitle', { required: true })} placeholder="e.g. Apartment Finishing in 5th Settlement" />
                                        </FormField>
                                    </div>
                                    <FormField label="Notes & Requirements" id="notes">
                                        <Textarea {...register('notes')} rows={4} placeholder="Enter detailed request requirements..." />
                                    </FormField>
                                </div>
                            )}

                            {selectedType === RequestType.PROPERTY_INQUIRY && (
                                <div className="animate-fadeIn">
                                    <FormField label="Requirements Details" id="details">
                                        <Textarea {...register('details', { required: true })} rows={5} placeholder="Looking for 3 bedrooms apartment in..." />
                                    </FormField>
                                </div>
                            )}

                            {selectedType === RequestType.CONTACT_MESSAGE && (
                                 <div className="animate-fadeIn">
                                    <FormField label="Message Content" id="message">
                                        <Textarea {...register('message', { required: true })} rows={5} placeholder="Type message here..." />
                                    </FormField>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                             <Button type="button" variant="secondary" onClick={() => navigate('/admin/requests')}>
                                {t.adminShared.cancel}
                            </Button>
                            <Button type="submit" isLoading={isSubmitting} className="min-w-[120px]">
                                {t.adminShared.save} Request
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminCreateRequestPage;