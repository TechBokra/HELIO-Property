import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminPartner, PartnerType, PartnerStatus } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { addInternalUser, updateUser, getPartnerById } from '../../../services/partners';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { ArrowLeftIcon, ShieldCheckIcon } from '../../ui/Icons';

interface UserFormData {
    nameAr: string;
    nameEn: string;
    email: string;
    password?: string;
    type: PartnerType;
    status: PartnerStatus;
}

const AdminUserFormPage: React.FC = () => {
    const { userId } = useParams();
    const isEdit = !!userId;
    const navigate = useNavigate();
    const { t } = useLanguage();
    const t_admin = t.adminDashboard;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const { data: userToEdit, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => getPartnerById(userId!),
        enabled: isEdit
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>();

    useEffect(() => {
        if (userToEdit) {
            // Cast to any or AdminPartner to access specific admin fields if necessary
            const user = userToEdit as any;
            reset({
                nameAr: user.nameAr || user.name,
                nameEn: user.name,
                email: user.email,
                type: user.type,
                status: user.status,
            });
        }
    }, [userToEdit, reset]);

    const addMutation = useMutation({
        mutationFn: (data: Omit<UserFormData, 'status'>) => addInternalUser({
            name: data.nameEn,
            nameAr: data.nameAr,
            email: data.email,
            password: data.password,
            type: data.type
        }),
        onSuccess: () => {
            showToast('User added successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            navigate('/admin/users');
        },
        onError: () => showToast('Failed to add user.', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { userId: string, updates: UserFormData }) => updateUser(data.userId, {
            name: data.updates.nameEn,
            nameAr: data.updates.nameAr,
            email: data.updates.email,
            type: data.updates.type,
            status: data.updates.status
        }),
        onSuccess: () => {
            showToast('User updated successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            navigate('/admin/users');
        },
        onError: () => showToast('Failed to update user.', 'error'),
    });

    const onSubmit = (data: UserFormData) => {
        if (isEdit && userId) {
            updateMutation.mutate({ userId: userId, updates: data });
        } else {
            addMutation.mutate(data);
        }
    };
    
    const isSubmitting = addMutation.isPending || updateMutation.isPending;
    const partnerTypes = Object.entries(t_admin.partnerTypes).filter(([key]) => !['developer', 'agency', 'finishing'].includes(key));

    if (isEdit && isLoading) return <div>Loading user...</div>;

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="mb-6">
                <Link to="/admin/users" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Users
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {isEdit ? t_admin.userManagement.editUser : t_admin.userManagement.addUser}
                </h1>
            </div>

            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <ShieldCheckIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <CardTitle>User Information</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t_admin.userManagement.form.nameAr}</label>
                                <Input {...register('nameAr', { required: true })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t_admin.userManagement.form.nameEn}</label>
                                <Input {...register('nameEn', { required: true })} />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input type="email" {...register('email', { required: true })} />
                        </div>
                        
                        {!isEdit && (
                            <div>
                                <label className="block text-sm font-medium mb-1">{t_admin.userManagement.form.password}</label>
                                <Input type="password" {...register('password')} />
                                <p className="text-xs text-gray-500 mt-1">{t_admin.userManagement.form.passwordHelp}</p>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t_admin.userManagement.role}</label>
                                <Select {...register('type')}>
                                    {partnerTypes.map(([key, value]) => <option key={key} value={key}>{value as string}</option>)}
                                </Select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">{t_admin.userManagement.status}</label>
                                <Select {...register('status')}>
                                    <option value="active">Active</option>
                                    <option value="disabled">Disabled</option>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 gap-3">
                            <Button variant="secondary" onClick={() => navigate('/admin/users')} type="button">{t.adminShared.cancel}</Button>
                            <Button type="submit" isLoading={isSubmitting}>{t.adminShared.save}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminUserFormPage;