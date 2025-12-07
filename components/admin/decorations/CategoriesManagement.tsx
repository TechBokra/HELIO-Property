
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DecorationCategory } from '../../../types';
import { getDecorationCategories, deleteDecorationCategory as apiDeleteDecorationCategory } from '../../../services/decorations';
import AdminDecorationCategoryFormModal from '../AdminDecorationCategoryFormModal';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';

const CategoriesManagement: React.FC = () => {
    const { language, t } = useLanguage();
    const t_decor = t.adminDashboard.decorationsManagement;
    const { data: categories, isLoading: loading } = useQuery({ queryKey: ['decorationCategories'], queryFn: getDecorationCategories });
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [modalState, setModalState] = useState<{ isOpen: boolean; categoryToEdit?: DecorationCategory }>({ isOpen: false });

    const deleteMutation = useMutation({
        mutationFn: apiDeleteDecorationCategory,
        onSuccess: () => {
            showToast('Category deleted successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['decorationCategories'] });
        },
        onError: () => {
            showToast('Failed to delete category.', 'error');
        }
    });

    const handleDelete = async (categoryId: string) => {
        if (window.confirm(t_decor.confirmDelete.replace('item', 'category'))) {
            deleteMutation.mutate(categoryId);
        }
    };

    const handleSave = () => {
        setModalState({ isOpen: false });
        queryClient.invalidateQueries({ queryKey: ['decorationCategories'] });
    };

    return (
        <div className="animate-fadeIn">
            {modalState.isOpen && <AdminDecorationCategoryFormModal categoryToEdit={modalState.categoryToEdit} onClose={() => setModalState({ isOpen: false })} onSave={handleSave} />}
            
            <div className="flex justify-end mb-4">
                <button onClick={() => setModalState({ isOpen: true })} className="bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-amber-600">
                    {t_decor.addNewCategory}
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                        <li className="p-8 text-center">Loading...</li>
                    ) : (categories || []).map(cat => (
                        <li key={cat.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{cat.name[language]}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{cat.description[language]}</p>
                            </div>
                            <div className="space-x-4">
                                <button onClick={() => setModalState({ isOpen: true, categoryToEdit: cat })} className="font-medium text-amber-600 hover:underline">{t.adminShared.edit}</button>
                                <button onClick={() => handleDelete(cat.id)} disabled={deleteMutation.isPending} className="font-medium text-red-600 hover:underline disabled:opacity-50">{t.adminShared.delete}</button>
                            </div>
                        </li>
                    ))}
                     {(categories || []).length === 0 && !loading && (
                        <li className="p-8 text-center text-gray-500">No categories found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CategoriesManagement;
