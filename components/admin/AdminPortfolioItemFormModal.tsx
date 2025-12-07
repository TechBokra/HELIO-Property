



import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Language, PortfolioItem } from '../../types';
import FormField, { inputClasses, selectClasses } from '../ui/FormField';
import { CloseIcon } from '../ui/Icons';
import { getDecorationCategories } from '../../services/decorations';
import { addPortfolioItem, updatePortfolioItem } from '../../services/portfolio';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { useToast } from '../shared/ToastContext';

interface AdminPortfolioItemFormModalProps {
    itemToEdit?: PortfolioItem;
    onClose: () => void;
    onSave: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const AdminPortfolioItemFormModal: React.FC<AdminPortfolioItemFormModalProps> = ({ itemToEdit, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const t_admin = t.adminDashboard.decorationsManagement;
    const t_shared = t.adminShared;
    const { data: decorationCategories, isLoading: categoriesLoading } = useQuery({ queryKey: ['decorationCategories'], queryFn: getDecorationCategories });
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        title: { ar: itemToEdit?.title?.ar || '', en: itemToEdit?.title?.en || '' },
        categoryId: decorationCategories?.find(c => c.name.en === itemToEdit?.category.en)?.id || '',
        price: itemToEdit?.price || '',
        dimensions: itemToEdit?.dimensions || '',
        availability: itemToEdit?.availability || 'In Stock',
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(itemToEdit?.imageUrl || null);
    
    useEffect(() => {
        if (decorationCategories && decorationCategories.length > 0 && !formData.categoryId) {
            setFormData(prev => ({...prev, categoryId: decorationCategories[0].id}));
        }
    }, [decorationCategories, formData.categoryId]);

    const handleSuccess = () => {
        showToast(`Portfolio item ${itemToEdit ? 'updated' : 'added'} successfully!`, 'success');
        onSave();
    };

    const addMutation = useMutation({
        mutationFn: addPortfolioItem,
        onSuccess: handleSuccess,
        onError: () => showToast('Failed to add item.', 'error'),
    });
    
    const updateMutation = useMutation({
        mutationFn: (data: { id: string, updates: Partial<PortfolioItem> }) => updatePortfolioItem(data.id, data.updates),
        onSuccess: handleSuccess,
        onError: () => showToast('Failed to update item.', 'error'),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [field, lang] = name.split('.');
            setFormData(prev => ({ ...prev, [field]: { ...(prev as any)[field], [lang]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let imageSrc = itemToEdit?.imageUrl || '';
        if (imageFile) {
            imageSrc = await fileToBase64(imageFile);
        }
        
        const selectedCategory = decorationCategories?.find(c => c.id === formData.categoryId);
        if (!selectedCategory) {
            showToast("Please select a valid category.", "error");
            return;
        }

        const dataToSave = {
            title: formData.title,
            partnerId: 'admin-user',
            category: selectedCategory.name,
            imageUrl: imageSrc,
            alt: formData.title.en || 'Decoration work',
            price: formData.price ? parseInt(String(formData.price), 10) : undefined,
            dimensions: formData.dimensions || undefined,
            availability: formData.availability as 'In Stock' | 'Made to Order',
        };

        if (itemToEdit) {
            updateMutation.mutate({ id: itemToEdit.id, updates: dataToSave });
        } else {
            addMutation.mutate(dataToSave as Omit<PortfolioItem, 'id'>);
        }
    };
    
    const isLoading = addMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={onClose}>
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex-grow contents">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-amber-500">{itemToEdit ? t_admin.editItem : t_admin.addNewItem}</h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-6 space-y-6">
                        <FormField label={t_dash.workImageURL} id="imageUrl">
                            <div className="flex items-center gap-4">
                                {imagePreview && <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border-2" />}
                                <input type="file" id="imageUrl" accept="image/*" onChange={handleFileChange} className={`${inputClasses} p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100`} required={!itemToEdit} />
                            </div>
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label={t_dash.workTitleAr} id="title.ar"><input type="text" name="title.ar" value={formData.title.ar} onChange={handleChange} className={inputClasses} required /></FormField>
                            <FormField label={t_dash.workTitleEn} id="title.en"><input type="text" name="title.en" value={formData.title.en} onChange={handleChange} className={inputClasses} required /></FormField>
                        </div>
                         <div>
                            <FormField label={t_admin.itemCategory} id="categoryId">
                               <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={selectClasses} required disabled={categoriesLoading}>
                                    {(decorationCategories || []).map(c => <option key={c.id} value={c.id}>{c.name[language]}</option>)}
                                </select>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                            <FormField label="Price (EGP)" id="price">
                                <input type="number" name="price" value={formData.price} onChange={handleChange} className={inputClasses} placeholder="e.g. 5000" />
                            </FormField>
                            <FormField label="Dimensions" id="dimensions">
                                <input type="text" name="dimensions" value={formData.dimensions} onChange={handleChange} className={inputClasses} placeholder="e.g. 120cm x 80cm" />
                            </FormField>
                            <FormField label="Availability" id="availability">
                                <select name="availability" value={formData.availability} onChange={handleChange} className={selectClasses}>
                                    <option value="In Stock">{t.decorationsPage.inStock}</option>
                                    <option value="Made to Order">{t.decorationsPage.madeToOrder}</option>
                                </select>
                            </FormField>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={onClose}>{t_shared.cancel}</Button>
                        <Button type="submit" isLoading={isLoading}>
                            {t_shared.save}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminPortfolioItemFormModal;
