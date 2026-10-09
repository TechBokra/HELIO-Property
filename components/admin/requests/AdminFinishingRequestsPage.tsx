
import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Language, Lead, LeadStatus } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import { ChevronRightIcon } from '../../ui/Icons';
import { inputClasses } from '../../ui/FormField';
import ExportDropdown from '../../shared/ExportDropdown';
import { updateLead, deleteLead as apiDeleteLead, getAllLeads } from '../../../services/leads';
import { useQuery } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '../../../services/partners';
import Pagination from '../../shared/Pagination';
// FIX: Corrected import path for useAdminTable hook.
import { useAdminTable } from '../../hooks/useAdminTable';
import ConversationThread from '../../shared/ConversationThread';
import { useLanguage } from '../../shared/LanguageContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';

const statusColors: { [key in LeadStatus]: string } = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'site-visit': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    quoted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    'in-progress': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const ITEMS_PER_PAGE = 10;

const AdminFinishingRequestsPage: React.FC = () => {
    const { language, t: i18n } = useLanguage();
    const t = i18n.adminDashboard;
    const t_dash = i18n.dashboard;
    
    const { data: allLeads, isLoading: isLoadingLeads, refetch: refetchLeads } = useQuery({ queryKey: ['allLeadsAdmin'], queryFn: getAllLeads });
    const { data: partners, isLoading: isLoadingPartners, refetch: refetchPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const isLoading = isLoadingLeads || isLoadingPartners;
    const refetchAll = useCallback(() => {
        refetchLeads();
        refetchPartners();
    }, [refetchLeads, refetchPartners]);

    const finishingLeads = useMemo(() => (allLeads || []).filter(l => l.serviceType === 'finishing'), [allLeads]);
    
    const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

    const {
        paginatedItems: paginatedLeads,
        totalPages,
        currentPage, setCurrentPage,
        searchTerm, setSearchTerm,
        filters, setFilter,
    } = useAdminTable({
        data: finishingLeads,
        itemsPerPage: ITEMS_PER_PAGE,
        initialSort: { key: 'createdAt', direction: 'descending' },
        searchFn: (lead: Lead, term: string) => 
            lead.customerName.toLowerCase().includes(term) ||
            (lead.partnerName?.toLowerCase().includes(term) || false),
        filterFns: {
            startDate: (l: Lead, v: string) => new Date(l.createdAt) >= new Date(v),
            endDate: (l: Lead, v: string) => new Date(l.createdAt) <= new Date(v),
        }
    });

    const handleStatusChange = async (leadId: string, status: LeadStatus) => {
        await updateLead(leadId, { status });
        refetchAll();
    };
    
    const toggleExpand = (leadId: string) => {
        setExpandedLeadId(prevId => (prevId === leadId ? null : leadId));
    };
    
    const handleDelete = async (leadId: string) => {
        if (window.confirm(t_dash.leadTable.confirmDelete)) {
            await apiDeleteLead(leadId);
            refetchAll();
        }
    };
    
    const exportData = useMemo(() => paginatedLeads.map(lead => ({
        ...lead,
        status: t_dash.leadStatus[lead.status] || lead.status,
        createdAt: new Date(lead.createdAt).toLocaleDateString(language)
    })), [paginatedLeads, t_dash.leadStatus, language]);

    const exportColumns = {
        customerName: t_dash.leadTable.customer,
        partnerName: t.propertyTable.partner,
        customerPhone: t_dash.leadTable.phone,
        serviceTitle: t_dash.leadTable.service,
        status: t_dash.leadTable.status,
        createdAt: t_dash.leadTable.date,
    };

    const renderTable = (items: Lead[]) => (
         <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="py-3 w-8"></TableHead>
                        <TableHead>{t_dash.leadTable.customer}</TableHead>
                        <TableHead>{t_dash.leadTable.service}</TableHead>
                        <TableHead>{t_dash.leadTable.date}</TableHead>
                        <TableHead>{t_dash.leadTable.status}</TableHead>
                        <TableHead>{t_dash.leadTable.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center p-8">Loading requests...</TableCell></TableRow>
                    ) : items.length > 0 ? (
                        items.map(lead => (
                            <React.Fragment key={lead.id}>
                                <TableRow>
                                    <TableCell className="px-1">
                                        <button onClick={() => toggleExpand(lead.id)} className="p-2">
                                            <ChevronRightIcon className={`w-5 h-5 transition-transform ${expandedLeadId === lead.id ? 'rotate-90' : ''}`} />
                                        </button>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        <div>{lead.customerName}</div>
                                        <div className="font-normal text-gray-500 dark:text-gray-400" dir="ltr">{lead.customerPhone}</div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate" title={lead.serviceTitle}>{lead.serviceTitle}</TableCell>
                                    <TableCell>{new Date(lead.createdAt).toLocaleDateString(language)}</TableCell>
                                    <TableCell>
                                        <select value={lead.status} onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)} className={`text-xs font-medium px-2.5 py-0.5 rounded-full border-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-gray-800 ${statusColors[lead.status]}`}>
                                            {Object.entries(t_dash.leadStatus).map(([key, value]) => (<option key={key} value={key} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{value as string}</option>))}
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        <button onClick={() => handleDelete(lead.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">
                                            {t_dash.leadTable.delete}
                                        </button>
                                    </TableCell>
                                </TableRow>
                                {expandedLeadId === lead.id && (
                                    <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                        <TableCell colSpan={6} className="p-0">
                                            <div className="p-4 animate-fadeIn">
                                                <ConversationThread lead={lead} onMessageSent={refetchAll} requestId={lead.id} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={6} className="text-center p-8">{t_dash.leadTable.noLeads}</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (lead: Lead) => (
        <Card key={lead.id}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                     <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{lead.customerName}</h3>
                        <p className="text-sm text-gray-500" dir="ltr">{lead.customerPhone}</p>
                    </div>
                     <p className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString(language)}</p>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 font-medium">{lead.serviceTitle}</p>
                 <div className="mt-2">
                     <select 
                        value={lead.status} 
                        onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)} 
                        className={`w-full text-xs font-medium px-2 py-2 rounded-md border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${statusColors[lead.status]}`}
                    >
                        {Object.entries(t_dash.leadStatus).map(([key, value]) => (<option key={key} value={key} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{value as string}</option>))}
                    </select>
                </div>
            </CardContent>
            <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                 <Button variant="ghost" size="sm" onClick={() => handleDelete(lead.id)} className="text-red-500 hover:bg-red-50">
                     {t_dash.leadTable.delete}
                 </Button>
                 <Link to={`/admin/finishing-requests/${lead.id}`}>
                     <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-50">View Details</Button>
                 </Link>
            </CardFooter>
        </Card>
    );

    return (
        <div>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.nav.finishingRequests}</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage all finishing service requests.</p>
                </div>
                 <ExportDropdown
                    data={exportData}
                    columns={exportColumns}
                    filename="finishing-requests"
                />
            </div>

             <div className="my-8 p-6 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1">
                        <input type="text" placeholder={t.filter.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={inputClasses} />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.filter.leadDateRange}</label>
                        <div className="flex items-center gap-2">
                            <input type="date" value={filters.startDate || ''} onChange={e => setFilter('startDate', e.target.value)} className={inputClasses} />
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                            <input type="date" value={filters.endDate || ''} onChange={e => setFilter('endDate', e.target.value)} className={inputClasses} />
                        </div>
                    </div>
                </div>
            </div>
            
            <ResponsiveList
                items={paginatedLeads}
                renderTable={renderTable}
                renderCard={renderCard}
                emptyState={<div className="text-center p-8 text-gray-500">{t_dash.leadTable.noLeads}</div>}
            />

             <div className="mt-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default AdminFinishingRequestsPage;
