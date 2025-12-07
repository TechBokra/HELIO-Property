

import React, { useState } from 'react';
import type { FilterOption } from '../../types';
import FilterItemFormModal from './FilterItemFormModal';
import { getAllPropertyTypes, getAllFinishingStatuses, getAllAmenities, deleteFilterOption as apiDeleteFilterOption } from '../../services/filters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';

type DataType = 'propertyType' | 'finishingStatus' | 'amenity';

const FilterManagerSection: React.FC<{
    title: string;
    items: FilterOption[];
    onAdd: () => void;
    onEdit: (item: FilterOption) => void;
    onDelete: (id: string) => void;
}> = ({ title, items, onAdd, onEdit, onDelete }) => {
    const { language, t } = useLanguage();
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                <button onClick={onAdd} className="bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-amber-600">
                    {t.adminShared.add}
                </button>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map(item => (
                    <li key={item.id} className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item[language]}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.en} / {item.ar}</p>
                        </div>
                        <div className="space-x-4">
                            <button onClick={() => onEdit(item)} className="text-sm font-medium text-amber-600 hover:text-amber-500">{t.adminShared.edit}</button>
                            <button onClick={() => onDelete(item.id)} className="text-sm font-medium text-red-600 hover:text-red-500">{t.adminShared.delete}</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};


const AdminFilterManagementPage: React.FC = () => {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [modalState, setModalState] = useState<{ isOpen: boolean; dataType?: DataType; itemToEdit?: FilterOption }>({ isOpen: false });

    const { data: propertyTypes = [], isLoading: ptLoading } = useQuery({ queryKey: ['propertyTypes'], queryFn: getAllPropertyTypes });
    const { data: finishingStatuses = [], isLoading: fsLoading } = useQuery({ queryKey: ['finishingStatuses'], queryFn: getAllFinishingStatuses });
    const { data: amenities = [], isLoading: amLoading } = useQuery({ queryKey: ['amenities'], queryFn: getAllAmenities });
    
    const deleteMutation = useMutation({
        mutationFn: ({ dataType, itemId }: { dataType: DataType, itemId: string }) => apiDeleteFilterOption(dataType, itemId),
        onSuccess: (_, { dataType }) => {
            if (dataType === 'propertyType') {
                queryClient.invalidateQueries({ queryKey: ['propertyTypes'] });
            } else if (dataType === 'finishingStatus') {
                 queryClient.invalidateQueries({ queryKey: ['finishingStatuses'] });
            } else if (dataType === 'amenity') {
                 queryClient.invalidateQueries({ queryKey: ['amenities'] });
            }
        }
    });

    const handleDelete = (dataType: DataType, itemId: string) => {
        if (window.confirm('Are you sure?')) {
            deleteMutation.mutate({ dataType, itemId });
        }
    };

    const handleSave = () => {
        setModalState({ isOpen: false });
        // Invalidate all queries on save
        queryClient.invalidateQueries({ queryKey: ['propertyTypes'] });
        queryClient.invalidateQueries({ queryKey: ['finishingStatuses'] });
        queryClient.invalidateQueries({ queryKey: ['amenities'] });
    };
    
    if (ptLoading || fsLoading || amLoading) return <div>Loading filters...</div>;

    return (
        <div className="space-y-8">
            {modalState.isOpen && modalState.dataType && (
                <FilterItemFormModal
                    dataType={modalState.dataType}
                    itemToEdit={modalState.itemToEdit}
                    onClose={() => setModalState({ isOpen: false })}
                    onSave={handleSave}
                />
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Filter Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage dropdown options for property filtering.</p>

            <FilterManagerSection
                title="Property Types"
                items={propertyTypes}
                onAdd={() => setModalState({ isOpen: true, dataType: 'propertyType' })}
                onEdit={(item) => setModalState({ isOpen: true, dataType: 'propertyType', itemToEdit: item })}
                onDelete={(id) => handleDelete('propertyType', id)}
            />
            <FilterManagerSection
                title="Finishing Statuses"
                items={finishingStatuses}
                onAdd={() => setModalState({ isOpen: true, dataType: 'finishingStatus' })}
                onEdit={(item) => setModalState({ isOpen: true, dataType: 'finishingStatus', itemToEdit: item })}
                onDelete={(id) => handleDelete('finishingStatus', id)}
            />
            <FilterManagerSection
                title="Amenities"
                items={amenities}
                onAdd={() => setModalState({ isOpen: true, dataType: 'amenity' })}
                onEdit={(item) => setModalState({ isOpen: true, dataType: 'amenity', itemToEdit: item })}
                onDelete={(id) => handleDelete('amenity', id)}
            />
        </div>
    );
};

export default AdminFilterManagementPage;