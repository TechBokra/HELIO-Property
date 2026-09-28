import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllProperties, updateProperty, deleteProperty } from '../../../services/properties';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import type { Property, ListingStatus } from '../../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import Pagination from '../../shared/Pagination';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent } from '../../ui/Card';
import TableSkeleton from '../../shared/TableSkeleton';
import { LocationMarkerIcon, CalendarIcon } from '../../ui/Icons';
import { Select } from '../../ui/Select';
import ErrorState from '../../shared/ErrorState';
import { getAllPropertyTypes, getAllFinishingStatuses } from '../../../services/filters';
import { StatusBadge } from '../../ui/StatusBadge';
import { useToast } from '../../shared/ToastContext';

interface AdminPropertiesListPageProps {
    title?: string;
    subtitle?: string;
    properties?: Property[];
    isLoading?: boolean;
    hideFilters?: ('search' | 'partner' | 'source')[];
}

const AdminPropertiesListPage: React.FC<AdminPropertiesListPageProps> = ({
    title: propTitle,
    subtitle: propSubtitle,
    properties: propProperties,
    isLoading: propIsLoading,
    hideFilters = [],
}) => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
    const [actionToConfirm, setActionToConfirm] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
    const highlightedId = searchParams.get('highlight');

    // Fetch data
    const { data: fetchedProperties, isLoading: fetchedIsLoading, isError, refetch } = useQuery({ 
        queryKey: ['allPropertiesAdmin'], 
        queryFn: getAllProperties,
        enabled: !propProperties 
    });

    const { data: propertyTypes } = useQuery({ queryKey: ['propertyTypes'], queryFn: getAllPropertyTypes });
    const { data: finishingStatuses } = useQuery({ queryKey: ['finishingStatuses'], queryFn: getAllFinishingStatuses });
    
    const properties = propProperties || fetchedProperties;
    const isLoading = propIsLoading || fetchedIsLoading;

    // Initial filters from URL
    const initialFilters = useMemo(() => ({
        status: searchParams.get('status') || 'all',
        type: searchParams.get('type') || 'all',
        finishing: searchParams.get('finishing') || 'all',
        verification: searchParams.get('verification') || 'all',
        availability: searchParams.get('availability') || 'all',
    }), [searchParams]);

    const { paginatedItems, totalPages, currentPage, setCurrentPage, searchTerm, setSearchTerm, filters, setFilter } = useAdminTable({
        data: properties,
        itemsPerPage: 10,
        initialSort: { key: 'listingStartDate', direction: 'descending' },
        initialFilters,
        searchFn: (item: Property, term) => 
            (item.title?.en?.toLowerCase().includes(term) || false) || 
            (item.title?.ar?.includes(term) || false) ||
            (item.partnerName?.toLowerCase().includes(term) || false) ||
            (item.referenceNumber?.toLowerCase().includes(term) || false) ||
            (item.id?.toLowerCase().includes(term) || false),
        filterFns: {
            status: (item: Property, value: string) => item.listingStatus === value,
            type: (item: Property, value: string) => item.type.en === value,
            finishing: (item: Property, value: string) => item.finishingStatus?.en === value,
            verification: (item: Property, value: string) => item.verificationStatus === value,
            availability: (item: Property, value: string) => (item.availabilityStatus || 'available') === value,
        },
    });

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: ListingStatus }) => updateProperty(id, { listingStatus: status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
            showToast('Listing status updated', 'success');
        }
    });

    const verificationMutation = useMutation({
        mutationFn: ({ id, verificationStatus }: { id: string, verificationStatus: 'verified' | 'pending' }) => 
            updateProperty(id, { verificationStatus }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
            showToast('Verification updated', 'success');
        }
    });

    const availabilityMutation = useMutation({
        mutationFn: ({ id, availabilityStatus }: { id: string, availabilityStatus: 'available' | 'reserved' | 'sold' }) => 
            updateProperty(id, { 
                availabilityStatus, 
                listingStatus: availabilityStatus === 'sold' ? 'sold' : 'active' 
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
            showToast('Availability updated', 'success');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteProperty(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
            showToast('Property deleted', 'success');
        }
    });
    
    const handleSelect = (propertyId: string) => {
        setSelectedProperties(prev =>
            prev.includes(propertyId) ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProperties(paginatedItems.map(p => p.id));
        } else {
            setSelectedProperties([]);
        }
    };

    const handleBulkAction = async () => {
        if (!actionToConfirm) return;
        const promises = selectedProperties.map(id => {
            switch (actionToConfirm) {
                case 'activate': return updateProperty(id, { listingStatus: 'active' });
                case 'deactivate': return updateProperty(id, { listingStatus: 'inactive' });
                case 'delete': return deleteProperty(id);
            }
            return Promise.resolve();
        });
        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
        setSelectedProperties([]);
        setActionToConfirm(null);
    };
    
    const updateUrlFilter = (key: string, value: string) => {
        setFilter(key, value);
        setSearchParams(prev => {
            if (value === 'all') prev.delete(key);
            else prev.set(key, value);
            return prev;
        }, { replace: true });
    };
    
    const renderTable = (items: Property[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
             {selectedProperties.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-sm">{selectedProperties.length} {t_admin.bulkActions.selected}</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setActionToConfirm('activate')}> {t_admin.bulkActions.activate}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setActionToConfirm('deactivate')}>{t_admin.bulkActions.deactivate}</Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setActionToConfirm('delete')}>{t_admin.bulkActions.delete}</Button>
                    </div>
                    <button onClick={() => setSelectedProperties([])} className={`text-sm font-medium text-gray-500 hover:text-gray-700 ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`}>{t_admin.bulkActions.clear}</button>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"><input type="checkbox" onChange={handleSelectAll} checked={selectedProperties.length === items.length && items.length > 0} /></TableHead>
                        <TableHead>{language === 'ar' ? 'الكود' : 'Ref'}</TableHead>
                        <TableHead>{t_admin.propertyTable.image}</TableHead>
                        <TableHead>{t.dashboard.propertyTable.title}</TableHead>
                        <TableHead>{t.propertiesPage.typeLabel}</TableHead>
                        <TableHead>{language === 'ar' ? 'السعر والتحديث' : 'Price & Updated'}</TableHead>
                        {!hideFilters.includes('partner') && <TableHead>{t_admin.propertyTable.partner}</TableHead>}
                        <TableHead>{language === 'ar' ? 'التوثيق' : 'Verification'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإتاحة' : 'Availability'}</TableHead>
                        <TableHead>{t_admin.propertyTable.liveStatus}</TableHead>
                        <TableHead>{t_admin.propertyTable.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(prop => {
                        const isVerified = prop.verificationStatus === 'verified';
                        const availability = prop.availabilityStatus || 'available';
                        const refCode = prop.referenceNumber || prop.id.slice(0, 8);

                        return (
                            <TableRow key={prop.id} className={highlightedId === prop.id ? 'highlight-item bg-amber-50 dark:bg-amber-900/10' : ''}>
                                <TableCell><input type="checkbox" checked={selectedProperties.includes(prop.id)} onChange={() => handleSelect(prop.id)}/></TableCell>
                                <TableCell>
                                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                        {refCode}
                                    </span>
                                </TableCell>
                                <TableCell><img src={prop.imageUrl} alt="" className="w-14 h-14 object-cover rounded-md" /></TableCell>
                                <TableCell className="font-medium text-gray-900 dark:text-white max-w-xs">
                                    <div className="truncate">{prop.title[language]}</div>
                                    {prop.projectName && (
                                        <span className="text-xs text-amber-600 dark:text-amber-400 block truncate">
                                            {prop.projectName[language]}
                                        </span>
                                    )}
                                    {prop.listingStatus === 'draft' && <span className="block text-xs text-amber-600 font-normal">(Draft / Pending Review)</span>}
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">{prop.type[language]}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{prop.price[language]}</div>
                                    {prop.priceUpdatedAt && (
                                        <div className="text-[10px] text-gray-400" title={prop.priceUpdatedAt}>
                                            {language === 'ar' ? 'محدث' : 'Updated'}: {new Date(prop.priceUpdatedAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </TableCell>
                                {!hideFilters.includes('partner') && <TableCell className="text-xs">{prop.partnerName || '-'}</TableCell>}
                                <TableCell>
                                    <button
                                        type="button"
                                        onClick={() => verificationMutation.mutate({ 
                                            id: prop.id, 
                                            verificationStatus: isVerified ? 'pending' : 'verified' 
                                        })}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                            isVerified 
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200' 
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
                                        }`}
                                        title={isVerified ? 'Click to unverify' : 'Click to verify'}
                                    >
                                        {isVerified ? '✓ موثق' : '⏳ قيد التحقق'}
                                    </button>
                                </TableCell>
                                <TableCell>
                                    <select
                                        value={availability}
                                        onChange={(e) => availabilityMutation.mutate({ 
                                            id: prop.id, 
                                            availabilityStatus: e.target.value as any 
                                        })}
                                        className="text-xs py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                    >
                                        <option value="available">{language === 'ar' ? 'متاح' : 'Available'}</option>
                                        <option value="reserved">{language === 'ar' ? 'محجوز' : 'Reserved'}</option>
                                        <option value="sold">{language === 'ar' ? 'تم البيع' : 'Sold'}</option>
                                    </select>
                                </TableCell>
                                <TableCell>
                                    <select
                                        value={prop.listingStatus}
                                        onChange={(e) => mutation.mutate({ 
                                            id: prop.id, 
                                            status: e.target.value as any 
                                        })}
                                        className={`text-xs font-semibold py-1 px-2 rounded border border-gray-200 dark:border-gray-700 ${
                                            prop.listingStatus === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                            prop.listingStatus === 'draft' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                            prop.listingStatus === 'sold' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                            'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        }`}
                                    >
                                        <option value="active">{language === 'ar' ? 'منشور (نشط)' : 'Active (Published)'}</option>
                                        <option value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
                                        <option value="inactive">{language === 'ar' ? 'مؤرشف' : 'Archived'}</option>
                                        <option value="sold">{language === 'ar' ? 'تم البيع' : 'Sold'}</option>
                                    </select>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Link to={`/admin/properties/edit/${prop.id}`}>
                                            <Button variant="link" size="sm">{t_admin.propertyTable.edit}</Button>
                                        </Link>
                                        <Link to={`/properties/${prop.id}`} target="_blank" className="text-xs text-gray-500 hover:text-amber-600 underline">
                                            {language === 'ar' ? 'معاينة' : 'View'}
                                        </Link>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
    
    const renderCard = (prop: Property) => {
        const isVerified = prop.verificationStatus === 'verified';
        const availability = prop.availabilityStatus || 'available';

        return (
            <Card key={prop.id} className={`overflow-hidden ${selectedProperties.includes(prop.id) ? 'ring-2 ring-amber-500' : ''}`}>
                 <div className="relative">
                    <img src={prop.imageUrl} alt="" className="w-full h-32 object-cover" />
                    <input type="checkbox" checked={selectedProperties.includes(prop.id)} onChange={() => handleSelect(prop.id)} className="absolute top-2 right-2 h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"/>
                    <div className="absolute bottom-2 left-2 flex gap-1">
                        <StatusBadge status={prop.listingStatus} className="shadow-sm" />
                        {isVerified && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                ✓ موثق
                            </span>
                        )}
                    </div>
                </div>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{prop.title[language]}</h3>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600">
                            {prop.referenceNumber || prop.id.slice(0, 6)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{prop.partnerName}</p>
                    <p className="font-bold text-amber-600 text-sm mt-1">{prop.price[language]}</p>
                    <div className="text-xs text-gray-400 mt-2 space-y-1">
                        <p className="flex items-center gap-1"><LocationMarkerIcon className="w-3 h-3"/> {prop.address[language]}</p>
                        <p className="flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> {new Date(prop.listingStartDate || 0).toLocaleDateString()}</p>
                    </div>
                </CardContent>
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-2">
                    <Link to={`/admin/properties/edit/${prop.id}`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full">{t_admin.propertyTable.edit}</Button>
                    </Link>
                    <Link to={`/properties/${prop.id}`} target="_blank" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">{language === 'ar' ? 'معاينة' : 'View'}</Button>
                    </Link>
                </div>
            </Card>
        );
    };
    
    const loadingSkeletons = (
        <>
            <div className="hidden lg:block"><TableSkeleton cols={7} rows={5} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:hidden">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>)}
            </div>
        </>
    );
    const emptyState = <div className="text-center py-8 text-gray-500">No properties found.</div>;

    if (isError && !properties) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div>
            {actionToConfirm && selectedProperties.length > 0 && (
                <ConfirmationModal
                    isOpen={!!actionToConfirm}
                    onClose={() => setActionToConfirm(null)}
                    onConfirm={handleBulkAction}
                    title={`${actionToConfirm.charAt(0).toUpperCase() + actionToConfirm.slice(1)} Properties`}
                    message={`Are you sure you want to ${actionToConfirm} ${selectedProperties.length} selected properties?`}
                    confirmText={t_admin.bulkActions[actionToConfirm as 'activate' | 'deactivate' | 'delete']}
                />
            )}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{propTitle || t_admin.propertiesTitle}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{propSubtitle || t_admin.propertiesSubtitle}</p>
                </div>
                <Link to="/admin/properties/new">
                    <Button>{t.dashboard.addProperty}</Button>
                </Link>
            </div>

            <div className="mb-4 flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                {!hideFilters.includes('search') && <Input placeholder={t_admin.filter.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm"/>}
                
                <Select value={filters.status || 'all'} onChange={(e) => updateUrlFilter('status', e.target.value)} className="max-w-xs">
                    <option value="all">All Publication Statuses</option>
                    <option value="active">Active (Published)</option>
                    <option value="draft">Draft (Under Review)</option>
                    <option value="inactive">Inactive</option>
                    <option value="sold">Sold</option>
                </Select>

                <Select value={filters.verification || 'all'} onChange={(e) => updateUrlFilter('verification', e.target.value)} className="max-w-xs">
                    <option value="all">{language === 'ar' ? 'جميع حالات التوثيق' : 'All Verification'}</option>
                    <option value="verified">{language === 'ar' ? 'موثق فقط' : 'Verified Only'}</option>
                    <option value="pending">{language === 'ar' ? 'قيد التحقق' : 'Pending Verification'}</option>
                </Select>

                <Select value={filters.availability || 'all'} onChange={(e) => updateUrlFilter('availability', e.target.value)} className="max-w-xs">
                    <option value="all">{language === 'ar' ? 'جميع حالات الإتاحة' : 'All Availability'}</option>
                    <option value="available">{language === 'ar' ? 'متاح' : 'Available'}</option>
                    <option value="reserved">{language === 'ar' ? 'محجوز' : 'Reserved'}</option>
                    <option value="sold">{language === 'ar' ? 'تم البيع' : 'Sold'}</option>
                </Select>

                <Select value={filters.type || 'all'} onChange={(e) => updateUrlFilter('type', e.target.value)} className="max-w-xs">
                    <option value="all">{t.propertiesPage.allTypes}</option>
                    {(propertyTypes || []).map(pt => <option key={pt.id} value={pt.en}>{pt[language]}</option>)}
                </Select>
                
                 <Select value={filters.finishing || 'all'} onChange={(e) => updateUrlFilter('finishing', e.target.value)} className="max-w-xs">
                    <option value="all">{t.propertiesPage.allFinishes}</option>
                    {(finishingStatuses || []).map(fs => <option key={fs.id} value={fs.en}>{fs[language]}</option>)}
                </Select>
            </div>

            {selectedProperties.length > 0 && (
                <div className="lg:hidden mb-4 sticky top-16 z-20">
                     {selectedProperties.length > 0 && (
                        <div className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between gap-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md animate-fadeIn">
                            <span className="font-semibold text-sm whitespace-nowrap">{selectedProperties.length} selected</span>
                            <div className="flex gap-2">
                                 <Button variant="secondary" size="sm" onClick={() => setActionToConfirm('activate')}>Activate</Button>
                                <Button variant="danger" size="sm" onClick={() => setActionToConfirm('delete')}>Delete</Button>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedProperties([])} className="text-gray-500">X</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {isLoading ? loadingSkeletons : (
                <ResponsiveList 
                    items={paginatedItems}
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

export default AdminPropertiesListPage;