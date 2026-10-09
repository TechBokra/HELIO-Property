import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../shared/LanguageContext';
import { getAllRequests } from '../../../services/requests';
import { getAllProperties } from '../../../services/properties';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { getCredentialAuditLogs } from '../../../services/credentials';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { DocumentCheckIcon, SearchIcon, ArrowPathIcon } from '../../ui/Icons';
import { Link } from 'react-router-dom';

interface AuditEntry {
    id: string;
    domain: 'properties' | 'partners' | 'requests' | 'system' | 'credentials';
    action: string;
    actor: string;
    entityName: string;
    entityLink?: string;
    oldValue?: string;
    newValue?: string;
    timestamp: string;
    details: string;
}

const AdminAuditLogPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [searchTerm, setSearchTerm] = useState('');
    const [domainFilter, setDomainFilter] = useState<'all' | 'properties' | 'partners' | 'requests' | 'credentials'>('all');

    // 1. Fetch live operational entities
    const { 
        data: requests, 
        isLoading: loadingRequests, 
        isError: errorRequests, 
        refetch: refetchRequests 
    } = useQuery({ queryKey: ['allRequestsAdmin'], queryFn: getAllRequests });

    const { 
        data: properties, 
        isLoading: loadingProperties, 
        isError: errorProperties, 
        refetch: refetchProperties 
    } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties });

    const { 
        data: partners, 
        isLoading: loadingPartners, 
        isError: errorPartners, 
        refetch: refetchPartners 
    } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });

    const {
        data: credentialLogs,
        isLoading: loadingCredentials,
        refetch: refetchCredentials
    } = useQuery({ queryKey: ['allCredentialAudit'], queryFn: () => getCredentialAuditLogs() });

    const isLoading = loadingRequests || loadingProperties || loadingPartners || loadingCredentials;
    const isError = errorRequests || errorProperties || errorPartners;

    // 2. Synthesize unified operational audit trails
    const auditLogs: AuditEntry[] = useMemo(() => {
        const logs: AuditEntry[] = [];

        // Requests audit entries
        (requests || []).forEach(req => {
            if (req.updatedAt || req.createdAt) {
                logs.push({
                    id: `req-log-${req.id}`,
                    domain: 'requests',
                    action: req.status === 'pending' ? (isAr ? 'إنشاء طلب جديد' : 'New Request Created') : (isAr ? 'تحديث حالة الطلب' : 'Request Updated'),
                    actor: req.assignedTo || (isAr ? 'النظام' : 'System'),
                    entityName: req.requesterInfo?.name || req.type,
                    entityLink: `/admin/contact-requests?highlight=${req.id}`,
                    newValue: req.status,
                    timestamp: req.updatedAt || req.createdAt,
                    details: `${req.type} • Status: ${req.status}`,
                });
            }
        });

        // Properties audit entries
        (properties || []).forEach(prop => {
            const title = prop.title?.[language] || prop.title?.ar || prop.title?.en || prop.referenceNumber || 'Property';
            if (prop.verifiedAt || prop.updatedAt) {
                logs.push({
                    id: `prop-log-${prop.id}`,
                    domain: 'properties',
                    action: prop.verificationStatus === 'verified' 
                        ? (isAr ? 'اعتماد وتوثيق عقار' : 'Property Verified') 
                        : (isAr ? 'تعديل بيانات عقار' : 'Property Updated'),
                    actor: prop.partnerName || (isAr ? 'المطور / الشريك' : 'Partner'),
                    entityName: title,
                    entityLink: `/admin/properties/edit/${prop.id}`,
                    newValue: prop.listingStatus,
                    timestamp: prop.verifiedAt || prop.updatedAt || new Date().toISOString(),
                    details: `Ref: ${prop.referenceNumber || '—'} • ${prop.verificationStatus}`,
                });
            }
        });

        // Partners audit entries
        (partners || []).forEach(p => {
            const partnerName = (isAr && p.nameAr ? p.nameAr : p.name) || p.email;
            logs.push({
                id: `partner-log-${p.id}`,
                domain: 'partners',
                action: p.status === 'active' 
                    ? (isAr ? 'تفعيل حساب شريك' : 'Partner Activated') 
                    : (isAr ? 'تحديث سجل الشريك' : 'Partner Status Updated'),
                actor: p.role || 'Admin',
                entityName: partnerName,
                entityLink: `/admin/partners?highlight=${p.id}`,
                newValue: p.status,
                timestamp: (p as any).updatedAt || p.createdAt || new Date().toISOString(),
                details: `Plan: ${p.subscriptionPlan || 'basic'} • Status: ${p.status}`,
            });
        });

        // Credential Management audit entries (Section 16: Zero secrets stored)
        (credentialLogs || []).forEach(cred => {
            logs.push({
                id: `cred-log-${cred.id}`,
                domain: 'credentials',
                action: cred.action,
                actor: cred.actorId || 'System',
                entityName: cred.targetUserId || 'User',
                entityLink: `/admin/users`,
                newValue: cred.success ? 'Success' : 'Failed',
                timestamp: cred.timestamp,
                details: cred.details || 'User credential management operation',
            });
        });

        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [requests, properties, partners, credentialLogs, isAr, language]);

    // 3. Filter logs
    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const matchesSearch = 
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDomain = domainFilter === 'all' || log.domain === domainFilter;
            return matchesSearch && matchesDomain;
        });
    }, [auditLogs, searchTerm, domainFilter]);

    const refetchAll = () => {
        refetchRequests();
        refetchProperties();
        refetchPartners();
        refetchCredentials();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isAr ? 'سجل التدقيق والعمليات' : 'Audit Log & Operations'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isAr 
                            ? 'متابعة العمليات الإدارية، تحديثات الحالات، وتعديلات البيانات عبر المنظومة' 
                            : 'Chronological activity stream of administrative changes across domains'}
                    </p>
                </div>

                <button
                    onClick={refetchAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs self-start sm:self-auto"
                >
                    <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'تحديث السجل' : 'Refresh'}</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-gray-200 shadow-2xs">
                <div className="relative flex-1">
                    <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={isAr ? 'البحث بالحدث، الكيان، أو المسؤول...' : 'Search action, entity, actor...'}
                        className="ps-9 text-xs h-9"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {[
                        { key: 'all', label: isAr ? 'الكل' : 'All' },
                        { key: 'properties', label: isAr ? 'العقارات' : 'Properties' },
                        { key: 'partners', label: isAr ? 'الشركاء' : 'Partners' },
                        { key: 'requests', label: isAr ? 'الطلبات' : 'Requests' },
                        { key: 'credentials', label: isAr ? 'الأمان والاعتماد' : 'Credentials' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setDomainFilter(tab.key as any)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                domainFilter === tab.key 
                                    ? 'bg-amber-500 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Banner */}
            {isError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center justify-between">
                    <span>{isAr ? 'حدث خطأ أثناء تحميل سجل العمليات' : 'Failed to load audit history stream'}</span>
                    <button onClick={refetchAll} className="font-bold underline ms-2">
                        {isAr ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            )}

            {/* Loading Skeleton */}
            {isLoading && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">
                        {isAr ? 'جاري تجميع سجل التدقيق...' : 'Loading audit entries...'}
                    </p>
                </div>
            )}

            {/* Audit Log Table */}
            {!isLoading && !isError && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
                    {filteredLogs.length === 0 ? (
                        <div className="p-12 text-center">
                            <DocumentCheckIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-gray-700">
                                {isAr ? 'لا توجد سجلات مطابقة' : 'No audit entries found'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {isAr ? 'لم تسجل عمليات مطابقة لمعايير البحث الحالية' : 'No activity logged matching criteria'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/80">
                                    <TableHead className="text-xs">{isAr ? 'الوقت والتاريخ' : 'Timestamp'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'القطاع' : 'Domain'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'الإجراء' : 'Action'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'الكيان المعني' : 'Target Entity'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'المسؤول' : 'Actor'}</TableHead>
                                    <TableHead className="text-xs text-end">{isAr ? 'التفاصيل' : 'Details'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.slice(0, 50).map(entry => (
                                    <TableRow key={entry.id} className="hover:bg-gray-50/50">
                                        <TableCell className="whitespace-nowrap text-xs text-gray-500 font-mono">
                                            {new Date(entry.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                                entry.domain === 'properties' ? 'bg-amber-100 text-amber-800' :
                                                entry.domain === 'partners' ? 'bg-blue-100 text-blue-800' :
                                                'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                {entry.domain}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-semibold text-gray-900">
                                                {entry.action}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {entry.entityLink ? (
                                                <Link 
                                                    to={entry.entityLink}
                                                    className="text-xs font-medium text-amber-600 hover:text-amber-700 underline truncate max-w-[200px] block"
                                                >
                                                    {entry.entityName}
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-gray-700 truncate max-w-[200px] block">
                                                    {entry.entityName}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-gray-600 font-mono">
                                                {entry.actor}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <span className="text-[11px] text-gray-400">
                                                {entry.details}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminAuditLogPage;
