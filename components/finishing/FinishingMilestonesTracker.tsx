import React, { useState } from 'react';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    CheckCircleIcon, 
    ClockIcon, 
    ShieldCheckIcon, 
    WrenchScrewdriverIcon, 
    DocumentCheckIcon, 
    ChevronDownIcon, 
    ChevronUpIcon,
    ExclamationTriangleIcon
} from '../ui/Icons';
import type { FinishingProjectMilestone, FinishingMilestoneStatus, MilestonePaymentStatus } from '../../types';
import { updateProjectMilestone } from '../../services/finishing';
import { useToast } from '../shared/ToastContext';

interface FinishingMilestonesTrackerProps {
    requestId: string;
    milestones: FinishingProjectMilestone[];
    canManage?: boolean;
    onMilestoneUpdated?: () => void;
    userLabel?: string;
}

export const FinishingMilestonesTracker: React.FC<FinishingMilestonesTrackerProps> = ({
    requestId,
    milestones,
    canManage = false,
    onMilestoneUpdated,
    userLabel = 'Platform Finishing Engineer'
}) => {
    const { language } = useLanguage();
    const { showToast } = useToast();
    const isAr = language === 'ar';

    const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(
        milestones.find(m => m.status === 'in_progress')?.id || milestones[0]?.id || null
    );

    // Edit state
    const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
    const [editStatus, setEditStatus] = useState<FinishingMilestoneStatus>('in_progress');
    const [editProgress, setEditProgress] = useState<number>(50);
    const [editPaymentStatus, setEditPaymentStatus] = useState<MilestonePaymentStatus>('pending');
    const [editNotes, setEditNotes] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Calculate overall project progress
    const overallProgress = React.useMemo(() => {
        if (!milestones.length) return 0;
        const total = milestones.reduce((sum, m) => sum + (m.progressPercentage * (m.paymentPercentage / 100)), 0);
        return Math.round(total);
    }, [milestones]);

    const handleStartEdit = (m: FinishingProjectMilestone) => {
        setEditingMilestoneId(m.id);
        setEditStatus(m.status);
        setEditProgress(m.progressPercentage);
        setEditPaymentStatus(m.paymentStatus);
        setEditNotes(m.inspectorNotes || '');
    };

    const handleSaveMilestone = async (m: FinishingProjectMilestone) => {
        setIsSaving(true);
        try {
            await updateProjectMilestone(requestId, m.id, {
                status: editStatus,
                progressPercentage: editProgress,
                paymentStatus: editPaymentStatus,
                inspectorNotes: editNotes
            }, userLabel);

            showToast(isAr ? 'تم تحديث بيانات المرحلة بنجاح' : 'Milestone updated successfully', 'success');
            setEditingMilestoneId(null);
            onMilestoneUpdated?.();
        } catch {
            showToast(isAr ? 'حدث خطأ أثناء التحديث' : 'Failed to update milestone', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusBadge = (status: FinishingMilestoneStatus) => {
        switch (status) {
            case 'completed':
                return {
                    label: isAr ? 'مكتمل ومعتمد' : 'Completed & Verified',
                    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                };
            case 'in_progress':
                return {
                    label: isAr ? 'جاري التنفيذ حالياً' : 'In Progress',
                    bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 animate-pulse'
                };
            case 'delayed':
                return {
                    label: isAr ? 'متأخر عن الجدول' : 'Delayed',
                    bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                };
            default:
                return {
                    label: isAr ? 'قيد الانتظار' : 'Pending',
                    bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200'
                };
        }
    };

    const getPaymentBadge = (status: MilestonePaymentStatus) => {
        switch (status) {
            case 'paid':
                return {
                    label: isAr ? 'تم سداد الدفعة' : 'Payment Settled',
                    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200'
                };
            case 'due':
                return {
                    label: isAr ? 'دفعة مستحقة للصرف' : 'Payment Due',
                    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200'
                };
            default:
                return {
                    label: isAr ? 'دفعة مرحلية مؤجلة' : 'Phased Escrow',
                    color: 'text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200'
                };
        }
    };

    const getStageIcon = (stageNum: number) => {
        switch (stageNum) {
            case 1: return <DocumentCheckIcon className="w-5 h-5 text-blue-500" />;
            case 2: return <WrenchScrewdriverIcon className="w-5 h-5 text-amber-500" />;
            case 3: return <WrenchScrewdriverIcon className="w-5 h-5 text-emerald-500" />;
            case 4: return <WrenchScrewdriverIcon className="w-5 h-5 text-purple-500" />;
            default: return <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />;
        }
    };

    return (
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-white dark:bg-gray-800">
            {/* Header & Overall Project Progress */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="p-1.5 rounded-lg bg-amber-500 text-gray-950 font-bold text-xs">
                                <ClockIcon className="w-4 h-4" />
                            </span>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {isAr ? 'مراحل تنفيذ المشروع وجدول الاستلام' : 'Project Milestones & Delivery Schedule'}
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isAr
                                ? 'متابعة حية لنسب الإنجاز الهندسي، زيارات المعاينة، والدفعات المالية المرتبطة بالاستلام.'
                                : 'Live engineering execution progress, on-site inspection logs, and linked milestone payments.'}
                        </p>
                    </div>

                    <div className="sm:text-right bg-white dark:bg-gray-700/80 p-3 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm min-w-[160px]">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
                            {isAr ? 'نسبة الإنجاز الكلية' : 'Overall Completion'}
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end">
                            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {overallProgress}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 h-2 rounded-full mt-1.5 overflow-hidden">
                            <div 
                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${overallProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Milestones Stepper List */}
            <CardContent className="p-6 space-y-4">
                {milestones.map((m, idx) => {
                    const isExpanded = expandedMilestoneId === m.id;
                    const isEditing = editingMilestoneId === m.id;
                    const statusBadge = getStatusBadge(m.status);
                    const paymentBadge = getPaymentBadge(m.paymentStatus);

                    return (
                        <div 
                            key={m.id}
                            className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                                m.status === 'in_progress' 
                                    ? 'border-amber-400 dark:border-amber-600/70 bg-amber-50/10' 
                                    : m.status === 'completed'
                                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/5'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                        >
                            {/* Milestone Summary Row */}
                            <div 
                                onClick={() => setExpandedMilestoneId(isExpanded ? null : m.id)}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                            >
                                <div className="flex items-start sm:items-center gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-sm text-gray-700 dark:text-gray-300">
                                        {m.status === 'completed' ? (
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            getStageIcon(m.stageNumber)
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-bold text-gray-400">
                                                {isAr ? `المرحلة ${m.stageNumber}` : `Phase ${m.stageNumber}`}
                                            </span>
                                            <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                                                {m.title[language] || m.title.en}
                                            </h4>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                                            <span>
                                                {isAr ? `المدة المقدرة: ${m.targetDays} يوم` : `Target: ${m.targetDays} days`}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {isAr ? `الدفعة المرتبطة: ${m.paymentPercentage}%` : `Payment: ${m.paymentPercentage}%`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 self-end sm:self-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                                        {statusBadge.label}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${paymentBadge.color}`}>
                                        {paymentBadge.label}
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4 text-xs sm:text-sm">
                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {m.description[language] || m.description.en}
                                    </p>

                                    {/* Progress Bar in Details */}
                                    <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-between items-center mb-1.5 font-bold">
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {isAr ? 'إنجاز بنود المرحلة:' : 'Phase Completion Rate:'}
                                            </span>
                                            <span className="text-amber-600 dark:text-amber-400">
                                                {m.progressPercentage}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    m.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`}
                                                style={{ width: `${m.progressPercentage}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Inspector Notes */}
                                    {m.inspectorNotes && !isEditing && (
                                        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                                            <ShieldCheckIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold block mb-0.5">
                                                    {isAr ? 'ملاحظات الفحص الهندسي والاعتماد:' : 'Engineering Inspection Logs:'}
                                                </span>
                                                <p className="text-xs leading-relaxed">{m.inspectorNotes}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit Mode for Admins / Contractors */}
                                    {canManage && (
                                        <div className="pt-2">
                                            {!isEditing ? (
                                                <Button
                                                    onClick={() => handleStartEdit(m)}
                                                    variant="outline"
                                                    className="text-xs font-semibold py-1.5 px-3 border-gray-300"
                                                >
                                                    {isAr ? 'تحديث حالة المرحلة ونسبة الإنجاز ✍️' : 'Update Milestone Progress ✍️'}
                                                </Button>
                                            ) : (
                                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-amber-300 space-y-4">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {isAr ? 'تعديل بيانات المرحلة هندسياً' : 'Engineering Milestone Update'}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                                {isAr ? 'حالة المرحلة:' : 'Phase Status:'}
                                                            </label>
                                                            <select
                                                                value={editStatus}
                                                                onChange={(e) => setEditStatus(e.target.value as any)}
                                                                className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                            >
                                                                <option value="pending">{isAr ? 'قيد الانتظار' : 'Pending'}</option>
                                                                <option value="in_progress">{isAr ? 'جاري التنفيذ' : 'In Progress'}</option>
                                                                <option value="completed">{isAr ? 'مكتمل ومعتمد' : 'Completed'}</option>
                                                                <option value="delayed">{isAr ? 'متأخر' : 'Delayed'}</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                                {isAr ? 'نسبة الإنجاز (%):' : 'Progress (%):'}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={editProgress}
                                                                onChange={(e) => setEditProgress(Number(e.target.value))}
                                                                className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                                {isAr ? 'حالة الدفعة:' : 'Payment Status:'}
                                                            </label>
                                                            <select
                                                                value={editPaymentStatus}
                                                                onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                                                                className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                            >
                                                                <option value="pending">{isAr ? 'مؤجلة' : 'Pending'}</option>
                                                                <option value="due">{isAr ? 'مستحقة للصرف' : 'Due'}</option>
                                                                <option value="paid">{isAr ? 'مدفوعة' : 'Paid'}</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                            {isAr ? 'ملاحظات المهندس المشرف والمعاينة:' : 'Engineer Inspection Notes:'}
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            value={editNotes}
                                                            onChange={(e) => setEditNotes(e.target.value)}
                                                            className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                            placeholder={isAr ? 'اكتب ملاحظات الفحص الهندسي وتوصيات المرحلة...' : 'Add inspection notes...'}
                                                        />
                                                    </div>

                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            onClick={() => setEditingMilestoneId(null)}
                                                            variant="outline"
                                                            className="text-xs py-1 px-3"
                                                        >
                                                            {isAr ? 'إلغاء' : 'Cancel'}
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleSaveMilestone(m)}
                                                            disabled={isSaving}
                                                            className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs py-1 px-3"
                                                        >
                                                            {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التحديث' : 'Save Changes')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

export default FinishingMilestonesTracker;
