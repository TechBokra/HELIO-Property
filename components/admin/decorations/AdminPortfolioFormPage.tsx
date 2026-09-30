
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PortfolioItem } from '../../../types';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';
import { ArrowLeftIcon, PhotoIcon } from '../../ui/Icons';
import { addPortfolioItem, updatePortfolioItem, getAllPortfolioItems } from '../../../services/portfolio';
import { getDecorationCategories } from '../../../services/decorations';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const AdminPortfolioFormPage: React.FC = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const t_admin = t.adminDashboard.decorationsManagement;
    const t_shared = t.adminShared;
    
    const { data: decorationCategories, isLoading: categoriesLoading } = useQuery({ queryKey: ['decorationCategories'], queryFn: getDecorationCategories });
    const { data: portfolioItems } = useQuery({ queryKey: ['portfolio'], queryFn: getAllPortfolioItems });
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    
    const itemToEdit = itemId ? portfolioItems?.find(i => i.id === itemId) : undefined;

    const [formData, setFormData] = useState<{
        title: { ar: string; en: string };
        categoryId: string;
        price: string | number;
        dimensions: string;
        availability: 'In Stock' | 'Made to Order';
    }>({
        title: { ar: '', en: '' },
        categoryId: '',
        price: '',
        dimensions: '',
        availability: 'In Stock',
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    // Load data for editing
    useEffect(() => {
        if (itemToEdit) {
            // Try to match category by English name since that's how it was stored previously
            // Moving forward, we should ideally store categoryId
            const categoryName = itemToEdit.category.en;
            const category = decorationCategories?.find(c => c.name.en === categoryName);
            
            setFormData({
                title: { ar: itemToEdit.title.ar, en: itemToEdit.title.en },
                categoryId: category?.id || '', // Map to ID for the select box
                price: itemToEdit.price || '',
                dimensions: itemToEdit.dimensions || '',
                availability: itemToEdit.availability || 'In Stock',
            });
            setImagePreview(itemToEdit.imageUrl);
        }
    }, [itemToEdit, decorationCategories]);
    
    // Initialize default category if creating new and categories are loaded
    useEffect(() => {
         if (!itemId && decorationCategories && decorationCategories.length > 0 && !formData.categoryId) {
            setFormData(prev => ({...prev, categoryId: decorationCategories[0].id}));
        }
    }, [decorationCategories, itemId]);

    const addMutation = useMutation({
        mutationFn: addPortfolioItem,
        onSuccess: () => {
            showToast('Portfolio item added successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            navigate('/admin/platform-decorations/portfolio');
        },
        onError: () => showToast('Failed to add item.', 'error'),
    });
    
    const updateMutation = useMutation({
        mutationFn: (data: { id: string, updates: Partial<PortfolioItem> }) => updatePortfolioItem(data.id, data.updates),
        onSuccess: () => {
            showToast('Portfolio item updated successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
            navigate('/admin/platform-decorations/portfolio');
        },
        onError: () => showToast('Failed to update item.', 'error'),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
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

        let imageSrc = itemToEdit?.imageUrl || '';
        if (imageFile) {
            imageSrc = await fileToBase64(imageFile);
        }
        
        const selectedCategory = decorationCategories?.find(c => c.id === formData.categoryId);
        if (!selectedCategory) {
            showToast("Please select a valid category.", "error");
            return;
        }

        const DECORATION_MANAGER_ID = 'f476c295-e80a-41ca-a63b-61ff2f579f71';
        const isValidUUID = (id?: string) => id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) : false;
        const effectivePartnerId = itemToEdit?.partnerId && isValidUUID(itemToEdit.partnerId) 
            ? itemToEdit.partnerId 
            : (currentUser?.id && isValidUUID(currentUser.id) ? currentUser.id : DECORATION_MANAGER_ID);

        const dataToSave = {
            title: formData.title,
            partnerId: effectivePartnerId,
            // Store category Name object for compatibility with current schema
            category: selectedCategory.name, 
            imageUrl: imageSrc,
            alt: formData.title.en || 'Decoration work',
            price: formData.price ? parseInt(String(formData.price), 10) : undefined,
            dimensions: formData.dimensions || undefined,
            availability: formData.availability,
        };

        if (itemId) {
            updateMutation.mutate({ id: itemId, updates: dataToSave });
        } else {
            addMutation.mutate(dataToSave as Omit<PortfolioItem, 'id'>);
        }
    };
    
    const isLoading = addMutation.isPending || updateMutation.isPending || categoriesLoading;

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

            <Card>
                 <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <PhotoIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <CardTitle>Item Details</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                         <FormField label={t_dash.workImageURL} id="imageUrl">
                            <div className="flex items-center gap-4">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-32 h-32 rounded-md object-cover border-2 border-gray-200 dark:border-gray-700" />
                                ) : (
                                    <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400">No Image</div>
                                )}
                                <input type="file" id="imageUrl" accept="image/*" onChange={handleFileChange} className={`${inputClasses} p-2`} required={!itemId} />
                            </div>
                        </FormField>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
