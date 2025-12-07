

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PortfolioItem } from '../../types';
import FormField, { inputClasses } from '../ui/FormField';
import { CloseIcon } from '../ui/Icons';
import { useAuth } from '../auth/AuthContext';
import { addPortfolioItem, updatePortfolioItem } from '../../services/portfolio';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';

interface PortfolioItemFormModalProps {
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

const PortfolioItemFormModal: React.FC<PortfolioItemFormModalProps> = ({ itemToEdit, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const { currentUser } = useAuth();
    const t_dash = t.dashboard;
    const t_form = t.portfolioForm;
    const t_shared = t.adminShared;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const modalRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        title: { ar: itemToEdit?.title.ar || '', en: itemToEdit?.title.en || '' },
        category: { ar: itemToEdit?.category.ar || '', en: itemToEdit?.category.en || '' },
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(itemToEdit?.imageUrl || null);

    const handleSuccess = () => {
        showToast(`Item ${itemToEdit ? 'updated' : 'added'} successfully!`, 'success');
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
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [field, lang] = name.split('.');
        setFormData(prev => ({ ...prev, [field]: { ...(prev as any)[field], [lang]: value } }));
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
        if (!currentUser) return;

        let imageSrc = itemToEdit?.imageUrl || '';
        if (imageFile) {
            imageSrc = await fileToBase64(imageFile);
        }

        const dataToSave = {
            ...formData,
            partnerId: currentUser.id,
            imageUrl: imageSrc,
            alt: formData.title.en || 'Portfolio work',
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
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex-grow contents">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-amber-500">{itemToEdit ? t_form.editTitle : t_form.addTitle}</h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-6 space-y-4">
                        <FormField label={t_dash.workImageURL} id="imageUrl">
                            <div className="flex items-center gap-4">
                                {imagePreview && <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border" />}
                                <input
                                    type="file"
                                    id="imageUrl"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className={`${inputClasses} p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100`}
                                    required={!itemToEdit}
                                />
                            </div>
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label={t_dash.workTitleAr} id="title.ar">
                                <input type="text" name="title.ar" value={formData.title.ar} onChange={handleChange} className={inputClasses} required />
                            </FormField>
                            <FormField label={t_dash.workTitleEn} id="title.en">
                                <input type="text" name="title.en" value={formData.title.en} onChange={handleChange} className={inputClasses} required />
                            </FormField>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label={t_dash.workCategoryAr} id="category.ar">
                                <input type="text" name="category.ar" value={formData.category.ar} onChange={handleChange} className={inputClasses} required />
                            </FormField>
                            <FormField label={t_dash.workCategoryEn} id="category.en">
                                <input type="text" name="category.en" value={formData.category.en} onChange={handleChange} className={inputClasses} required />
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

export default PortfolioItemFormModal;