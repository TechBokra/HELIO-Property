
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PartnerRequest, PartnerType, SubscriptionPlan, PartnerDisplayType, AdminPartner, PartnerStatus } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { addPartner, getPartnerById, updatePartnerAdmin } from '../../../services/partners';
import { getPlans } from '../../../services/plans';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { ArrowLeftIcon, UsersIcon, LockClosedIcon } from '../../ui/Icons';

const AdminPartnerFormPage: React.FC = () => {
    const { partnerId } = useParams();
    const isEdit = !!partnerId;
    const { t, language } = useLanguage();
    const t_admin = t.adminDashboard;
    const { showToast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
    
    // For Edit Mode: Fetch Partner
    const { data: partnerToEdit, isLoading: loadingPartner } = useQuery({
        queryKey: ['partner', partnerId],
        queryFn: () => getPartnerById(partnerId!),
        enabled: isEdit
    });

    const { register, handleSubmit, reset, watch, setValue } = useForm<Partial<PartnerRequest> & { displayType?: PartnerDisplayType, endDate?: string, password?: string }>({
        defaultValues: {
            companyType: 'agency',
            subscriptionPlan: 'basic',
            displayType: 'standard',
            status: 'approved'
        }
    });

    useEffect(() => {
        if (isEdit && partnerToEdit) {
            // Cast to any to access AdminPartner fields
            const p = partnerToEdit as AdminPartner;
            reset({
                companyName: language === 'ar' ? p.nameAr : p.name, 
                contactEmail: p.email,
                companyType: p.type,
                subscriptionPlan: p.subscriptionPlan,
                displayType: p.displayType,
                endDate: p.subscriptionEndDate?.split('T')[0],
                description: language === 'ar' ? p.descriptionAr : p.description
            });
        }
    }, [isEdit, partnerToEdit, reset, language]);

    const addMutation = useMutation({
        mutationFn: (data: PartnerRequest & { password?: string }) => addPartner(data, data.password),
        onSuccess: () => {
            showToast('Partner added successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            navigate('/admin/users'); // Redirect back to users if accessed from there, or partners list
        },
        onError: () => showToast('Failed to add partner.', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: (updates: Partial<AdminPartner> & { password?: string }) => updatePartnerAdmin(partnerId!, updates),
        onSuccess: () => {
            showToast('Partner updated successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            navigate('/admin/users');
        },
        onError: () => showToast('Failed to update partner.', 'error'),
    });

    const onSubmit = (data: any) => {
        if (isEdit) {
            const updates: any = {
                subscriptionPlan: data.subscriptionPlan,
                subscriptionEndDate: data.endDate || undefined,
                displayType: data.displayType,
                // Allow updating email and password
                contactEmail: data.contactEmail,
            };
            if (data.password) {
                updates.password = data.password;
            }
             updateMutation.mutate(updates);
        } else {
             const fullData = {
                ...data,
                id: `temp-${Date.now()}`,
                createdAt: new Date().toISOString(),
                documents: [],
                managementContacts: [],
                logo: 'https://via.placeholder.com/150',
                status: 'approved' as const
            };
            addMutation.mutate(fullData);
        }
    };

    const companyType = watch('companyType');
    const partnerTypes = ['developer', 'agency', 'finishing'];
    const availablePlans = plansData && companyType ? Object.keys(plansData[companyType as keyof typeof plansData] || {}) : ['basic', 'professional', 'elite', 'commission'];

    if (isEdit && loadingPartner) return <div>Loading Partner...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="mb-6">
                <Link to="/admin/users" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t.adminShared.backToList}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {isEdit ? t_admin.editPartnerTitle : "Add New Partner User"}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Business Details Card */}
                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <UsersIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                            </div>
                            <CardTitle>{isEdit ? (partnerToEdit as any)?.name : 'Business Details'}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!isEdit && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Company Name</label>
                                    <Input {...register('companyName', { required: true })} placeholder="e.g. Sunrise Developments" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <Textarea {...register('description')} rows={3} />
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t_admin.partnerTable.type}</label>
                                <Select {...register('companyType')} disabled={isEdit}>
                                    {partnerTypes.map(type => <option key={type} value={type}>{t_admin.partnerTypes[type as keyof typeof t_admin.partnerTypes]}</option>)}
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t_admin.partnerTable.subscriptionPlan}</label>
                                <Select {...register('subscriptionPlan')}>
                                    {availablePlans.map((plan: string) => <option key={plan} value={plan}>{plan}</option>)}
                                </Select>
                            </div>
                        </div>

                        {isEdit && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t_admin.updateSubscription}</label>
                                    <Input type="date" {...register('endDate')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t_admin.partnerTable.displayType}</label>
                                    <Select {...register('displayType')}>
                                        <option value="standard">{t_admin.partnerDisplayTypes.standard}</option>
                                        <option value="featured">{t_admin.partnerDisplayTypes.featured}</option>
                                        <option value="mega_project">{t_admin.partnerDisplayTypes.mega_project}</option>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Account Access Card */}
                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <LockClosedIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                            </div>
                            <CardTitle>Account Security</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Contact Email (Login ID)</label>
                                <Input type="email" {...register('contactEmail', { required: true })} placeholder="contact@company.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {isEdit ? 'Reset Password' : 'Initial Password'}
                                </label>
                                <Input 
                                    type="text" 
                                    {...register('password', { required: !isEdit, minLength: 6 })} 
                                    placeholder={isEdit ? "Leave blank to keep current" : "********"} 
                                />
                                {isEdit && <p className="text-xs text-gray-500 mt-1">Only enter a value if you want to change the user's password.</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 gap-3">
                    <Button variant="secondary" type="button" onClick={() => navigate('/admin/users')}>{t.adminShared.cancel}</Button>
                    <Button type="submit" isLoading={addMutation.isPending || updateMutation.isPending}>{t.adminShared.save}</Button>
                </div>
            </form>
        </div>
    );
};

export default AdminPartnerFormPage;
