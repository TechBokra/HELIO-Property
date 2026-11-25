



import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role, type PortfolioItem } from '../../types';
import FormField, { inputClasses, selectClasses } from '../ui/FormField';
import { CloseIcon } from '../ui/Icons';
import { getDecorationCategories, DECORATION_MANAGER_ID } from '../../services/decorations';
import { addPortfolioItem, updatePortfolioItem } from '../../services/portfolio';
import { getAllPartnersForAdmin } from '../../services/partners';
import { uploadFile } from '../../services/upload';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { useToast } from '../shared/ToastContext';
import { useAuth } from '../auth/AuthContext';

interface AdminPortfolioItemFormModalProps {
    itemToEdit?: PortfolioItem;
    onClose: () => void;
    onSave: () => void;
}

const isValidUUID = (id?: string) =>
    Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

const AdminPortfolioItemFormModal: React.FC<AdminPortfolioItemFormModalProps> = ({ itemToEdit, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const { currentUser } = useAuth();
    const t_dash = t.dashboard;
    const t_admin = t.adminDashboard.decorationsManagement;
    const t_shared = t.adminShared;

    const { data: decorationCategories, isLoading: categoriesLoading } = useQuery({
        queryKey: ['decorationCategories'],
        queryFn: () => getDecorationCategories()
    });
    const { data: partners = [] } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin
    });

    const eligiblePartners = useMemo(() => {
        return partners.filter(p =>
            p.status === 'active' && (
                p.type === 'finishing' ||
                p.type === 'decoration_manager' ||
                p.role === Role.FINISHING_PARTNER ||
                p.role === Role.DECORATION_MANAGER ||
                p.role === Role.SUPER_ADMIN
            )
        );
    }, [partners]);

    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const modalRef = useRef<HTMLDivElement>(null);

    const matchedInitialCategory = decorationCategories?.find(
        c => (itemToEdit?.categoryId && c.id === itemToEdit.categoryId) ||
            c.name.en.trim().toLowerCase() === (itemToEdit?.category?.en || '').trim().toLowerCase() ||
            c.name.ar.trim().toLowerCase() === (itemToEdit?.category?.ar || '').trim().toLowerCase()
    );

    const [formData, setFormData] = useState({
        title: { ar: itemToEdit?.title?.ar || '', en: itemToEdit?.title?.en || '' },
        categoryId: matchedInitialCategory?.id || itemToEdit?.categoryId || '',
        partnerId: itemToEdit?.partnerId || DECORATION_MANAGER_ID,
        imageUrl: itemToEdit?.imageUrl || '',
        price: itemToEdit?.price ?? '',
        dimensions: itemToEdit?.dimensions || '',
        availability: itemToEdit?.availability || 'In Stock',
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(itemToEdit?.imageUrl || null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (decorationCategories && decorationCategories.length > 0 && !formData.categoryId) {
            setFormData(prev => ({ ...prev, categoryId: matchedInitialCategory?.id || decorationCategories[0].id }));
        }
    }, [decorationCategories, formData.categoryId, matchedInitialCategory]);

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        showToast(language === 'ar' ? 'تم حفظ العنصر بنجاح!' : `Portfolio item ${itemToEdit ? 'updated' : 'added'} successfully!`, 'success');
        onSave();
    };

    const addMutation = useMutation({
        mutationFn: (item: Omit<PortfolioItem, 'id'>) => addPortfolioItem(item),
        onSuccess: handleSuccess,
        onError: (err: any) => showToast(err?.message || 'Failed to add item.', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; updates: Partial<PortfolioItem> }) => updatePortfolioItem(data.id, data.updates),
        onSuccess: handleSuccess,
        onError: (err: any) => showToast(err?.message || 'Failed to update item.', 'error'),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'imageUrl') {
            setFormData(prev => ({ ...prev, imageUrl: value }));
            if (value) {
                setImageFile(null);
                setImagePreview(value);
            }
            return;
        }
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

        const selectedCategory = decorationCategories?.find(c => c.id === formData.categoryId);
        if (!selectedCategory) {
            showToast(language === 'ar' ? 'يرجى اختيار تصنيف صحيح.' : 'Please select a valid category.', 'error');
            return;
        }

        let imageSrc = formData.imageUrl.trim() || itemToEdit?.imageUrl || '';
        if (imageFile) {
            setIsUploading(true);
            try {
                imageSrc = await uploadFile(imageFile);
            } catch (err: any) {
                showToast(err?.message || 'Failed to upload image', 'error');
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        if (!imageSrc) {
            showToast(language === 'ar' ? 'يرجى رفع صورة أو إدخال رابط صورة.' : 'Please upload or enter an image URL.', 'error');
            return;
        }

        const effectivePartnerId = isValidUUID(formData.partnerId)
            ? formData.partnerId
            : (currentUser?.id && isValidUUID(currentUser.id) ? currentUser.id : DECORATION_MANAGER_ID);

        const parsedPrice = formData.price !== '' && formData.price !== null && formData.price !== undefined
            ? Number(formData.price)
            : undefined;

        const dataToSave = {
            title: formData.title,
            partnerId: effectivePartnerId,
            categoryId: selectedCategory.id,
            category: selectedCategory.name,
            imageUrl: imageSrc,
            alt: formData.title.en || formData.title.ar || 'Decoration work',
            price: parsedPrice !== undefined && Number.isFinite(parsedPrice) ? parsedPrice : undefined,
            dimensions: formData.dimensions || undefined,
            availability: formData.availability as 'In Stock' | 'Made to Order',
        };

        if (itemToEdit) {
            updateMutation.mutate({ id: itemToEdit.id, updates: dataToSave });
        } else {
            addMutation.mutate(dataToSave as Omit<PortfolioItem, 'id'>);
        }
    };

    const isLoading = addMutation.isPending || updateMutation.isPending || isUploading;

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
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {imagePreview && <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border-2 flex-shrink-0" />}
                                <div className="flex-1 w-full space-y-2">
                                    <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className={inputClasses} dir="ltr" placeholder="https://..." />
                                    <input type="file" id="imageFileUpload" accept="image/*" onChange={handleFileChange} className={`${inputClasses} p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100`} />
                                </div>
                            </div>
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label={t_dash.workTitleAr} id="title.ar"><input type="text" name="title.ar" value={formData.title.ar} onChange={handleChange} className={inputClasses} dir="rtl" required /></FormField>
                            <FormField label={t_dash.workTitleEn} id="title.en"><input type="text" name="title.en" value={formData.title.en} onChange={handleChange} className={inputClasses} dir="ltr" required /></FormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label={t_admin.itemCategory} id="categoryId">
                                <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={selectClasses} required disabled={categoriesLoading}>
                                    <option value="">{language === 'ar' ? '-- اختر التصنيف --' : '-- Select Category --'}</option>
                                    {(decorationCategories || []).map(c => <option key={c.id} value={c.id}>{c.name[language]}</option>)}
                                </select>
                            </FormField>
                            <FormField label={language === 'ar' ? 'الشريك المرتبط' : 'Linked Partner'} id="partnerId">
                                <select name="partnerId" value={formData.partnerId} onChange={handleChange} className={selectClasses}>
                                    <option value={DECORATION_MANAGER_ID}>{language === 'ar' ? 'إدارة الديكورات بالمنصة' : 'Platform Decorations Studio'}</option>
                                    {eligiblePartners.filter(p => p.id !== DECORATION_MANAGER_ID).map(p => (
                                        <option key={p.id} value={p.id}>
                                            {language === 'ar' ? (p.nameAr || p.name) : p.name}
                                        </option>
                                    ))}
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
