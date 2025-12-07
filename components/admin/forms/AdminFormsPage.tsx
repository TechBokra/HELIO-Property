
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllForms, deleteForm } from '../../../services/forms';
import type { FormDefinition, FormCategory } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Button } from '../../ui/Button';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { ClipboardDocumentListIcon, PlusIcon, TrashIcon } from '../../ui/Icons';
import AdminFormBuilder from './AdminFormBuilder';
import ConfirmationModal from '../../shared/ConfirmationModal';

const AdminFormsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const t_shared = t.adminShared;

    const { data: forms, isLoading } = useQuery({ queryKey: ['forms'], queryFn: getAllForms });

    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [formToEdit, setFormToEdit] = useState<FormDefinition | undefined>(undefined);
    const [formToDelete, setFormToDelete] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<FormCategory | 'all'>('all');

    const deleteMutation = useMutation({
        mutationFn: deleteForm,
        onSuccess: () => {
            showToast('Form deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['forms'] });
            setFormToDelete(null);
        }
    });

    const filteredForms = useMemo(() => {
        if (!forms) return [];
        if (activeTab === 'all') return forms;
        return forms.filter(f => f.category === activeTab);
    }, [forms, activeTab]);

    const handleEdit = (form: FormDefinition) => {
        setFormToEdit(form);
        setIsBuilderOpen(true);
    };

    const handleCreate = () => {
        setFormToEdit(undefined);
        setIsBuilderOpen(true);
    };

    const handleCloseBuilder = () => {
        setIsBuilderOpen(false);
        setFormToEdit(undefined);
        queryClient.invalidateQueries({ queryKey: ['forms'] });
    };

    if (isBuilderOpen) {
        return <AdminFormBuilder formToEdit={formToEdit} onClose={handleCloseBuilder} />;
    }

    const renderTable = (items: FormDefinition[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Form Title</TableHead>
                        <TableHead>Slug (ID)</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Fields</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(form => (
                        <TableRow key={form.id}>
                            <TableCell className="font-bold text-gray-900 dark:text-white">{form.title[language]}</TableCell>
                            <TableCell className="font-mono text-xs">{form.slug}</TableCell>
                            <TableCell>
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs capitalize">
                                    {form.category.replace('_', ' ')}
                                </span>
                            </TableCell>
                            <TableCell>{form.fields.length}</TableCell>
                            <TableCell>
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {form.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => handleEdit(form)}>{t_shared.edit}</Button>
                                    <Button variant="danger" size="sm" onClick={() => setFormToDelete(form.id)}><TrashIcon className="w-4 h-4"/></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (form: FormDefinition) => (
        <Card key={form.id}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 dark:text-white">{form.title[language]}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {form.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <p className="text-sm text-gray-500">{form.description?.[language]}</p>
                <div className="flex gap-2 text-xs mt-2">
                     <span className="font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">Slug: {form.slug}</span>
                     <span className="bg-blue-50 text-blue-600 p-1 rounded capitalize">{form.category.replace('_', ' ')}</span>
                </div>
            </CardContent>
            <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEdit(form)}>{t_shared.edit}</Button>
                <Button variant="danger" size="sm" onClick={() => setFormToDelete(form.id)}>{t_shared.delete}</Button>
            </CardFooter>
        </Card>
    );

    const categories: { id: FormCategory | 'all', label: string }[] = [
        { id: 'all', label: 'All Forms' },
        { id: 'public', label: 'Public Pages' },
        { id: 'lead_gen', label: 'Lead Generation' },
        { id: 'partner_app', label: 'Partner Apps' },
        { id: 'admin_internal', label: 'Internal' },
    ];

    return (
        <div>
             {formToDelete && (
                <ConfirmationModal
                    isOpen={!!formToDelete}
                    onClose={() => setFormToDelete(null)}
                    onConfirm={() => deleteMutation.mutate(formToDelete)}
                    title="Delete Form"
                    message={t_shared.confirmDelete}
                    confirmText="Delete"
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Form Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Create and manage dynamic forms for different sections.</p>
                </div>
                <Button onClick={handleCreate} className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Create Form
                </Button>
            </div>
            
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === cat.id
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </nav>
            </div>

            {isLoading ? <div className="text-center p-8">Loading forms...</div> : (
                <ResponsiveList 
                    items={filteredForms}
                    renderTable={renderTable}
                    renderCard={renderCard}
                    emptyState={<div className="text-center p-8 text-gray-500">No forms found in this category.</div>}
                />
            )}
        </div>
    );
};

export default AdminFormsPage;
