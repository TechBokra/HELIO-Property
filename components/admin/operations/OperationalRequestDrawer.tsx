import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../shared/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../shared/ToastContext';
import { 
    type UnifiedRequest, 
    OperationalStatus, 
    type Partner, 
    Permission, 
    Role,
    type LeadMessage
} from '../../../types';
import { 
    assignRequest, 
    unassignRequest, 
    updateRequestOperationalStatus, 
    addRequestInternalNote,
    getRequestMessages
} from '../../../services/requests';
import { 
    CloseIcon, 
    PhoneIcon, 
    CheckCircleIcon, 
    UsersIcon, 
    ArrowPathIcon,
    ExclamationTriangleIcon,
    BuildingIcon,
    CubeIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    ChatBubbleLeftRightIcon
} from '../../ui/Icons';
import { StatusBadge } from '../../ui/StatusBadge';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';

interface OperationalRequestDrawerProps {
    request: UnifiedRequest | null;
    isOpen: boolean;
    onClose: () => void;
    managers: Partner[];
    onUpdated?: () => void;
}

export const OperationalRequestDrawer: React.FC<OperationalRequestDrawerProps> = ({
    request,
    isOpen,
    onClose,
    managers,
    onUpdated,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { currentUser, hasPermission } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [noteText, setNoteText] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'context'>('details');

    useEffect(() => {
        if (request) {
            setSelectedAssignee(request.assignedTo || '');
            setNoteText('');
        }
    }, [request]);

    // Query messages / internal notes for timeline
    const { 
        data: messages, 
        isLoading: loadingMessages, 
        refetch: refetchMessages 
    } = useQuery({
        queryKey: ['requestMessages', request?.id, currentUser?.role],
        queryFn: () => request ? getRequestMessages(request.id, currentUser?.role) : Promise.resolve([]),
        enabled: !!request && isOpen,
    });

    // Permission checks
    const canAssign = hasPermission(Permission.ASSIGN_REQUESTS) || 
                      hasPermission(Permission.ASSIGN_LEADS) || 
                      hasPermission(Permission.MANAGE_REQUESTS);

    const canMutate = hasPermission(Permission.MANAGE_REQUESTS) || 
                      hasPermission(Permission.MANAGE_LEADS) || 
                      hasPermission(Permission.MANAGE_PROPERTY_REQUESTS) ||
                      hasPermission(Permission.MANAGE_PARTNER_REQUESTS) ||
                      hasPermission(Permission.MANAGE_PLATFORM_FINISHING_LEADS) ||
                      hasPermission(Permission.MANAGE_DECORATIONS_LEADS) ||
                      hasPermission(Permission.MANAGE_CONTACT_REQUESTS);

    // Assignment Mutation
    const assignMutation = useMutation({
        mutationFn: async (assigneeId: string) => {
            if (!request) return;
            if (!assigneeId) {
                await unassignRequest(request.id, 'Unassigned via Operations Center');
            } else {
                await assignRequest(request.id, assigneeId, 'Assigned via Operations Center');
            }
        },
        onSuccess: () => {
            showToast(isAr ? 'تم تحديث التعيين بنجاح' : 'Assignment updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['unifiedRequests'] });
            refetchMessages();
            onUpdated?.();
        },
        onError: (err: any) => {
            showToast(err.message || (isAr ? 'فشل التعيين' : 'Failed to update assignment'), 'error');
        }
    });

    // Operational Status Mutation
    const statusMutation = useMutation({
        mutationFn: async ({ opStatus, domainStatus }: { opStatus: OperationalStatus; domainStatus?: string }) => {
            if (!request) return;
            await updateRequestOperationalStatus(request.id, opStatus, domainStatus);
        },
        onSuccess: () => {
            showToast(isAr ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['unifiedRequests'] });
            refetchMessages();
            onUpdated?.();
        },
        onError: (err: any) => {
            showToast(err.message || (isAr ? 'فشل تحديث الحالة' : 'Failed to update status'), 'error');
        }
    });

    // Add Internal Note Mutation
    const noteMutation = useMutation({
        mutationFn: async () => {
            if (!request || !noteText.trim()) return;
            await addRequestInternalNote(
                request.id, 
                noteText.trim(), 
                currentUser?.id, 
                currentUser?.role
            );
        },
        onSuccess: () => {
            showToast(isAr ? 'تمت إضافة الملاحظة بنجاح' : 'Internal note added', 'success');
            setNoteText('');
            refetchMessages();
            queryClient.invalidateQueries({ queryKey: ['unifiedRequests'] });
        },
        onError: (err: any) => {
            showToast(err.message || 'Failed to add note', 'error');
        }
    });

    if (!isOpen || !request) return null;

    const opBadgeColors: Record<OperationalStatus, string> = {
        [OperationalStatus.NEW]: 'bg-blue-100 text-blue-800 border-blue-200',
        [OperationalStatus.ASSIGNED]: 'bg-amber-100 text-amber-800 border-amber-200',
        [OperationalStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800 border-purple-200',
        [OperationalStatus.WAITING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        [OperationalStatus.RESOLVED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        [OperationalStatus.CLOSED]: 'bg-gray-100 text-gray-800 border-gray-200',
        [OperationalStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-gray-900/60 transition-opacity backdrop-blur-2xs" 
                onClick={onClose} 
            />

            <div className="fixed inset-y-0 end-0 flex max-w-full ps-10">
                <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full border-s border-gray-200">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50/70">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                    #{request.id.slice(0, 8)}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${opBadgeColors[request.operationalStatus]}`}>
                                    {request.operationalStatus}
                                </span>
                                <span className="text-[10px] font-medium text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
                                    {request.domainStatus}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mt-2.5">
                            <h2 className="text-base font-bold text-gray-900 line-clamp-1">
                                {request.context.serviceTitle || request.typeLabel[isAr ? 'ar' : 'en']}
                            </h2>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span>{isAr ? request.domainLabel.ar : request.domainLabel.en}</span>
                                <span>•</span>
                                <span>{request.ageHours}h ago</span>
                                {request.isAged && (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                        {isAr ? 'تجاوز المهلة (SLA Risk)' : 'SLA Exceeded'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-gray-200 mt-3 -mb-4 gap-4 text-xs font-semibold">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`pb-2.5 transition-colors border-b-2 ${
                                    activeTab === 'details'
                                        ? 'border-amber-500 text-amber-600 font-bold'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {isAr ? 'تفاصيل الطلب والعميل' : 'Details & Requester'}
                            </button>
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                                    activeTab === 'timeline'
                                        ? 'border-amber-500 text-amber-600 font-bold'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <span>{isAr ? 'سجل العمليات والمحادثة' : 'Activity & Notes'}</span>
                                {messages && messages.length > 0 && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded-full">
                                        {messages.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('context')}
                                className={`pb-2.5 transition-colors border-b-2 ${
                                    activeTab === 'context'
                                        ? 'border-amber-500 text-amber-600 font-bold'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {isAr ? 'السياق والتسويق' : 'Context & Source'}
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        {activeTab === 'details' && (
                            <>
                                {/* Requester Identity Card */}
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            {isAr ? 'بيانات مقدم الطلب' : 'Requester Identity'}
                                        </h3>
                                        {request.requester.customerId && (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                {isAr ? 'حساب مسجل' : 'Registered User'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                                            {request.requester.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {request.requester.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                                                {request.requester.phone && (
                                                    <a 
                                                        href={`tel:${request.requester.phone}`} 
                                                        className="font-mono text-amber-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <PhoneIcon className="w-3 h-3" />
                                                        <span>{request.requester.phone}</span>
                                                    </a>
                                                )}
                                                {request.requester.email && (
                                                    <a 
                                                        href={`mailto:${request.requester.email}`} 
                                                        className="hover:underline text-gray-600 truncate max-w-[200px]"
                                                    >
                                                        {request.requester.email}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ownership & Assignment */}
                                <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            {isAr ? 'المسؤول والمتابعة' : 'Ownership & Assignment'}
                                        </h3>
                                        {canAssign && currentUser && (
                                            <button
                                                type="button"
                                                onClick={() => assignMutation.mutate(currentUser.id)}
                                                disabled={assignMutation.isPending || request.assignedTo === currentUser.id}
                                                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 disabled:opacity-40"
                                            >
                                                {isAr ? 'تعيين لي' : 'Assign to Me'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={selectedAssignee}
                                            disabled={!canAssign || assignMutation.isPending}
                                            onChange={e => {
                                                setSelectedAssignee(e.target.value);
                                                assignMutation.mutate(e.target.value);
                                            }}
                                            className="text-xs h-9 bg-gray-50/50 flex-1"
                                        >
                                            <option value="">{isAr ? 'غير معين (Unassigned)' : 'Unassigned'}</option>
                                            {(managers || []).map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {(isAr && m.nameAr ? m.nameAr : m.name) || m.email}
                                                </option>
                                            ))}
                                        </Select>

                                        {canAssign && request.assignedTo && (
                                            <button
                                                type="button"
                                                onClick={() => assignMutation.mutate('')}
                                                disabled={assignMutation.isPending}
                                                className="px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors shrink-0"
                                            >
                                                {isAr ? 'إلغاء' : 'Clear'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Operational Lifecycle Transition Buttons */}
                                <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-2.5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        {isAr ? 'إجراءات الحالة والمسار' : 'Operational State Actions'}
                                    </h3>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <button
                                            type="button"
                                            disabled={!canMutate || statusMutation.isPending || request.operationalStatus === OperationalStatus.IN_PROGRESS}
                                            onClick={() => statusMutation.mutate({ opStatus: OperationalStatus.IN_PROGRESS, domainStatus: 'contacted' })}
                                            className="p-2 font-bold rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-40"
                                        >
                                            {isAr ? 'تم التواصل / قيد المعالجة' : 'Mark In Progress'}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!canMutate || statusMutation.isPending || request.operationalStatus === OperationalStatus.WAITING}
                                            onClick={() => statusMutation.mutate({ opStatus: OperationalStatus.WAITING, domainStatus: 'quoted' })}
                                            className="p-2 font-bold rounded-lg border border-yellow-200 text-yellow-800 hover:bg-yellow-50 transition-colors disabled:opacity-40"
                                        >
                                            {isAr ? 'بانتظار رد العميل' : 'Mark Waiting'}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!canMutate || statusMutation.isPending || request.operationalStatus === OperationalStatus.RESOLVED}
                                            onClick={() => statusMutation.mutate({ opStatus: OperationalStatus.RESOLVED, domainStatus: 'completed' })}
                                            className="p-2 font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-2xs"
                                        >
                                            {isAr ? 'اعتماد واكتمال' : 'Mark Resolved'}
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!canMutate || statusMutation.isPending || request.operationalStatus === OperationalStatus.REJECTED}
                                            onClick={() => statusMutation.mutate({ opStatus: OperationalStatus.REJECTED, domainStatus: 'cancelled' })}
                                            className="p-2 font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                        >
                                            {isAr ? 'رفض / إلغاء' : 'Reject / Cancel'}
                                        </button>
                                    </div>
                                </div>

                                {/* Request Content & Details */}
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        {isAr ? 'محتوى الطلب والملاحظات' : 'Request Content'}
                                    </h3>
                                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {request.context.details || (isAr ? 'لا توجد تفاصيل إضافية مسجلة.' : 'No additional details provided.')}
                                    </p>
                                </div>

                                {/* Deep-link to specialized domain workflow */}
                                <div className="pt-2">
                                    <Link
                                        to={request.detailRoute}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                                    >
                                        <span>{isAr ? 'فتح في الصفحة التخصصية للقطاع' : 'Open in Specialized Domain Page'}</span>
                                        {isAr ? <ChevronLeftIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                    </Link>
                                </div>
                            </>
                        )}

                        {activeTab === 'timeline' && (
                            <div className="space-y-4">
                                {/* Add Internal Note Form */}
                                {canMutate && (
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                        <label className="text-xs font-bold text-gray-700 block">
                                            {isAr ? 'إضافة ملاحظة داخلية (فريق العمل)' : 'Add Internal Operational Note'}
                                        </label>
                                        <Textarea
                                            rows={2}
                                            value={noteText}
                                            onChange={e => setNoteText(e.target.value)}
                                            placeholder={isAr ? 'اكتب ملاحظتك التشغيلية هنا...' : 'Write an internal note...'}
                                            className="text-xs bg-white"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => noteMutation.mutate()}
                                                disabled={!noteText.trim() || noteMutation.isPending}
                                                className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50 transition-colors shadow-2xs"
                                            >
                                                {noteMutation.isPending ? 'Saving...' : (isAr ? 'حفظ الملاحظة' : 'Save Note')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Timeline Stream */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        {isAr ? 'السجل الزمني للأحداث' : 'Chronological Timeline'}
                                    </h4>

                                    {loadingMessages ? (
                                        <div className="p-6 text-center text-xs text-gray-400">Loading timeline...</div>
                                    ) : (!messages || messages.length === 0) ? (
                                        <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                                            {isAr ? 'لم تسجل ملاحظات أو اتصالات بعد.' : 'No activity logged yet.'}
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {messages.map(msg => (
                                                <div key={msg.id} className="p-3 bg-white rounded-lg border border-gray-200 text-xs shadow-3xs space-y-1">
                                                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                                                        <span className="font-semibold text-gray-600 uppercase">
                                                            {msg.sender} ({msg.type})
                                                        </span>
                                                        <span className="font-mono">
                                                            {new Date(msg.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-800 whitespace-pre-wrap">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'context' && (
                            <div className="space-y-3 text-xs">
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                    <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                                        {isAr ? 'الارتباط العقاري / الشريك' : 'Entity Association'}
                                    </h4>
                                    <div className="space-y-1 text-gray-600">
                                        {request.context.propertyTitle && (
                                            <div>
                                                <span className="text-gray-400">{isAr ? 'العقار المعني:' : 'Property:'} </span>
                                                <span className="font-semibold text-gray-900">{request.context.propertyTitle}</span>
                                            </div>
                                        )}
                                        {request.context.partnerName && (
                                            <div>
                                                <span className="text-gray-400">{isAr ? 'الشريك:' : 'Partner:'} </span>
                                                <span className="font-semibold text-gray-900">{request.context.partnerName}</span>
                                            </div>
                                        )}
                                        {request.context.estimatedCost && (
                                            <div>
                                                <span className="text-gray-400">{isAr ? 'الميزانية / التكلفة:' : 'Budget/Cost:'} </span>
                                                <span className="font-bold text-emerald-600">{request.context.estimatedCost.toLocaleString()} EGP</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                    <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                                        {isAr ? 'بيانات التتبع والتسويق' : 'Attribution & Channel'}
                                    </h4>
                                    <div className="space-y-1 text-gray-600 font-mono text-[11px]">
                                        <div>Source: {request.context.source || 'direct'}</div>
                                        {request.context.utmSource && <div>UTM Source: {request.context.utmSource}</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
