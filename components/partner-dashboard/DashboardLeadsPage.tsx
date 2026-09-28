import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lead, LeadStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import ExportDropdown from '../shared/ExportDropdown';
import { getAllRequests } from '../../services/requests';
import { updateLead } from '../../services/leads';
import { RequestType, Role } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Select } from '../ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { ResponsiveList } from '../shared/ResponsiveList';
import CardSkeleton from '../ui/CardSkeleton';
import TableSkeleton from '../shared/TableSkeleton';
import { Input } from '../ui/Input';
import { StatusBadge } from '../ui/StatusBadge';
import ErrorState from '../shared/ErrorState';
import { WhatsAppIcon, PhoneIcon } from '../ui/Icons';

type SortConfig = {
    key: keyof Lead;
    direction: 'ascending' | 'descending';
} | null;

const DashboardLeadsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: allRequests, isLoading: loading, isError, refetch } = useQuery({
        queryKey: ['allRequests'],
        queryFn: getAllRequests,
        enabled: !!currentUser,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => updateLead(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allRequests'] });
            showToast(language === 'ar' ? 'تم تحديث حالة العميل بنجاح' : 'Lead status updated', 'success');
        },
        onError: () => {
            showToast(language === 'ar' ? 'حدث خطأ أثناء تحديث الحالة' : 'Failed to update lead status', 'error');
        }
    });

    const isFinishingPartner = (currentUser as any)?.type === 'finishing' || currentUser?.role === Role.FINISHING_PARTNER;

    const partnerLeads = useMemo((): Lead[] => {
        if (!allRequests || !currentUser) return [];

        return allRequests
            .filter(req => {
                if (req.type !== RequestType.LEAD) return false;
                const payload = (req.payload || {}) as any;
                const isAssigned = 
                    req.assignedTo === currentUser.id || 
                    payload?.partnerId === currentUser.id || 
                    payload?.assignedTo === currentUser.id;

                if (isAssigned) return true;

                // If user is a finishing partner, allow viewing finishing RFQs
                if (isFinishingPartner && (
                    payload?.serviceType === 'finishing' || 
                    payload?.category === 'turnkey' ||
                    payload?.serviceTitle?.includes('تشطيب') || 
                    payload?.serviceTitle?.toLowerCase().includes('finishing')
                )) {
                    return true;
                }

                return false;
            })
            .map(req => {
                const leadPayload = (req.payload || {}) as Lead;
                return {
                    ...leadPayload,
                    id: req.id, // Use the top-level Request ID
                    customerName: req.requesterInfo?.name || (leadPayload as any).customerName || 'Anonymous',
                    customerPhone: req.requesterInfo?.phone || (leadPayload as any).customerPhone || '',
                    createdAt: req.createdAt,
                    status: (leadPayload.status || req.status || 'new') as any,
                    source: (leadPayload as any).source,
                    utmSource: (leadPayload as any).utmSource || (leadPayload as any).utm_source,
                    utmCampaign: (leadPayload as any).utmCampaign || (leadPayload as any).utm_campaign,
                    utmMedium: (leadPayload as any).utmMedium || (leadPayload as any).utm_medium,
                    landingPage: (leadPayload as any).landingPage || (leadPayload as any).landing_page,
                    referrer: (leadPayload as any).referrer || (leadPayload as any).referral,
                };
            });
    }, [allRequests, currentUser, isFinishingPartner]);

    // ROI Performance metrics for partner
    const metrics = useMemo(() => {
        const total = partnerLeads.length;
        const contacted = partnerLeads.filter(l => l.status !== 'new').length;
        const viewing = partnerLeads.filter(l => l.status === 'site-visit' || l.status === 'completed').length;
        const won = partnerLeads.filter(l => l.status === 'completed').length;

        const contactedRate = total > 0 ? Math.round((contacted / total) * 100) : 0;
        const viewingRate = total > 0 ? Math.round((viewing / total) * 100) : 0;
        const wonRate = total > 0 ? Math.round((won / total) * 100) : 0;

        return { total, contactedRate, viewingRate, wonRate };
    }, [partnerLeads]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [rfqFilter, setRfqFilter] = useState<'all' | 'finishing' | 'standard'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'descending' });

    const sortedAndFilteredLeads = useMemo(() => {
        if (!partnerLeads) return [];
        let filteredLeads = [...partnerLeads];

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredLeads = filteredLeads.filter(lead =>
                lead.customerName.toLowerCase().includes(lowercasedFilter) ||
                lead.serviceTitle.toLowerCase().includes(lowercasedFilter)
            );
        }

        if (statusFilter !== 'all') {
            filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
        }

        if (rfqFilter === 'finishing') {
            filteredLeads = filteredLeads.filter(lead => 
                lead.serviceType === 'finishing' || 
                (lead as any).category === 'turnkey' || 
                lead.serviceTitle?.includes('تشطيب') ||
                lead.serviceTitle?.toLowerCase().includes('finishing')
            );
        } else if (rfqFilter === 'standard') {
            filteredLeads = filteredLeads.filter(lead => 
                lead.serviceType !== 'finishing' && 
                (lead as any).category !== 'turnkey' && 
                !lead.serviceTitle?.includes('تشطيب') &&
                !lead.serviceTitle?.toLowerCase().includes('finishing')
            );
        }

        if (sortConfig !== null) {
            filteredLeads.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredLeads;
    }, [partnerLeads, searchTerm, statusFilter, rfqFilter, sortConfig]);

    const exportData = useMemo(() => sortedAndFilteredLeads.map(lead => ({
        ...lead,
        status: t_dash.leadStatus[lead.status] || lead.status,
        createdAt: new Date(lead.createdAt).toLocaleDateString(language),
    })), [sortedAndFilteredLeads, t_dash.leadStatus, language]);

    const exportColumns = {
        customerName: t_dash.leadTable.customer,
        customerPhone: t_dash.leadTable.phone,
        serviceTitle: t_dash.leadTable.service,
        status: t_dash.leadTable.status,
        createdAt: t_dash.leadTable.date,
    };

    if (isError) {
        return <ErrorState onRetry={refetch} />;
    }

    const getWhatsAppUrl = (phone: string, name: string) => {
        const clean = phone.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(
            language === 'ar'
                ? `مرحبًا أستاذ ${name}، بخصوص استفسارك على منصة ONLY HELIO.`
                : `Hello ${name}, regarding your inquiry on ONLY HELIO.`
        );
        return `https://wa.me/${clean}?text=${msg}`;
    };

    const statusOptions: { value: LeadStatus; label: string }[] = [
        { value: 'new', label: language === 'ar' ? 'جديد (New)' : 'New' },
        { value: 'contacted', label: language === 'ar' ? 'تم التواصل (Contacted)' : 'Contacted' },
        { value: 'site-visit', label: language === 'ar' ? 'معاينة (Viewing)' : 'Viewing' },
        { value: 'completed', label: language === 'ar' ? 'تم التعاقد (Won)' : 'Deal Closed (Won)' },
        { value: 'cancelled', label: language === 'ar' ? 'ملغي / خسارة (Lost)' : 'Lost / Cancelled' },
    ];

    const renderCard = (lead: Lead) => (
        <Card key={lead.id} className="p-0 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                     <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t_dash.leadTable.customer}</p>
                        <p className="font-bold text-gray-900 dark:text-white">{lead.customerName}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 font-mono" dir="ltr">{lead.customerPhone}</span>
                            <a 
                                href={getWhatsAppUrl(lead.customerPhone, lead.customerName)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                title="WhatsApp"
                            >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                            </a>
                            <a 
                                href={`tel:${lead.customerPhone}`}
                                className="p-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                                title="Call"
                            >
                                <PhoneIcon className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                    <StatusBadge status={lead.status} />
                </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t_dash.leadTable.service}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{lead.serviceTitle}</p>
                        {(lead.serviceType === 'finishing' || (lead as any).category === 'turnkey' || lead.serviceTitle?.includes('تشطيب')) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 whitespace-nowrap">
                                {language === 'ar' ? 'مناقصة تشطيب' : 'Finishing RFQ'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                     <p className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString(language)}</p>
                     <div className="flex items-center gap-1">
                        <select
                            value={lead.status}
                            onChange={(e) => statusMutation.mutate({ id: lead.id, status: e.target.value as LeadStatus })}
                            disabled={statusMutation.isPending}
                            className="text-xs py-1 px-2 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                     </div>
                </div>
            </CardContent>
            <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50">
                <Link to={`/dashboard/leads/${lead.id}`} className="w-full">
                    <Button variant="ghost" className="w-full text-xs">
                        View Details
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );

    const renderTable = (leads: Lead[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t_dash.leadTable.customer}</TableHead>
                        <TableHead>{t_dash.leadTable.service}</TableHead>
                        <TableHead>{t_dash.leadTable.date}</TableHead>
                        <TableHead>{t_dash.leadTable.status}</TableHead>
                        <TableHead>{language === 'ar' ? 'تحديث الحالة السريع' : 'Quick Status'}</TableHead>
                        <TableHead>{t_dash.leadTable.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} className="text-center p-8">Loading leads...</TableCell></TableRow>
                    ) : leads.map(lead => (
                        <TableRow key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <TableCell className="font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                <div>{lead.customerName}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-normal text-gray-500 dark:text-gray-400 text-xs font-mono" dir="ltr">{lead.customerPhone}</span>
                                    <a 
                                        href={getWhatsAppUrl(lead.customerPhone, lead.customerName)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                        title="WhatsApp"
                                    >
                                        <WhatsAppIcon className="w-3.5 h-3.5" />
                                    </a>
                                    <a 
                                        href={`tel:${lead.customerPhone}`}
                                        className="p-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                                        title="Call"
                                    >
                                        <PhoneIcon className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </TableCell>
                            <TableCell className="max-w-xs" title={lead.serviceTitle}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{lead.serviceTitle}</span>
                                    {(lead.serviceType === 'finishing' || (lead as any).category === 'turnkey' || lead.serviceTitle?.includes('تشطيب')) && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 whitespace-nowrap">
                                            {language === 'ar' ? 'مناقصة تشطيب' : 'Finishing RFQ'}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>{new Date(lead.createdAt).toLocaleDateString(language)}</TableCell>
                            <TableCell>
                                <StatusBadge status={lead.status} />
                            </TableCell>
                            <TableCell>
                                <select
                                    value={lead.status}
                                    onChange={(e) => statusMutation.mutate({ id: lead.id, status: e.target.value as LeadStatus })}
                                    disabled={statusMutation.isPending}
                                    className="text-xs py-1 px-2 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-amber-500"
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </TableCell>
                            <TableCell>
                                <Link to={`/dashboard/leads/${lead.id}`} className="font-medium text-amber-600 hover:text-amber-700 hover:underline text-xs">
                                    View Details
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
    
    const loadingSkeletons = (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="hidden lg:block">
                <TableSkeleton cols={6} />
            </div>
        </>
    );

    const emptyState = (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">{t_dash.leadTable.noLeads}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t_dash.leads}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {language === 'ar' ? 'إدارة العملاء المحتملين وتحديث مسار التحويل' : 'Manage inquiries and monitor conversion ROI'}
                    </p>
                </div>
                <ExportDropdown 
                    data={exportData} 
                    columns={exportColumns} 
                    filename="partner_leads_report" 
                />
            </div>

            {/* Partner ROI Metrics Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'إجمالي العملاء' : 'Total Leads'}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metrics.total}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'نسبة التواصل' : 'Contacted Rate'}</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.contactedRate}%</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'نسبة المعاينات' : 'Viewing Rate'}</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.viewingRate}%</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{language === 'ar' ? 'نسبة إتمام الصفقات' : 'Deals Won'}</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.wonRate}%</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                    <Input
                        type="text"
                        placeholder={t_dash.leadTable.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full"
                    >
                        <option value="all">{t_dash.leadTable.allStatuses}</option>
                        <option value="new">{t_dash.leadStatus.new}</option>
                        <option value="contacted">{t_dash.leadStatus.contacted}</option>
                        <option value="site-visit">{t_dash.leadStatus['site-visit']}</option>
                        <option value="completed">{t_dash.leadStatus.completed}</option>
                        <option value="cancelled">{t_dash.leadStatus.cancelled}</option>
                    </Select>
                </div>
                <div className="w-full md:w-56">
                    <Select
                        value={rfqFilter}
                        onChange={(e) => setRfqFilter(e.target.value as any)}
                        className="w-full"
                    >
                        <option value="all">{language === 'ar' ? 'جميع الطلبات والمقايسات' : 'All Inquiries & RFQs'}</option>
                        <option value="finishing">{language === 'ar' ? 'مناقصات التشطيب (RFQs)' : 'Finishing RFQs Only'}</option>
                        <option value="standard">{language === 'ar' ? 'استفسارات عامة' : 'Standard Inquiries'}</option>
                    </Select>
                </div>
            </div>

            {loading ? loadingSkeletons : (
                <ResponsiveList
                    items={sortedAndFilteredLeads}
                    renderTable={renderTable}
                    renderCard={renderCard}
                    emptyState={emptyState}
                />
            )}
        </div>
    );
};

export default DashboardLeadsPage;
