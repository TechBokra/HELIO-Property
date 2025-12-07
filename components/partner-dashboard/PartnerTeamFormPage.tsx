
import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { addTeamMember, getPartnerById, updateTeamMember } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ArrowLeftIcon, ShieldCheckIcon, UserPlusIcon } from '../ui/Icons';
import { rolePermissions } from '../../data/permissions';
import { Checkbox } from '../ui/Checkbox';
import { Permission } from '../../types';

interface TeamMemberFormData {
    name: string;
    email: string;
    password?: string;
    permissions: Permission[];
}

const PartnerTeamFormPage: React.FC = () => {
    const { memberId } = useParams();
    const isEdit = !!memberId;
    const { currentUser } = useAuth();
    const { language, t } = useLanguage();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Available permissions based on Parent's Role
    const availablePermissions = rolePermissions.get(currentUser?.role!) || [];

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TeamMemberFormData>({
        defaultValues: {
            permissions: []
        }
    });
    
    const selectedPermissions = watch('permissions') || [];

    const { data: memberToEdit, isLoading } = useQuery({
        queryKey: ['teamMember', memberId],
        queryFn: () => getPartnerById(memberId!),
        enabled: isEdit
    });

    useEffect(() => {
        if (memberToEdit) {
            reset({
                name: memberToEdit.name,
                email: memberToEdit.email,
                permissions: memberToEdit.customPermissions || []
            });
        } else if (!isEdit) {
             // Default to select all permissions for easier onboarding? Or none.
             // Let's select none to force conscious choice, or maybe some safe defaults.
        }
    }, [memberToEdit, reset, isEdit]);

    const addMutation = useMutation({
        mutationFn: (data: TeamMemberFormData) => 
            addTeamMember(currentUser!.id, {
                name: data.name,
                email: data.email,
                password: data.password!, // Required for new
                type: currentUser!.type,
                customPermissions: data.permissions
            }),
        onSuccess: () => {
            showToast(t.dashboard.teamManagement.addSuccess, 'success');
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            navigate('/dashboard/team');
        },
        onError: () => showToast(t.dashboard.teamManagement.addError, 'error')
    });

    const updateMutation = useMutation({
        mutationFn: (data: TeamMemberFormData) => 
            updateTeamMember(memberId!, {
                name: data.name,
                email: data.email,
                password: data.password,
                customPermissions: data.permissions
            }),
        onSuccess: () => {
            showToast(t.dashboard.teamManagement.updateSuccess, 'success');
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            navigate('/dashboard/team');
        },
        onError: () => showToast(t.dashboard.teamManagement.updateError, 'error')
    });

    const onSubmit = (data: TeamMemberFormData) => {
        if (isEdit) {
            updateMutation.mutate(data);
        } else {
            addMutation.mutate(data);
        }
    };
    
    const handlePermissionToggle = (perm: Permission) => {
        const current = selectedPermissions;
        const newPerms = current.includes(perm) 
            ? current.filter(p => p !== perm) 
            : [...current, perm];
        setValue('permissions', newPerms);
    };

    const handleSelectAll = () => {
        if (selectedPermissions.length === availablePermissions.length) {
            setValue('permissions', []);
        } else {
            setValue('permissions', availablePermissions);
        }
    };

    if (isEdit && isLoading) return <div className="p-8 text-center">Loading member details...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
             <div className="mb-6">
                <Link to="/dashboard/team" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t.dashboard.teamManagement.backToTeam}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {isEdit ? t.dashboard.teamManagement.editMember : t.dashboard.teamManagement.addMember}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <UserPlusIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                            </div>
                            <CardTitle>{t.dashboard.teamManagement.accountDetails}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t.dashboard.teamManagement.name}</label>
                            <Input {...register('name', { required: true })} placeholder="John Doe" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t.dashboard.teamManagement.email}</label>
                            <Input type="email" {...register('email', { required: true })} placeholder="john@company.com" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">
                                {isEdit ? t.dashboard.teamManagement.newPassword : t.dashboard.teamManagement.password}
                            </label>
                            <Input 
                                type="password" 
                                {...register('password', { required: !isEdit, minLength: 6 })} 
                                placeholder={isEdit ? t.dashboard.teamManagement.leaveBlank : "******"} 
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <ShieldCheckIcon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                                </div>
                                <div>
                                    <CardTitle>{t.dashboard.teamManagement.permissions}</CardTitle>
                                    <p className="text-sm text-gray-500 mt-1">{t.dashboard.teamManagement.permissionsSubtitle}</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" onClick={handleSelectAll} className="text-sm">
                                {selectedPermissions.length === availablePermissions.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availablePermissions.map(perm => (
                                <label key={perm} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPermissions.includes(perm) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-amber-300'}`}>
                                    <Checkbox 
                                        checked={selectedPermissions.includes(perm)}
                                        onCheckedChange={() => handlePermissionToggle(perm)}
                                        className="mt-1"
                                    />
                                    <div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">
                                            {perm.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </label>
                            ))}
                         </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/team')}>
                        {t.adminShared.cancel}
                    </Button>
                    <Button type="submit" isLoading={addMutation.isPending || updateMutation.isPending}>
                        {t.adminShared.save}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default PartnerTeamFormPage;
