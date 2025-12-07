
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllRequests, updateRequest } from '../../../services/requests';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import { Request, RequestStatus, RequestType, Lead, Role } from '../../../types';
import Pagination from '../../shared/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { ResponsiveList } from '../../shared/ResponsiveList';
import CardSkeleton from '../../ui/CardSkeleton';
import TableSkeleton from '../../shared/TableSkeleton';
import { PlusIcon } from '../../ui/Icons';
import { StatusBadge } from '../../ui/StatusBadge';

const AdminAllRequestsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { currentUser } = useAuth();
    const t_admin = t.adminDashboard;
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
    const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;

    const { data: requests, isLoading: loadingRequests } = useQuery({ queryKey: ['allRequests'], queryFn: getAllRequests });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const isLoading = loadingRequests || loadingPartners;

    const managers = useMemo(() => (partners || []).filter(p => p.role.includes('_manager') || p.role === Role.SUPER_ADMIN), [partners]);

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<Request> }) => updateRequest(id, updates),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allRequests'] }),
    });
    
    const filteredData = useMemo(() => {
        if (!requests) return [];
        if (isSuperAdmin && viewMode === 'mine') {
            return requests.filter(req => req.assignedTo === currentUser?.id);
        }
        if (!isSuperAdmin) {
            return requests.filter(req => req.assignedTo === currentUser?.id);
        }
        return requests;
    }, [requests, isSuperAdmin, viewMode, currentUser]);
    
    // Initial filters from URL
    const initialFilters = useMemo(() => ({
        type: searchParams.get('type') || 'all',
        status: searchParams.get('status') || 'all',
        assignedTo: searchParams.get('assignedTo') || 'all',
    }), [searchParams]);

    const { paginatedItems, totalPages, currentPage, setCurrentPage, searchTerm, setSearchTerm, filters, setFilter } = useAdminTable({
        data: filteredData,
        itemsPerPage: 15,
        initialSort: { key: 'createdAt', direction: 'descending' },
        initialFilters,
        searchFn: (item: Request, term: string) => item.requesterInfo.name.toLowerCase().includes(term),
        filterFns: {
            type: (item: Request, value: string) => item.type === value,
            status: (item: Request, value: string) => item.status === value,
            assignedTo: (item: Request, value: string) => item.assignedTo === value,
        },
    });
    
    const updateUrlFilter = (key: string, value: string) => {
        setFilter(key, value);
        setSearchParams(prev => {
            if (value === 'all') prev.delete(key);
            else prev.set(key, value);
            return prev;
        }, { replace: true });
    };

    const getSubject = (request: Request) => {
        const payload = request.payload as any;
        switch (request.type) {
            case RequestType.LEAD: return payload.serviceTitle;
            case RequestType.PROPERTY_LISTING_REQUEST: return `${payload.propertyDetails.propertyType[language]} - ${payload.propertyDetails.address}`;
            case RequestType.CONTACT_MESSAGE: 
                const message = payload.message || '';
                return message.length > 70 ? message.substring(0, 70) + '...' : message;
            case RequestType.PROPERTY_INQUIRY: 
                const details = payload.details || '';
                return details.length > 70 ? details.substring(0, 70) + '...' : details;
            case RequestType.PARTNER_APPLICATION: return payload.companyName;
            default: return 'N/A';
        }
    };

    // Helper to route to the specific domain detail page
    const getDetailLink = (req: Request) => {
        switch (req.type) {
            case RequestType.PARTNER_APPLICATION:
                return `/admin/partners/requests/${req.id}`;
            case RequestType.PROPERTY_LISTING_REQUEST:
                return `/admin/properties/listing-requests/${req.id}`;
            case RequestType.LEAD:
                const lead = req.payload as Lead;
                if (lead.serviceType === 'finishing') return `/admin/platform-finishing/requests/${req.id}`;
                if (lead.serviceType === 'decorations') return `/admin/platform-decorations/requests/${req.id}`;
                return `/admin/requests/${req.id}`; // Fallback
            case RequestType.PROPERTY_INQUIRY:
                // Inquiries often don't have a full detail page, just a list view, 
                // but if we use the generic viewer it's fine for now.
                return `/admin/requests/${req.id}`; 
            default:
                return `/admin/requests/${req.id}`;
        }
    };
    
    const pageTitle = isSuperAdmin 
        ? t.adminDashboard.requestsTriage.title 
        : t.adminDashboard.nav.myRequests;
    
    const pageSubtitle = isSuperAdmin
        ? t.adminDashboard.requestsTriage.subtitle
        : (t.adminDashboard as any).manageLeadsSubtitle;

    const renderCard = (req: Request) => (
        <Card key={req.id} className="p-0 hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <p className="font-bold text-lg">{req.requesterInfo.name}</p>
                    <StatusBadge status={req.status} />
                </div>
                <p className="text-xs font-bold uppercase text-gray-500">{t.adminDashboard.requestTypes[req.type]}</p>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                    <p className="text-sm"><strong className="text-gray-500">Subject: </strong> <span className="line-clamp-2">{getSubject(req)}</span></p>
                    <p className="text-sm"><strong className="text-gray-500">Date: </strong> {new Date(req.createdAt).toLocaleDateString()}</p>
                    <div className="text-sm"><strong className="text-gray-500">Assigned To: </strong> 
                        <Select
                            value={req.assignedTo || ''}
                            onChange={(e) => updateStatusMutation.mutate({ id: req.id, updates: { assignedTo: e.target.value, status: 'assigned' } })}
                            className="text-xs w-full mt-1 h-8 py-1"
                            disabled={!isSuperAdmin}
                        >
                            <option value="">Unassigned</option>
                            {(managers || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                    </div>
                </div>
            </CardContent>
             <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                <Link to={getDetailLink(req)} className="w-full">
                    <Button variant="ghost" className="w-full text-amber-600 hover:text-amber-700">View Details</Button>
                </Link>
            </CardFooter>
        </Card>
    );

    const renderTable = (items: Request[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                 <TableBody>
                    {items.map(req => (
                        <TableRow key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <TableCell className="font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t.adminDashboard.requestTypes[req.type]}</TableCell>
                            <TableCell>
                                <div className="font-medium">{req.requesterInfo.name}</div>
                                <div className="text-xs text-gray-400">{req.requesterInfo.phone}</div>
                            </TableCell>
                            <TableCell className="max-w-xs whitespace-normal break-words" title={getSubject(req)}>{getSubject(req)}</TableCell>
                            <TableCell className="text-xs">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                                 <StatusBadge status={req.status} />
                            </TableCell>
                            <TableCell>
                                <Select
                                    value={req.assignedTo || ''}
                                    onChange={(e) => updateStatusMutation.mutate({ id: req.id, updates: { assignedTo: e.target.value, status: 'assigned' } })}
                                    className="text-xs w-40 h-8 py-0"
                                    disabled={!isSuperAdmin}
                                >
                                    <option value="">Unassigned</option>
                                    {(managers || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </Select>
                            </TableCell>
                            <TableCell>
                                <Link to={getDetailLink(req)}><Button variant="link" size="sm" className="text-amber-600 hover:text-amber-700">Details</Button></Link>
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
                <TableSkeleton cols={7} />
            </div>
        </>
    );
    
    const emptyState = (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500">No requests found matching your criteria.</p>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{pageTitle}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{pageSubtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    {isSuperAdmin && (
                        <div className="hidden sm:flex flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg gap-1">
                            <Button variant={viewMode === 'mine' ? 'primary' : 'ghost'} onClick={() => setViewMode('mine')} className="!py-1.5 text-sm">{t.adminDashboard.requestsTriage.myRequests}</Button>
                            <Button variant={viewMode === 'all' ? 'primary' : 'ghost'} onClick={() => setViewMode('all')} className="!py-1.5 text-sm">{t.adminDashboard.requestsTriage.allRequests}</Button>
                        </div>
                    )}
                    <Link to="/admin/requests/new">
                        <Button className="flex items-center gap-2 shadow-sm">
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">{t.adminShared.add} Request</span>
                            <span className="sm:hidden">{t.adminShared.add}</span>
                        </Button>
                    </Link>
                </div>
            </div>
            
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <Input placeholder={t_admin.filter.searchByRequesterOrPhone} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <Select value={filters.type || 'all'} onChange={e => updateUrlFilter('type', e.target.value)}>
                    <option value="all">{t_admin.filter.all} Types</option>
                    {Object.entries(t_admin.requestTypes).map(([key, value]) => <option key={key} value={key}>{value as string}</option>)}
                </Select>
                 <Select value={filters.status || 'all'} onChange={e => updateUrlFilter('status', e.target.value)}>
                    <option value="all">{t_admin.filter.all} Statuses</option>
                    {Object.entries(t_admin.adminRequests.requestStatus).map(([key, value]) => <option key={key} value={key}>{value as string}</option>)}
                </Select>
                 {isSuperAdmin && viewMode === 'all' && (
                    <Select value={filters.assignedTo || 'all'} onChange={e => updateUrlFilter('assignedTo', e.target.value)}>
                        <option value="all">{t_admin.filter.all} Assignees</option>
                        {(managers || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                 )}
            </div>
            
            {isLoading ? loadingSkeletons : (
                <>
                    <ResponsiveList
                        items={paginatedItems}
                        renderCard={renderCard}
                        renderTable={renderTable}
                        emptyState={emptyState}
                    />
                    <div className="mt-6">
                         <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminAllRequestsPage;
