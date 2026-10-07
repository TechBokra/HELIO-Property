import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../shared/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { 
    type UnifiedRequest, 
    type OperationalDomain, 
    OperationalStatus, 
    RequestType,
    Permission,
    Role
} from '../../../types';
import { getUnifiedRequests, getUnifiedRequestById } from '../../../services/requests';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { OperationalMetricsBar } from './OperationalMetricsBar';
import { OperationalFilterBar } from './OperationalFilterBar';
import { OperationalRequestDrawer } from './OperationalRequestDrawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import Pagination from '../../shared/Pagination';
import { 
    ArrowPathIcon, 
    ExclamationTriangleIcon, 
    InboxIcon, 
    PhoneIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    UsersIcon,
    ClipboardDocumentListIcon
} from '../../ui/Icons';

const AdminOperationsCenterPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { currentUser, hasPermission } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // 1. URL State Management
    const initialTriageView = searchParams.get('view') || 'all';
    const initialDomain = (searchParams.get('domain') as OperationalDomain) || 'all';
    const initialType = (searchParams.get('type') as RequestType) || 'all';
    const initialStatus = (searchParams.get('status') as OperationalStatus) || 'all';
    const initialPriority = (searchParams.get('priority') as 'all' | 'high' | 'medium' | 'low') || 'all';
    const initialAssignee = searchParams.get('assignedTo') || 'all';
    const initialSearch = searchParams.get('search') || '';
    const initialSelectedId = searchParams.get('id') || searchParams.get('highlight') || null;

    const [triageView, setTriageView] = useState<string>(initialTriageView);
    const [domain, setDomain] = useState<OperationalDomain | 'all'>(initialDomain);
    const [requestType, setRequestType] = useState<RequestType | 'all'>(initialType);
    const [operationalStatus, setOperationalStatus] = useState<OperationalStatus | 'all'>(initialStatus);
    const [priority, setPriority] = useState<'all' | 'high' | 'medium' | 'low'>(initialPriority);
    const [assignedTo, setAssignedTo] = useState<string>(initialAssignee);
    const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageSize = 15;

    // Selected Request for Side Drawer
    const [selectedRequest, setSelectedRequest] = useState<UnifiedRequest | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

    // 2. Fetch managers list for assignment dropdown
    const { data: partners } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin,
    });

    const managers = useMemo(() => {
        return (partners || []).filter(p => 
            p.role.includes('_manager') || 
            p.role === Role.SUPER_ADMIN || 
            p.type === 'admin'
        );
    }, [partners]);

    // 3. Query Unified Requests
    const {
        data: response,
        isLoading,
        isError,
        refetch,
        isFetching
    } = useQuery({
        queryKey: ['unifiedRequests', domain, requestType, operationalStatus, priority, assignedTo, triageView, searchTerm, currentPage],
        queryFn: () => getUnifiedRequests({
            domain,
            type: requestType,
            operationalStatus,
            priority,
            assignedTo,
            triageView: triageView as any,
            searchTerm,
            page: currentPage,
            pageSize
        }),
    });

    // Auto-select request if ID is in URL params (with deep-link single-record fetch fallback)
    useEffect(() => {
        if (!initialSelectedId) return;

        if (response?.requests) {
            const match = response.requests.find(r => r.id === initialSelectedId);
            if (match) {
                setSelectedRequest(match);
                setIsDrawerOpen(true);
                return;
            }
        }

        // Deep-link fallback: fetch request directly even if it's on a different page or view
        let isMounted = true;
        getUnifiedRequestById(initialSelectedId).then(singleReq => {
            if (isMounted && singleReq) {
                setSelectedRequest(singleReq);
                setIsDrawerOpen(true);
            }
        }).catch(() => {});

        return () => {
            isMounted = false;
        };
    }, [initialSelectedId, response?.requests]);

    const handleSelectRequest = (req: UnifiedRequest) => {
        setSelectedRequest(req);
        setIsDrawerOpen(true);
        setSearchParams(prev => {
            prev.set('id', req.id);
            return prev;
        }, { replace: true });
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setSearchParams(prev => {
            prev.delete('id');
            prev.delete('highlight');
            return prev;
        }, { replace: true });
    };

    const handleResetFilters = () => {
        setDomain('all');
        setRequestType('all');
        setOperationalStatus('all');
        setPriority('all');
        setAssignedTo('all');
        setSearchTerm('');
        setTriageView('all');
        setCurrentPage(1);
        setSearchParams({}, { replace: true });
    };

    const totalPages = Math.ceil((response?.totalCount || 0) / pageSize);

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
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                            {isAr ? 'مركز العمليات والطلبات الموحد' : 'Unified Operations Center'}
                        </h1>
                        <span className="text-xs font-mono font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                            /admin/operations
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {isAr 
                            ? 'نظام الفرز والتحكم المركزي الموحد لجميع الطلبات والاستفسارات الواردة إلى المنصة'
                            : 'Single control layer for intake, triage, ownership, and tracking across all business domains'}
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-amber-600 transition-colors shadow-3xs disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-500' : ''}`} />
                        <span>{isAr ? 'تحديث العمليات' : 'Refresh'}</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {isError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                        <span>{isAr ? 'تعذر تحميل سجلات العمليات من قاعدة البيانات.' : 'Failed to query operational requests stream from database.'}</span>
                    </div>
                    <button 
                        onClick={() => refetch()}
                        className="font-bold underline text-xs ms-2 shrink-0"
                    >
                        {isAr ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            )}

            {/* Triage Metrics Bar */}
            <OperationalMetricsBar
                metrics={response?.metrics || {
                    total: 0,
                    unassigned: 0,
                    newCount: 0,
                    inProgress: 0,
                    waiting: 0,
                    agedRisk: 0,
                    highPriority: 0,
                    resolvedToday: 0
                }}
                activeView={triageView}
                onViewChange={view => {
                    setTriageView(view);
                    setCurrentPage(1);
                    setSearchParams(prev => {
                        if (view === 'all') prev.delete('view');
                        else prev.set('view', view);
                        return prev;
                    }, { replace: true });
                }}
                isLoading={isLoading}
            />

            {/* Multi-Domain Filter Bar */}
            <OperationalFilterBar
                domain={domain}
                onDomainChange={d => { setDomain(d); setCurrentPage(1); }}
                requestType={requestType}
                onRequestTypeChange={t => { setRequestType(t); setCurrentPage(1); }}
                operationalStatus={operationalStatus}
                onOperationalStatusChange={s => { setOperationalStatus(s); setCurrentPage(1); }}
                priority={priority}
                onPriorityChange={p => { setPriority(p); setCurrentPage(1); }}
                assignedTo={assignedTo}
                onAssignedToChange={a => { setAssignedTo(a); setCurrentPage(1); }}
                searchTerm={searchTerm}
                onSearchChange={s => { setSearchTerm(s); setCurrentPage(1); }}
                managers={managers}
                onReset={handleResetFilters}
            />

            {/* Loading State */}
            {isLoading && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
                    <div className="animate-spin w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                        {isAr ? 'جاري تحميل سجلات العمليات والفرز...' : 'Loading operational requests stream...'}
                    </p>
                </div>
            )}

            {/* Requests Table (Desktop) & Cards (Mobile) */}
            {!isLoading && !isError && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                    {(!response?.requests || response.requests.length === 0) ? (
                        <div className="p-12 text-center">
                            <ClipboardDocumentListIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-gray-800">
                                {isAr ? 'لا توجد طلبات مطابقة للمعايير المحددة' : 'No requests matching triage criteria'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                {isAr 
                                    ? 'جرب ضبط فلاتر البحث أو اختيار تبويب عمليات آخر لعرض الطلبات' 
                                    : 'Try resetting filters or switching to another triage view.'}
                            </p>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="mt-3 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                                {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Dense Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/80">
                                            <TableHead className="text-xs w-28">{isAr ? 'المعرف والعمر' : 'ID & Age'}</TableHead>
                                            <TableHead className="text-xs">{isAr ? 'مقدم الطلب' : 'Requester'}</TableHead>
                                            <TableHead className="text-xs">{isAr ? 'القطاع والنوع' : 'Domain & Type'}</TableHead>
                                            <TableHead className="text-xs">{isAr ? 'الموضوع والسياق' : 'Subject & Context'}</TableHead>
                                            <TableHead className="text-xs">{isAr ? 'الحالة التشغيلية' : 'Operational State'}</TableHead>
                                            <TableHead className="text-xs">{isAr ? 'المسؤول' : 'Owner'}</TableHead>
                                            <TableHead className="text-xs">{isAr ? 'الإجراء التالي' : 'Next Action'}</TableHead>
                                            <TableHead className="text-xs text-end">{isAr ? 'تحكم' : 'Action'}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {response.requests.map((req) => (
                                            <TableRow 
                                                key={req.id} 
                                                onClick={() => handleSelectRequest(req)}
                                                className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                                            >
                                                {/* ID & Age */}
                                                <TableCell className="whitespace-nowrap">
                                                    <span className="font-mono text-[11px] font-bold text-gray-700 block">
                                                        #{req.id.slice(0, 8)}
                                                    </span>
                                                    <span className={`text-[10px] font-mono ${req.isAged ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                        {req.ageHours}h ago
                                                    </span>
                                                </TableCell>

                                                {/* Requester */}
                                                <TableCell>
                                                    <p className="text-xs font-bold text-gray-900 truncate max-w-[150px]">
                                                        {req.requester.name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 font-mono truncate max-w-[150px]">
                                                        {req.requester.phone || req.requester.email || '—'}
                                                    </p>
                                                </TableCell>

                                                {/* Domain & Type */}
                                                <TableCell>
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                                                        {isAr ? req.domainLabel.ar : req.domainLabel.en}
                                                    </span>
                                                    <span className="block text-[11px] text-gray-500 mt-0.5 truncate max-w-[130px]">
                                                        {req.typeLabel[isAr ? 'ar' : 'en']}
                                                    </span>
                                                </TableCell>

                                                {/* Subject & Context */}
                                                <TableCell>
                                                    <p className="text-xs font-semibold text-gray-900 truncate max-w-[200px]">
                                                        {req.context.serviceTitle || req.context.details || '—'}
                                                    </p>
                                                    {(req.context.propertyTitle || req.context.partnerName) && (
                                                        <span className="text-[11px] text-gray-400 truncate max-w-[200px] block">
                                                            {req.context.propertyTitle || req.context.partnerName}
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Operational State + Domain Status */}
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${opBadgeColors[req.operationalStatus]}`}>
                                                        {req.operationalStatus}
                                                    </span>
                                                    <span className="block text-[10px] text-gray-400 mt-0.5 font-medium">
                                                        ({req.domainStatus})
                                                    </span>
                                                </TableCell>

                                                {/* Owner / Assignee */}
                                                <TableCell>
                                                    {req.assignedToName ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800">
                                                            <UsersIcon className="w-3 h-3 text-amber-500" />
                                                            <span className="truncate max-w-[100px]">{req.assignedToName}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                                            {isAr ? 'غير معين' : 'Unassigned'}
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Next Action */}
                                                <TableCell>
                                                    <span className="text-[11px] text-gray-600 truncate max-w-[150px] block">
                                                        {isAr ? req.nextAction.ar : req.nextAction.en}
                                                    </span>
                                                </TableCell>

                                                {/* Action */}
                                                <TableCell className="text-end" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectRequest(req)}
                                                        className="px-2.5 py-1 text-xs font-bold text-amber-600 hover:text-white hover:bg-amber-500 bg-amber-50 rounded-lg transition-colors"
                                                    >
                                                        {isAr ? 'فرز وإجراء' : 'Triage'}
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Compact Cards List */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {response.requests.map(req => (
                                    <div 
                                        key={req.id} 
                                        onClick={() => handleSelectRequest(req)}
                                        className="p-4 space-y-2 hover:bg-amber-50/40 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs font-bold text-gray-700">
                                                    #{req.id.slice(0, 8)}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${opBadgeColors[req.operationalStatus]}`}>
                                                    {req.operationalStatus}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-400">
                                                {req.ageHours}h ago
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900">
                                                {req.requester.name}
                                            </h4>
                                            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                                                {req.context.serviceTitle || req.context.details || '—'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
                                            <span>{isAr ? req.domainLabel.ar : req.domainLabel.en}</span>
                                            <span className={req.assignedTo ? 'font-semibold text-gray-800' : 'text-red-600 font-bold'}>
                                                {req.assignedToName || (isAr ? 'غير معين' : 'Unassigned')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        {isAr ? `إجمالي السجلات: ${response.totalCount}` : `Total: ${response.totalCount} records`}
                                    </span>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={p => setCurrentPage(p)}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Side Drawer for Request Details & Actions */}
            <OperationalRequestDrawer
                request={selectedRequest}
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
                managers={managers}
                onUpdated={() => refetch()}
            />
        </div>
    );
};

export default AdminOperationsCenterPage;
