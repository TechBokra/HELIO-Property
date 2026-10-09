import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Modal, ModalHeader, ModalContent } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useLanguage } from '../../shared/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../shared/ToastContext';
import { Role } from '../../../types';
import type { AdminPartner } from '../../../types';
import { 
    adminResetPassword, 
    sendPasswordResetEmail, 
    forcePasswordChangeOnNextLogin,
    getCredentialAuditLogs,
    type CredentialAuditEntry
} from '../../../services/credentials';
import { 
    KeyIcon, 
    ShieldCheckIcon, 
    PaperAirplaneIcon, 
    ExclamationTriangleIcon,
    ClockIcon,
    CheckCircleIcon
} from '../../ui/Icons';

interface PasswordManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: AdminPartner | null;
}

export const PasswordManagementModal: React.FC<PasswordManagementModalProps> = ({
    isOpen,
    onClose,
    user
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { currentUser } = useAuth();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<'reset' | 'email' | 'force' | 'audit'>('reset');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [forceChangeNextLogin, setForceChangeNextLogin] = useState(true);
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);

    // Fetch user-specific credential audit logs
    const { data: auditLogs, refetch: refetchAudit, isLoading: loadingAudit } = useQuery({
        queryKey: ['credentialAudit', user?.id],
        queryFn: () => user ? getCredentialAuditLogs(user.id) : Promise.resolve([]),
        enabled: isOpen && !!user,
    });

    // Reset password mutation
    const resetMutation = useMutation({
        mutationFn: async () => {
            if (!user || !currentUser) throw new Error('Missing user information');
            if (newPassword !== confirmPassword) {
                throw new Error(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
            }
            if (newPassword.length < 6) {
                throw new Error(isAr ? 'يجب أن لا تقل كلمة المرور عن 6 أحرف' : 'Password must be at least 6 characters');
            }
            return adminResetPassword(
                { id: user.id, email: user.email, role: user.role, name: user.name },
                newPassword,
                { id: currentUser.id, name: currentUser.name, role: currentUser.role },
                forceChangeNextLogin
            );
        },
        onSuccess: (data) => {
            showToast(data.message, 'success');
            setNewPassword('');
            setConfirmPassword('');
            setConfirmResetOpen(false);
            refetchAudit();
            onClose();
        },
        onError: (err: any) => {
            showToast(err?.message || (isAr ? 'فشل تعيين كلمة المرور' : 'Failed to reset password'), 'error');
            setConfirmResetOpen(false);
        }
    });

    // Send reset email mutation
    const sendEmailMutation = useMutation({
        mutationFn: async () => {
            if (!user || !currentUser) throw new Error('Missing user information');
            return sendPasswordResetEmail(
                user.email,
                user.id,
                { id: currentUser.id, name: currentUser.name, role: currentUser.role }
            );
        },
        onSuccess: (data) => {
            showToast(data.message, 'success');
            refetchAudit();
        },
        onError: (err: any) => {
            showToast(err?.message || (isAr ? 'فشل إرسال رابط إعادة التعيين' : 'Failed to send reset email'), 'error');
        }
    });

    // Force password change mutation
    const forceChangeMutation = useMutation({
        mutationFn: async () => {
            if (!user || !currentUser) throw new Error('Missing user information');
            return forcePasswordChangeOnNextLogin(
                user.id,
                user.email,
                { id: currentUser.id, name: currentUser.name, role: currentUser.role }
            );
        },
        onSuccess: (data) => {
            showToast(data.message, 'success');
            refetchAudit();
        },
        onError: (err: any) => {
            showToast(err?.message || (isAr ? 'فشل إلزام تغيير كلمة المرور' : 'Failed to enforce change'), 'error');
        }
    });

    if (!user) return null;

    // Privilege escalation protection check
    const isTargetSuperAdmin = user.role === Role.SUPER_ADMIN;
    const isActorSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;
    const cannotModifyTarget = isTargetSuperAdmin && !isActorSuperAdmin;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            aria-labelledby="cred-management-title"
        >
            <ModalHeader onClose={onClose} id="cred-management-title">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                        <KeyIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isAr ? 'إدارة بيانات الاعتماد والأمان' : 'User Credential Management'}
                        </h2>
                        <p className="text-xs text-gray-500 font-normal">
                            {user.name} ({user.email})
                        </p>
                    </div>
                </div>
            </ModalHeader>
            <ModalContent>
                <div className="space-y-6">
                {/* User Summary Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img 
                            src={user.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120'} 
                            alt={user.name} 
                            className="w-12 h-12 rounded-full object-cover border border-amber-500/30"
                        />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {isAr && user.nameAr ? user.nameAr : user.name}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 capitalize mt-0.5">
                                {user.role || user.type}
                            </p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {user.status}
                    </span>
                </div>

                {/* Role Warning if Privilege Escalation Protection Triggers */}
                {cannotModifyTarget && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 text-red-800 dark:text-red-300 text-xs">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 text-red-600" />
                        <div>
                            <p className="font-bold">
                                {isAr ? 'حماية الحسابات الإدارية العليا' : 'Privilege Escalation Protection'}
                            </p>
                            <p className="mt-0.5">
                                {isAr 
                                    ? 'هذا المستخدم يمتلك صلاحية المدير العام (Super Admin). لا يمكن تعديل بيانات اعتماده إلا بواسطة مدير عام آخر.'
                                    : 'This user holds Super Admin privileges. Only another Super Admin can manage credentials for this account.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => setActiveTab('reset')}
                        className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                            activeTab === 'reset'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {isAr ? 'تعيين كلمة مرور' : 'Set New Password'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('email')}
                        className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                            activeTab === 'email'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {isAr ? 'إرسال رابط بالبريد' : 'Send Reset Link'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('force')}
                        className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                            activeTab === 'force'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {isAr ? 'إلزام بتغيير الكلمة' : 'Force Change'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('audit')}
                        className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                            activeTab === 'audit'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {isAr ? 'سجل العمليات الأمني' : 'Security Audit'}
                    </button>
                </div>

                {/* Tab 1: Direct Password Reset */}
                {activeTab === 'reset' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            {isAr 
                                ? 'قم بتعيين كلمة مرور مباشرة للمستخدم. لن يتم حفظ كلمة المرور في المتصفح أو في سجلات النظام.'
                                : 'Directly assign a new password for the user. Credentials remain strictly server-side.'}
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                                </label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={cannotModifyTarget}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                                </label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={cannotModifyTarget}
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-2">
                                <input
                                    type="checkbox"
                                    checked={forceChangeNextLogin}
                                    onChange={(e) => setForceChangeNextLogin(e.target.checked)}
                                    disabled={cannotModifyTarget}
                                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                    {isAr 
                                        ? 'إلزام المستخدم بتغيير كلمة المرور فور تسجيل دخوله القادم (موصى به)'
                                        : 'Force user to change password on next login (Recommended)'}
                                </span>
                            </label>
                        </div>

                        {!confirmResetOpen ? (
                            <Button
                                className="w-full mt-4 flex items-center justify-center gap-2"
                                disabled={cannotModifyTarget || newPassword.length < 6 || newPassword !== confirmPassword}
                                onClick={() => setConfirmResetOpen(true)}
                            >
                                <KeyIcon className="w-4 h-4" />
                                {isAr ? 'متابعة تعيين كلمة المرور' : 'Proceed to Set Password'}
                            </Button>
                        ) : (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 rounded-xl space-y-3">
                                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                    {isAr 
                                        ? `هل أنت متأكد من تعيين كلمة المرور الجديدة للمستخدم "${user.name}"؟`
                                        : `Confirm updating password for user "${user.name}"?`}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        className="flex-1 text-xs"
                                        onClick={() => setConfirmResetOpen(false)}
                                    >
                                        {isAr ? 'إلغاء' : 'Cancel'}
                                    </Button>
                                    <Button
                                        className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                        isLoading={resetMutation.isPending}
                                        onClick={() => resetMutation.mutate()}
                                    >
                                        {isAr ? 'تأكيد التغيير الآن' : 'Confirm Update Now'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Send Password Reset Email */}
                {activeTab === 'email' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <div className="flex items-start gap-3">
                                <PaperAirplaneIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                                        {isAr ? 'إرسال رابط آمن للبريد الإلكتروني' : 'Send Secure Reset Link via Email'}
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        {isAr 
                                            ? `سيتم إرسال رابط رسمي ومشفّر إلى البريد (${user.email}) لتمكين المستخدم من تعيين كلمة مروره بنفسه.`
                                            : `A secure reset link will be dispatched to (${user.email}) allowing the user to self-reset.`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full flex items-center justify-center gap-2"
                            isLoading={sendEmailMutation.isPending}
                            disabled={cannotModifyTarget}
                            onClick={() => sendEmailMutation.mutate()}
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            {isAr ? 'إرسال رابط استعادة كلمة المرور الآن' : 'Send Password Reset Email'}
                        </Button>
                    </div>
                )}

                {/* Tab 3: Force Password Change on Next Login */}
                {activeTab === 'force' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            {isAr 
                                ? 'سيتم وسم حساب المستخدم ليُطلب منه تغيير كلمة المرور إجبارياً فور تسجيل دخوله القادم.'
                                : 'Flag this account to mandate a password change immediately upon next login.'}
                        </p>

                        <Button
                            variant="secondary"
                            className="w-full flex items-center justify-center gap-2 border-amber-300 hover:bg-amber-50"
                            isLoading={forceChangeMutation.isPending}
                            disabled={cannotModifyTarget}
                            onClick={() => forceChangeMutation.mutate()}
                        >
                            <ShieldCheckIcon className="w-4 h-4 text-amber-600" />
                            {isAr ? 'تفعيل الإلزام بتغيير كلمة المرور' : 'Enforce Password Change on Next Login'}
                        </Button>
                    </div>
                )}

                {/* Tab 4: Security Audit Log */}
                {activeTab === 'audit' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <ClockIcon className="w-4 h-4 text-gray-500" />
                                {isAr ? 'العمليات الأمنية المسجلة لهذا المستخدم' : 'Security Log for this User'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {isAr ? 'بدون تخزين أسرار' : 'Zero Secrets Stored'}
                            </span>
                        </div>

                        {loadingAudit ? (
                            <p className="text-xs text-gray-500 text-center py-4">
                                {isAr ? 'جاري تحميل السجل...' : 'Loading audit entries...'}
                            </p>
                        ) : !auditLogs || auditLogs.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                                {isAr ? 'لا توجد حركات أمنية مسجلة لهذا الحساب بعد.' : 'No credential audit events recorded for this user yet.'}
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {auditLogs.map((entry) => (
                                    <div 
                                        key={entry.id} 
                                        className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 text-xs flex items-start justify-between gap-3"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${entry.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {entry.action}
                                                </span>
                                            </div>
                                            <p className="text-gray-500">
                                                {isAr ? 'بواسطة:' : 'By:'} {entry.actorName}
                                            </p>
                                            {entry.details && (
                                                <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                                                    {entry.details}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {new Date(entry.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            </ModalContent>
        </Modal>
    );
};
