
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllProperties, updateProperty } from '../../../services/properties';
// FIX: Corrected import path for useAdminTable hook.
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import type { Property, ListingStatus } from '../../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
// FIX: Corrected import path for Pagination from '../shared/Pagination' to '../../ui/Pagination'.
import Pagination from '../../shared/Pagination';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
// FIX: Corrected import path for AdminPropertyEditModal. The component is one directory level up.
import AdminPropertyEditModal from './AdminPropertyEditModal'; // Changed from ../AdminPropertyEditModal assuming it is in the same directory or check file list

const AdminPropertiesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;
    const queryClient = useQueryClient();

    const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);

    const { data: properties, isLoading } = useQuery({ 
        queryKey: ['allPropertiesAdmin'], 
        queryFn: getAllProperties 
    });

    const { paginatedItems, totalPages, currentPage, setCurrentPage, searchTerm, setSearchTerm } = useAdminTable({
        data: properties,
        itemsPerPage: 10,
        initialSort: { key: 'listingStartDate', direction: 'descending' },
        searchFn: (item: Property, term) => 
            item.title.en.toLowerCase().includes(term) || 
            item.title.ar.includes(term) ||
            (item.partnerName?.toLowerCase().includes(term) || false),
        filterFns: {},
    });

    return (
        <div>
            {propertyToEdit && (
                <AdminPropertyEditModal
                    property={propertyToEdit}
                    onClose={() => setPropertyToEdit(null)}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
                        setPropertyToEdit(null);
                    }}
                />
            )}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t_admin.propertiesTitle}</h1>
                 <Link to="/admin/properties/new">
                    <Button>{t.dashboard.addProperty}</Button>
                </Link>
            </div>

            <div className="mb-4">
                 <Input placeholder={t_admin.filter.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm"/>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t_admin.propertyTable.image}</TableHead>
                            <TableHead>{t.dashboard.propertyTable.title}</TableHead>
                            <TableHead>{t_admin.propertyTable.partner}</TableHead>
                            <TableHead>{t_admin.propertyTable.liveStatus}</TableHead>
                            <TableHead>{t_admin.propertyTable.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-8">Loading...</TableCell></TableRow>
                        ) : paginatedItems.length > 0 ? (
                            paginatedItems.map(prop => (
                                <TableRow key={prop.id}>
                                    <TableCell><img src={prop.imageUrl} alt="" className="w-16 h-16 object-cover rounded-md" /></TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">{prop.title[language]}</TableCell>
                                    <TableCell>{prop.partnerName}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${prop.listingStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {prop.listingStatus}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="link" onClick={() => setPropertyToEdit(prop)}>{t_admin.propertyTable.edit}</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={5} className="text-center p-8">No properties found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default AdminPropertiesPage;
