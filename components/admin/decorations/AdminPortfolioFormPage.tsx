
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role, type PortfolioItem } from '../../../types';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';
import { ArrowLeftIcon, PhotoIcon, ExclamationTriangleIcon } from '../../ui/Icons';
import { addPortfolioItem, updatePortfolioItem, getAllPortfolioItems } from '../../../services/portfolio';
import { getDecorationCategories, DECORATION_MANAGER_ID } from '../../../services/decorations';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { uploadFile } from '../../../services/upload';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

const isValidUUID = (id?: string) =>
    Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

const AdminPortfolioFormPage: React.FC = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const t_admin = t.adminDashboard.decorationsManagement;
    const t_shared = t.adminShared;

    const { data: decorationCategories, isLoading: categoriesLoading } = useQuery({
        queryKey: ['decorationCategories'],
        queryFn: () => getDecorationCategories()
    });
    const { data: portfolioItems } = useQuery({
        queryKey: ['portfolio'],
        queryFn: () => getAllPortfolioItems()
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
    const { currentUser } = useAuth();

    const itemToEdit = itemId ? portfolioItems?.find(i => i.id === itemId) : undefined;

    const [formData, setFormData] = useState<{
        title: { ar: string; en: string };
        categoryId: string;
        partnerId: string;
        imageUrl: string;
        price: string | number;
        dimensions: string;
        availability: 'In Stock' | 'Made to Order';
    }>({
        title: { ar: '', en: '' },
        categoryId: '',
        partnerId: DECORATION_MANAGER_ID,
        imageUrl: '',
        price: '',
        dimensions: '',
        availability: 'In Stock',
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (itemToEdit) {
            const category =
                (itemToEdit.categoryId && decorationCategories?.find(c => c.id === itemToEdit.categoryId)) ||
                decorationCategories?.find(
                    c => c.name.en.trim().toLowerCase() === (itemToEdit.category.en || '').trim().toLowerCase() ||
                        c.name.ar.trim().toLowerCase() === (itemToEdit.category.ar || '').trim().toLowerCase()
                );

            setFormData({
                title: { ar: itemToEdit.title.ar, en: itemToEdit.title.en },
                categoryId: category?.id || itemToEdit.categoryId || '',
                partnerId: itemToEdit.partnerId || DECORATION_MANAGER_ID,
                imageUrl: itemToEdit.imageUrl || '',
                price: itemToEdit.price ?? '',
                dimensions: itemToEdit.dimensions || '',
                availability: itemToEdit.availability || 'In Stock',
            });
            setImagePreview(itemToEdit.imageUrl);
        }
    }, [itemToEdit, decorationCategories]);

    useEffect(() => {
        if (!itemId && decorationCategories && decorationCategories.length > 0 && !formData.categoryId) {
            setFormData(prev => ({ ...prev, categoryId: decorationCategories[0].id }));
        }
    }, [decorationCategories, itemId, formData.categoryId]);

    const addMutation = useMutation({
        mutationFn: (item: Omit<PortfolioItem, 'id'>) => addPortfolioItem(item),
        onSuccess: () => {
            showToast(language === 'ar' ? 'تمت إضافة العمل بنجاح!' : 'Portfolio item added successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            navigate('/admin/platform-decorations/portfolio');
        },
        onError: (err: any) => {
            const msg = err?.message || 'Failed to add item.';
            setSubmitError(msg);
            showToast(msg, 'error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; updates: Partial<PortfolioItem> }) => updatePortfolioItem(data.id, data.updates),
        onSuccess: () => {
            showToast(language === 'ar' ? 'تم تحديث العمل بنجاح!' : 'Portfolio item updated successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            navigate('/admin/platform-decorations/portfolio');
        },
        onError: (err: any) => {
            const msg = err?.message || 'Failed to update item.';
            setSubmitError(msg);
            showToast(msg, 'error');
        },
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
            setFormData(prev => ({
                ...prev,
                [field]: { ...(prev as any)[field], [lang]: value }
            }));
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
        setSubmitError(null);

        const selectedCategory = decorationCategories?.find(c => c.id === formData.categoryId);
        if (!selectedCategory) {
            const msg = language === 'ar' ? 'يرجى اختيار تصنيف صحيح.' : 'Please select a valid category.';
            setSubmitError(msg);
            showToast(msg, 'error');
            return;
        }

        let imageSrc = formData.imageUrl.trim() || itemToEdit?.imageUrl || '';
        if (imageFile) {
            setIsUploading(true);
            try {
                imageSrc = await uploadFile(imageFile);
            } catch (err: any) {
                const msg = err?.message || (language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image');
                setSubmitError(msg);
                showToast(msg, 'error');
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        if (!imageSrc) {
            const msg = language === 'ar' ? 'يرجى رفع صورة أو إدخال رابط صورة صالح.' : 'Please upload an image or provide an image URL.';
            setSubmitError(msg);
            showToast(msg, 'error');
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
            availability: formData.availability,
        };

        if (itemId) {
            updateMutation.mutate({ id: itemId, updates: dataToSave });
        } else {
            addMutation.mutate(dataToSave as Omit<PortfolioItem, 'id'>);
        }
    };

    const isLoading = addMutation.isPending || updateMutation.isPending || categoriesLoading || isUploading;

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="mb-6">
                <Link to="/admin/platform-decorations/portfolio" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t_shared.backToList}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {itemId ? t_admin.editItem : t_admin.addNewItem}
                </h1>
            </div>

            {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{submitError}</span>
                </div>
            )}

            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <PhotoIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <CardTitle>{language === 'ar' ? 'تفاصيل العمل الفني والديكور' : 'Item Details & Associations'}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <FormField label={t_dash.workImageURL} id="imageUrl">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {imagePreview ? (
                                    <img loading="lazy" decoding="async" src={imagePreview} alt="Preview" className="w-28 h-28 rounded-md object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0" />
                                ) : (
                                    <div className="w-28 h-28 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400 text-xs flex-shrink-0">No Image</div>
                                )}
                                <div className="flex-1 w-full space-y-2">
                                    <input
                                        type="url"
                                        name="imageUrl"
                                        value={formData.imageUrl}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        dir="ltr"
                                        placeholder="https://..."
                                    />
                                    <input type="file" id="imageFileUpload" accept="image/*" onChange={handleFileChange} className={`${inputClasses} p-2`} />
                                </div>
                            </div>
                        </FormField>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label={t_dash.workTitleAr} id="title.ar"><input type="text" name="title.ar" value={formData.title.ar} onChange={handleChange} className={inputClasses} dir="rtl" required /></FormField>
                            <FormField label={t_dash.workTitleEn} id="title.en"><input type="text" name="title.en" value={formData.title.en} onChange={handleChange} className={inputClasses} dir="ltr" required /></FormField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label={t_admin.itemCategory} id="categoryId">
                                <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={selectClasses} required disabled={categoriesLoading}>
                                    <option value="">{language === 'ar' ? '-- اختر التصنيف --' : '-- Select Category --'}</option>
                                    {(decorationCategories || []).map(c => <option key={c.id} value={c.id}>{c.name[language]}</option>)}
                                </select>
                            </FormField>

                            <FormField label={language === 'ar' ? 'الشريك / المنفذ المرتبط' : 'Linked Partner / Creator'} id="partnerId">
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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

                        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 gap-3">
                            <Button type="button" variant="secondary" onClick={() => navigate('/admin/platform-decorations/portfolio')}>{t_shared.cancel}</Button>
                            <Button type="submit" isLoading={isLoading}>
                                {t_shared.save}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminPortfolioFormPage;
