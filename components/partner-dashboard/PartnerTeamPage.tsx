
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getTeamMembers, deleteTeamMember } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { UserPlusIcon, UsersIcon } from '../ui/Icons';
import { AdminPartner } from '../../types';
import ConfirmationModal from '../shared/ConfirmationModal';

const PartnerTeamPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { language, t } = useLanguage();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const t_dash = t.dashboard;

    const { data: teamMembers, isLoading } = useQuery({
        queryKey: ['teamMembers', currentUser?.id],
        queryFn: () => getTeamMembers(currentUser!.id),
        enabled: !!currentUser
    });

    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

    const deleteMutation = useMutation({
        mutationFn: deleteTeamMember,
        onSuccess: () => {
            showToast('Team member removed', 'success');
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            setMemberToDelete(null);
        }
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {language === 'ar' ? 'إدارة الفريق' : 'Team Management'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {language === 'ar' ? 'إدارة الموظفين وصلاحياتهم.' : 'Manage staff members and their permissions.'}
                    </p>
                </div>
                <Link to="/dashboard/team/new">
                    <Button className="flex items-center gap-2">
                        <UserPlusIcon className="w-5 h-5" />
                        {language === 'ar' ? 'إضافة عضو' : 'Add Member'}
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="w-6 h-6 text-amber-500" />
                        {language === 'ar' ? 'أعضاء الفريق' : 'Team Members'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                                    <TableHead>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                                    <TableHead>{language === 'ar' ? 'الصلاحيات' : 'Permissions'}</TableHead>
                                    <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center p-4">Loading...</TableCell></TableRow>
                                ) : (teamMembers || []).length > 0 ? (
                                    teamMembers?.map((member: AdminPartner) => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">{language === 'ar' ? member.nameAr : member.name}</TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell>
                                                {member.customPermissions && member.customPermissions.length > 0 ? (
                                                    <span className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded text-gray-600">
                                                        {member.customPermissions.length} Permissions
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Inherited (Full)</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Link to={`/dashboard/team/edit/${member.id}`}>
                                                        <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-50">
                                                            {t.adminShared.edit}
                                                        </Button>
                                                    </Link>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => setMemberToDelete(member.id)}
                                                    >
                                                        {t.adminShared.delete}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center p-8 text-gray-500">
                                            {language === 'ar' ? 'لا يوجد أعضاء في الفريق حالياً.' : 'No team members found.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             {memberToDelete && (
                <ConfirmationModal
                    isOpen={!!memberToDelete}
                    onClose={() => setMemberToDelete(null)}
                    onConfirm={() => deleteMutation.mutate(memberToDelete)}
                    title={t.adminShared.delete}
                    message={language === 'ar' ? 'هل أنت متأكد من حذف هذا العضو؟' : 'Are you sure you want to remove this member?'}
                />
            )}
        </div>
    );
};

export default PartnerTeamPage;
