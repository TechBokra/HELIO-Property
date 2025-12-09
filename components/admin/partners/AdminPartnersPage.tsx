
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllPartnersForAdmin, updatePartnerStatus, deletePartner } from '../../../services/partners';
import { getPlans } from '../../../services/plans';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import type { AdminPartner, PartnerStatus } from '../../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import Pagination from '../../shared/Pagination';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { ToggleSwitch } from '../../ui/ToggleSwitch';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent } from '../../ui/Card';
import TableSkeleton from '../../shared/TableSkeleton';
import ErrorState from '../../shared/ErrorState';
import { useToast } from '../../shared/ToastContext';

const AdminPartnersPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();

    const { data: partners, isLoading, isError, refetch } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    useQuery({ queryKey: ['plans'], queryFn: getPlans }); 

    const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
    const [actionToConfirm, setActionToConfirm] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
    const highlightedId = searchParams.get('highlight');

    // Filter to show only external business partners
    const businessPartners = useMemo(() => {
        if (!partners) return [];
        return partners.filter(p => ['developer', 'finishing', 'agency'].includes(p.type));
    }, [partners]);

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: PartnerStatus }) => updatePartnerStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            showToast('Status updated successfully', 'success');
        },
        onError: () => showToast('Failed to update status', 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deletePartner(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            showToast('Partner deleted successfully', 'success');
            setActionToConfirm(null); // Close modal if open (for bulk)
        },
        onError: (error: any) => {
            console.error("Delete failed", error);
            showToast('Failed to delete partner. Check console for details.', 'error');
        }
    });

    const handleStatusToggle = (id: string, currentStatus: PartnerStatus) => {
        const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
        statusMutation.mutate({ id, status: newStatus });
    };

    // Prepare initial filters from URL
    const initialFilters = useMemo(() => ({
        type: searchParams.get('type') || 'all',
        status: searchParams.get('status') || 'all',
        plan: searchParams.get('plan') || 'all',
    }), [searchParams]);

    const {
        paginatedItems: paginatedPartners,
        totalPages,
        currentPage,
        setCurrentPage,
        searchTerm,
        setSearchTerm,
        filters,
        setFilter,
    } = useAdminTable({
        data: businessPartners,
        itemsPerPage: 15,
        initialSort: { key: 'name', direction: 'ascending' },
        initialFilters,
        searchFn: (p: AdminPartner, term: string) => p.name.toLowerCase().includes(term) || (p.nameAr && p.nameAr.toLowerCase().includes(term)) || p.email.toLowerCase().includes(term),
        filterFns: {
            type: (p: AdminPartner, v) => p.type === v,
            status: (p: AdminPartner, v) => p.status === v,
            plan: (p: AdminPartner, v) => p.subscriptionPlan === v
        }
    });
    
    const handleSelect = (partnerId: string) => {
        setSelectedPartners(prev =>
            prev.includes(partnerId) ? prev.filter(id => id !== partnerId) : [...prev, partnerId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPartners(paginatedPartners.map(p => p.id));
        } else {
            setSelectedPartners([]);
        }
    };

    const handleBulkAction = async () => {
        if (!actionToConfirm) return;

        const promises = selectedPartners.map(id => {
            switch (actionToConfirm) {
                case 'activate': return updatePartnerStatus(id, 'active');
                case 'deactivate': return updatePartnerStatus(id, 'disabled');
                case 'delete': return deletePartner(id);
                default: return Promise.resolve();
            }
        });
        
        try {
            await Promise.all(promises);
            showToast('Bulk action completed successfully', 'success');
        } catch (error) {
            showToast('Some actions failed', 'error');
        }
        
        setSelectedPartners([]);
        setActionToConfirm(null);
        queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
    };
    
    const updateUrlFilter = (key: string, value: string) => {
        setFilter(key, value);
        setSearchParams(prev => {
            if (value === 'all') {
                prev.delete(key);
            } else {
                prev.set(key, value);
            }
            return prev;
        }, { replace: true });
    };
    
    const getParentName = (parentId: string) => {
        const parent = partners?.find(p => p.id === parentId);
        return parent ? (language === 'ar' ? parent.nameAr : parent.name) : parentId;
    };

    const renderTable = (items: AdminPartner[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            {selectedPartners.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-sm">{selectedPartners.length} {t_admin.bulkActions.selected}</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setActionToConfirm('activate')}> {t_admin.bulkActions.activate}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setActionToConfirm('deactivate')}>{t_admin.bulkActions.deactivate}</Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setActionToConfirm('delete')}>{t_admin.bulkActions.delete}</Button>
                    </div>
                    <button onClick={() => setSelectedPartners([])} className={`text-sm font-medium text-gray-500 hover:text-gray-700 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`}>{t_admin.bulkActions.clear}</button>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"><input type="checkbox" onChange={handleSelectAll} checked={selectedPartners.length === items.length && items.length > 0} /></TableHead>
                        <TableHead>{t_admin.partnerTable.partner}</TableHead>
                        <TableHead>{t_admin.partnerTable.accountType}</TableHead>
                        <TableHead>{t_admin.partnerTable.type}</TableHead>
                        <TableHead>{t_admin.partnerTable.subscriptionPlan}</TableHead>
                        <TableHead>{t_admin.partnerTable.status}</TableHead>
                        <TableHead>{t_admin.partnerTable.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(p => (
                        <TableRow key={p.id} className={highlightedId === p.id ? 'highlight-item' : ''}>
                            <TableCell><input type="checkbox" checked={selectedPartners.includes(p.id)} onChange={() => handleSelect(p.id)}/></TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover"/>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{language === 'ar' ? p.nameAr : p.name}</div>
                                        <div className="text-xs text-gray-500">{p.email}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {p.parentId ? (
                                    <div className="text-xs">
                                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 px-2 py-0.5 rounded">{t_admin.partnerTable.subAccount}</span>
                                        <div className="text-gray-400 mt-1 flex items-center gap-1">
                                            <span>↳</span> {getParentName(p.parentId)}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs font-semibold text-amber-600">{t_admin.partnerTable.primaryAccount}</span>
                                )}
                            </TableCell>
                            <TableCell className="capitalize">{t_admin.partnerTypes[p.type as keyof typeof t_admin.partnerTypes]}</TableCell>
                            <TableCell className="capitalize">{p.subscriptionPlan}</TableCell>
                            <TableCell>
                                <ToggleSwitch 
                                    checked={p.status === 'active'}
                                    onChange={() => handleStatusToggle(p.id, p.status)}
                                    disabled={p.status === 'pending' || statusMutation.isPending}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Link to={`/admin/partners/edit/${p.id}`}>
                                        <Button variant="link" size="sm">{t.adminShared.edit}</Button>
                                    </Link>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (p: AdminPartner) => (
        <Card key={p.id} className={`relative ${selectedPartners.includes(p.id) ? 'ring-2 ring-amber-500' : ''}`}>
            <div className="absolute top-3 right-3 z-10">
                <input 
                    type="checkbox" 
                    className="h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    checked={selectedPartners.includes(p.id)} 
                    onChange={() => handleSelect(p.id)} 
                />
            </div>
            <CardContent className="p-5 flex flex-col items-center text-center">
                <img src={p.imageUrl} alt={p.name} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-gray-100 dark:border-gray-700"/>
                <h3 className="font-bold text-gray-900 dark:text-white truncate w-full">{language === 'ar' ? p.nameAr : p.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{p.email}</p>
                
                <div className="flex gap-2 mb-4 flex-wrap justify-center">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium capitalize">
                         {t_admin.partnerTypes[p.type as keyof typeof t_admin.partnerTypes]}
                    </span>
                    {p.parentId && <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded text-xs font-medium">Team Member</span>}
                </div>

                <div className="w-full flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3 mt-auto">
                    <ToggleSwitch 
                        checked={p.status === 'active'}
                        onChange={() => handleStatusToggle(p.id, p.status)}
                        disabled={p.status === 'pending' || statusMutation.isPending}
                    />
                     <Link to={`/admin/partners/edit/${p.id}`}>
                        <Button variant="link" size="sm">{t.adminShared.edit}</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
    
    const loadingSkeletons = (
        <>
            <div className="hidden lg:block"><TableSkeleton cols={7} rows={5} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:hidden">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>)}
            </div>
        </>
    );
    const emptyState = <div className="text-center py-8 text-gray-500">No partners found.</div>;

    if (isError) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div>
            {actionToConfirm && selectedPartners.length > 0 && (
                <ConfirmationModal
                    isOpen={!!actionToConfirm}
                    onClose={() => setActionToConfirm(null)}
                    onConfirm={handleBulkAction}
                    title={`${actionToConfirm.charAt(0).toUpperCase() + actionToConfirm.slice(1)} Partners`}
                    message={`Are you sure you want to ${actionToConfirm} ${selectedPartners.length} selected partner(s)?`}
                    confirmText={t_admin.bulkActions[actionToConfirm as 'activate' | 'deactivate' | 'delete']}
                    isLoading={deleteMutation.isPending || statusMutation.isPending}
                />
            )}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_admin.partnersTitle}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t_admin.partnersSubtitle}</p>
                </div>
                <Link to="/admin/partners/new">
                    <Button>{t.adminShared.add}</Button>
                </Link>
            </div>
            
            <div className="mb-4 flex flex-wrap gap-4">
                <Input placeholder={t_admin.filter.searchByNameOrEmail} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-xs"/>
                <Select value={filters.type || 'all'} onChange={e => updateUrlFilter('type', e.target.value)}>
                    <option value="all">{t_admin.filter.filterByType} ({t_admin.filter.all})</option>
                    {Object.entries(t_admin.partnerTypes)
                        .filter(([key]) => ['developer', 'agency', 'finishing'].includes(key))
                        .map(([key, value]) => <option key={key} value={key}>{value as string}</option>)}
                </Select>
                <Select value={filters.status || 'all'} onChange={e => updateUrlFilter('status', e.target.value)}>
                    <option value="all">{t_admin.filter.filterByStatus} ({t_admin.filter.all})</option>
                    {Object.entries(t_admin.partnerStatuses).map(([key, value]) => <option key={key} value={key}>{value as string}</option>)}
                </Select>
                 <Select value={filters.plan || 'all'} onChange={e => updateUrlFilter('plan', e.target.value)}>
                    <option value="all">{t_admin.filter.filterByPlan} ({t_admin.filter.all})</option>
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="elite">Elite</option>
                </Select>
            </div>

             <div className="lg:hidden mb-4 sticky top-16 z-20">
                 {selectedPartners.length > 0 && (
                    <div className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between gap-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md animate-fadeIn">
                        <span className="font-semibold text-sm whitespace-nowrap">{selectedPartners.length} selected</span>
                        <div className="flex gap-2">
                             <Button variant="secondary" size="sm" onClick={() => setActionToConfirm('activate')}>Activate</Button>
                            <Button variant="danger" size="sm" onClick={() => setActionToConfirm('delete')}>Delete</Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPartners([])} className="text-gray-500">X</Button>
                        </div>
                    </div>
                )}
            </div>
            
            {isLoading ? loadingSkeletons : (
                <ResponsiveList 
                    items={paginatedPartners}
                    renderTable={renderTable}
                    renderCard={renderCard}
                    emptyState={emptyState}
                />
            )}

            <div className="mt-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default AdminPartnersPage;
