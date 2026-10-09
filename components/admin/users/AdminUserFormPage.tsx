import React, { useEffect, useState } from 'react';
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
import { ArrowLeftIcon, ShieldCheckIcon, KeyIcon } from '../../ui/Icons';
import { useAuth } from '../../auth/AuthContext';
import { Permission, Role } from '../../../types';
import { PasswordManagementModal } from './PasswordManagementModal';

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
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const t_admin = t.adminDashboard;
    const { showToast } = useToast();
    const { hasPermission, currentUser } = useAuth();
    const canManageCredentials = hasPermission(Permission.MANAGE_USER_CREDENTIALS) || hasPermission(Permission.MANAGE_USERS);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const queryClient = useQueryClient();
    
    const { data: userToEdit, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => getPartnerById(userId!),
        enabled: isEdit
    });

    const isTargetSuperAdmin = (userToEdit as any)?.role === Role.SUPER_ADMIN || (userToEdit as any)?.type === 'admin' || (userToEdit as any)?.type === 'super_admin';
    const isActorSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;
    const cannotModifyTarget = isEdit && isTargetSuperAdmin && !isActorSuperAdmin;

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
        if (cannotModifyTarget) {
            showToast(isAr ? 'لا تملك صلاحية تعديل حساب المدير العام' : 'Privilege escalation rejected: Cannot edit Super Admin accounts', 'error');
            return;
        }

        if (['super_admin', 'admin', 'system_admin'].includes(data.type) && !isActorSuperAdmin) {
            showToast(isAr ? 'لا يمكنك تعيين صلاحيات إدارية عليا' : 'Cannot assign Super Admin or System Admin roles', 'error');
            return;
        }

        if (isEdit && userId) {
            updateMutation.mutate({ userId: userId, updates: data });
        } else {
            addMutation.mutate(data);
        }
    };
    
    const isSubmitting = addMutation.isPending || updateMutation.isPending;
    const partnerTypes = Object.entries(t_admin.partnerTypes).filter(([key]) => {
        if (['developer', 'agency', 'finishing', 'customer', 'developer_partner', 'finishing_partner', 'agency_partner'].includes(key)) {
            return false;
        }
        if (['super_admin', 'admin', 'system_admin'].includes(key) && !isActorSuperAdmin) {
            return false;
        }
        return true;
    });

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

            {cannotModifyTarget && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 text-sm">
                    <p className="font-bold">
                        {isAr ? 'حماية الحسابات الإدارية العليا' : 'Privilege Escalation Protection'}
                    </p>
                    <p className="mt-1 text-xs">
                        {isAr 
                            ? 'هذا المستخدم يمتلك صلاحية المدير العام (Super Admin). لا يمكن تعديل بياناته إلا بواسطة مدير عام آخر.'
                            : 'This user holds Super Admin privileges. Only a Super Admin can modify this account.'}
                    </p>
                </div>
            )}

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

                        {isEdit && canManageCredentials && userToEdit && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/50 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600">
                                        <KeyIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {isAr ? 'إدارة كلمة المرور وبيانات الاعتماد' : 'Password & Credential Management'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {isAr 
                                                ? 'إعادة تعيين كلمة المرور أو إرسال رابط استعادة أو فرض التغيير بصورة آمنة'
                                                : 'Securely reset password, dispatch reset link, or enforce next-login change'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 text-xs flex items-center gap-2"
                                    onClick={() => setIsPasswordModalOpen(true)}
                                >
                                    <KeyIcon className="w-4 h-4" />
                                    {isAr ? 'إدارة كلمة المرور' : 'Manage Password'}
                                </Button>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 gap-3">
                            <Button variant="secondary" onClick={() => navigate('/admin/users')} type="button">{t.adminShared.cancel}</Button>
                            <Button type="submit" isLoading={isSubmitting} disabled={cannotModifyTarget}>{t.adminShared.save}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {isEdit && userToEdit && isPasswordModalOpen && (
                <PasswordManagementModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                    user={userToEdit as AdminPartner}
                />
            )}
        </div>
    );
};

export default AdminUserFormPage;