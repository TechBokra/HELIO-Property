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
import { useCityStore } from '../../../store/useCityStore';

interface UserFormData {
    nameAr: string;
    nameEn: string;
    email: string;
    password?: string;
    type: PartnerType;
    status: PartnerStatus;
    allowedCities?: string[];
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
    const [selectedCities, setSelectedCities] = useState<string[]>(['heliopolis']);
    const cities = useCityStore((s) => s.cities);
    const queryClient = useQueryClient();
    
    const { data: userToEdit, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => getPartnerById(userId!),
        enabled: isEdit
    });

    const isTargetSuperAdmin = (userToEdit as any)?.role === Role.SUPER_ADMIN;
    const isActorSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;
    const cannotModifyTarget = isEdit && isTargetSuperAdmin && !isActorSuperAdmin;

    const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>();

    useEffect(() => {
        if (userToEdit) {
            const user = userToEdit as any;
            reset({
                nameAr: user.nameAr || user.name,
                nameEn: user.name,
                email: user.email,
                type: user.type,
                status: user.status,
            });
            if (Array.isArray(user.allowedCities) && user.allowedCities.length > 0) {
                setSelectedCities(user.allowedCities);
            } else if (user.role === Role.SUPER_ADMIN) {
                setSelectedCities(['*']);
            } else {
                setSelectedCities(['heliopolis']);
            }
        }
    }, [userToEdit, reset]);

    const toggleAllowedCity = (cityId: string) => {
        if (cityId === '*') {
            setSelectedCities(prev => prev.includes('*') ? ['heliopolis'] : ['*']);
            return;
        }
        setSelectedCities(prev => {
            const withoutWildcard = prev.filter(c => c !== '*');
            if (withoutWildcard.includes(cityId)) {
                const next = withoutWildcard.filter(c => c !== cityId);
                return next.length > 0 ? next : ['heliopolis'];
            }
            return [...withoutWildcard, cityId];
        });
    };

    const addMutation = useMutation({
        mutationFn: (data: Omit<UserFormData, 'status'>) => addInternalUser({
            name: data.nameEn,
            nameAr: data.nameAr,
            email: data.email,
            password: data.password,
            type: data.type,
            allowedCities: selectedCities
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
            status: data.updates.status,
            allowedCities: selectedCities
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

        if (['super_admin', 'admin', 'system_admin'].includes(data.type as string) && !isActorSuperAdmin) {
            showToast(isAr ? 'لا يمكنك تعيين صلاحيات إدارية عليا' : 'Cannot assign Super Admin role', 'error');
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
        if (['developer', 'agency', 'finishing', 'customer', 'developer_partner', 'finishing_partner', 'agency_partner', 'admin', 'system_admin'].includes(key)) {
            return false;
        }
        if (key === 'super_admin' && !isActorSuperAdmin) {
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

                        {/* Multi-City Authorized Portals Section */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white">
                                    {isAr ? 'المدن والبوابات الفرعية المصرح بإدارتها (Only Property Ecosystem)' : 'Authorized City Subdomain Portals'}
                                </label>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {isAr
                                        ? 'حدد المدن التي يحق لهذا المدير أو الموظف الوصول لبياناتها وإدارتها عبر النطاقات الفرعية'
                                        : 'Select which city portals this manager account is authorized to access and administer'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    selectedCities.includes('*')
                                        ? 'bg-amber-50 border-amber-400 text-amber-950 dark:bg-amber-900/30 dark:border-amber-500 dark:text-white'
                                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedCities.includes('*')}
                                        onChange={() => toggleAllowedCity('*')}
                                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <span className="text-xs font-extrabold block">
                                            {isAr ? 'كل المدن (صلاحية شاملة *)' : 'All Cities (Global Access *)'}
                                        </span>
                                        <span className="text-[11px] text-gray-500 font-mono">*.only-property.com</span>
                                    </div>
                                </label>

                                {cities.map(city => {
                                    const isChecked = selectedCities.includes('*') || selectedCities.includes(city.id);
                                    return (
                                        <label
                                            key={city.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                isChecked
                                                    ? 'bg-amber-50/70 border-amber-300 text-gray-900 dark:bg-amber-900/20 dark:border-amber-600 dark:text-white'
                                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                disabled={selectedCities.includes('*')}
                                                onChange={() => toggleAllowedCity(city.id)}
                                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                                            />
                                            <div>
                                                <span className="text-xs font-bold block">{city.name[language]}</span>
                                                <span className="text-[11px] text-gray-500 font-mono" dir="ltr">{city.subdomain}</span>
                                            </div>
                                        </label>
                                    );
                                })}
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