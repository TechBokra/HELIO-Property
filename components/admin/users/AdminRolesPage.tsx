
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Role, Permission } from '../../../types';
import { getRolePermissions, updateRolePermissions } from '../../../services/permissions';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Checkbox } from '../../ui/Checkbox';
import { Button } from '../../ui/Button';

const AdminRolesPage: React.FC = () => {
    const { t } = useLanguage();
    const t_admin = t.adminDashboard;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: initialPermissions, isLoading } = useQuery({
        queryKey: ['rolePermissions'],
        queryFn: getRolePermissions,
    });

    const [permissionsMap, setPermissionsMap] = useState<Map<Role, Permission[]>>(new Map());

    useEffect(() => {
        if (initialPermissions) {
            setPermissionsMap(new Map(initialPermissions.entries()));
        }
    }, [initialPermissions]);

    const mutation = useMutation({
        mutationFn: updateRolePermissions,
        onSuccess: () => {
            showToast('Permissions updated successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
        },
        onError: () => {
            showToast('Failed to update permissions.', 'error');
        },
    });

    const handlePermissionChange = (role: Role, permission: Permission, isChecked: boolean) => {
        setPermissionsMap((prevMap) => {
            const newMap = new Map(prevMap);
            const currentPermissions = (newMap.get(role) || []) as Permission[];
            if (isChecked) {
                if (!currentPermissions.includes(permission)) {
                    newMap.set(role, [...currentPermissions, permission]);
                }
            } else {
                newMap.set(role, currentPermissions.filter((p) => p !== permission));
            }
            return newMap;
        });
    };

    const handleSave = () => {
        mutation.mutate(permissionsMap);
    };

    if (isLoading) return <div>Loading roles and permissions...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t_admin.nav.rolesAndPermissions}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage permissions for each user role.</p>
                </div>
                <Button onClick={handleSave} isLoading={mutation.isPending}>
                    Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(permissionsMap.keys())
                    .filter((role) => role !== Role.SUPER_ADMIN)
                    .map((role: Role) => {
                        const roleKey = (Object.keys(Role) as Array<keyof typeof Role>).find((key) => Role[key] === role);
                        return (
                            <Card key={role}>
                                <CardHeader>
                                    <CardTitle className="capitalize text-amber-600">
                                        {t_admin.partnerTypes[role as keyof typeof t_admin.partnerTypes]}
                                    </CardTitle>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 pt-1">
                                        {roleKey
                                            ? t_admin.roleDescriptions[
                                                  roleKey as keyof typeof t_admin.roleDescriptions
                                              ]
                                            : ''}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                                    {Object.values(Permission).map((permission) => (
                                        <div key={permission} className="flex items-center gap-3">
                                            <Checkbox
                                                id={`${role}-${permission}`}
                                                checked={(permissionsMap.get(role) || []).includes(permission)}
                                                onCheckedChange={(checked) =>
                                                    handlePermissionChange(role, permission, !!checked)
                                                }
                                            />
                                            <label
                                                htmlFor={`${role}-${permission}`}
                                                className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                                {(permission as string).replace(/_/g, ' ').toLowerCase()}
                                            </label>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        );
                    })}
            </div>
        </div>
    );
};

export default AdminRolesPage;
