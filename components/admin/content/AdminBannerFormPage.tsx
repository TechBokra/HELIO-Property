
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Banner } from '../../../types';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';
import { ArrowLeftIcon, PhotoIcon, SparklesIcon, CloseIcon } from '../../ui/Icons';
import { addBanner, updateBanner, getAllBanners } from '../../../services/banners';
import { useLanguage } from '../../shared/LanguageContext';
import { Checkbox } from '../../ui/Checkbox';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../shared/ToastContext';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const LOCATION_GUIDE = {
    home: {
        label: { en: 'Home Page (Main Slider)', ar: 'الصفحة الرئيسية (السلايدر الرئيسي)' },
        dimensions: '1920x640px',
        aspectRatio: '3:1',
        note: { en: 'High resolution, wide format.', ar: 'دقة عالية، تنسيق عريض.' }
    },
    properties: {
        label: { en: 'Properties Page (Header)', ar: 'صفحة العقارات (الرأس)' },
        dimensions: '1920x300px',
        aspectRatio: '6:1',
        note: { en: 'Ultra wide, short height header.', ar: 'عريض جداً، ارتفاع قصير.' }
    },
    finishing: {
        label: { en: 'Finishing Page (Header)', ar: 'صفحة التشطيبات (الرأس)' },
        dimensions: '1920x300px',
        aspectRatio: '6:1',
        note: { en: 'Ultra wide header.', ar: 'رأس عريض جداً.' }
    },
    decorations: {
        label: { en: 'Decorations Page (Header)', ar: 'صفحة الديكورات (الرأس)' },
        dimensions: '1920x300px',
        aspectRatio: '6:1',
        note: { en: 'Ultra wide header.', ar: 'رأس عريض جداً.' }
    },
    details: {
        label: { en: 'Details Page (Sidebar)', ar: 'صفحة التفاصيل (الشريط الجانبي)' },
        dimensions: '800x600px',
        aspectRatio: '4:3',
        note: { en: 'Boxy or rectangular format.', ar: 'تنسيق مربع أو مستطيل.' }
    }
};

const AdminBannerFormPage: React.FC = () => {
    const { bannerId } = useParams();
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const t_page = t.adminDashboard.manageBanners;
    const t_shared = t.adminShared;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: banners, isLoading: loadingBanner } = useQuery({ queryKey: ['banners'], queryFn: getAllBanners });
    const bannerToEdit = useMemo(() => banners?.find(b => b.id === bannerId), [banners, bannerId]);

    const [formData, setFormData] = useState({
        title: '',
        link: '',
        locations: [] as string[],
        status: 'active',
        startDate: '',
        endDate: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (bannerToEdit) {
            setFormData({
                title: bannerToEdit.title,
                link: bannerToEdit.link || '',
                locations: bannerToEdit.locations,
                status: bannerToEdit.status,
                startDate: bannerToEdit.startDate?.split('T')[0] || '',
                endDate: bannerToEdit.endDate?.split('T')[0] || '',
            });
            setImagePreview(bannerToEdit.imageUrl);
        }
    }, [bannerToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationChange = (location: 'home' | 'properties' | 'details' | 'finishing' | 'decorations') => {
        setFormData(prev => {
            const newLocations = prev.locations.includes(location)
                ? prev.locations.filter(l => l !== location)
                : [...prev.locations, location];
            return { ...prev, locations: newLocations as ('home' | 'properties' | 'details' | 'finishing' | 'decorations')[] };
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const addMutation = useMutation({
        mutationFn: addBanner,
        onSuccess: () => {
            showToast('Banner added successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['banners'] });
            navigate('/admin/banners');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({id, data}: {id: string, data: any}) => updateBanner(id, data),
        onSuccess: () => {
            showToast('Banner updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['banners'] });
            navigate('/admin/banners');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let imageUrl = bannerToEdit?.imageUrl || '';
        if (imageFile) {
            imageUrl = await fileToBase64(imageFile);
        }

        const dataToSave = {
            ...formData,
            imageUrl,
            locations: formData.locations as any,
            startDate: formData.startDate || undefined,
            endDate: formData.endDate || undefined,
        };

        if (bannerId) {
            updateMutation.mutate({ id: bannerId, data: dataToSave });
        } else {
            addMutation.mutate(dataToSave as Omit<Banner, 'id'>);
        }
    };
    
    const isLoading = loadingBanner || addMutation.isPending || updateMutation.isPending;
    const activeRecommendation = useMemo(() => {
        if (formData.locations.length === 0) return null;
        const lastSelected = formData.locations[formData.locations.length - 1] as keyof typeof LOCATION_GUIDE;
        return LOCATION_GUIDE[lastSelected];
    }, [formData.locations]);

    if (bannerId && !bannerToEdit && !loadingBanner) return <div>Banner not found</div>;

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
             <div className="mb-6">
                <Link to="/admin/banners" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t.adminShared.backToList}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {bannerId ? t_page.editBanner : t_page.addBanner}
                </h1>
            </div>

            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <PhotoIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <CardTitle>Banner Details</CardTitle>
                            <p className="text-sm text-gray-500">Configure visual, text, and placement settings.</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left: Image Upload */}
                            <div className="lg:col-span-1 space-y-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t_page.bannerImage}</label>
                                <div className={`relative aspect-video rounded-lg overflow-hidden border-2 border-dashed ${!imagePreview ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50' : 'border-amber-500'} transition-all group`}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <PhotoIcon className="w-10 h-10 mb-2 opacity-50" />
                                            <span className="text-xs">Click to upload</span>
                                        </div>
                                    )}
                                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold text-sm">
                                        {imagePreview ? 'Change Image' : 'Upload Image'}
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" required={!bannerId} />
                                    </label>
                                </div>
                                {activeRecommendation && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-sm">
                                        <p className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                            <SparklesIcon className="w-4 h-4" /> 
                                            {language === 'ar' ? 'الأبعاد الموصى بها:' : 'Recommended:'}
                                        </p>
                                        <p className="text-blue-600 dark:text-blue-400 mt-1 font-mono text-xs">
                                            {activeRecommendation.dimensions} ({activeRecommendation.aspectRatio})
                                        </p>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                            {activeRecommendation.note[language]}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Right: Form Details */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField label={t_page.bannerTitle} id="title">
                                        <Input name="title" value={formData.title} onChange={handleChange} required className={inputClasses} placeholder="Ex: Summer Sale 2024" />
                                    </FormField>
                                    <FormField label={t_page.bannerLink} id="link">
                                        <Input name="link" value={formData.link} onChange={handleChange} placeholder="e.g., /properties" />
                                    </FormField>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t_page.displayLocations}</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {(Object.keys(LOCATION_GUIDE) as (keyof typeof LOCATION_GUIDE)[]).map(loc => (
                                            <label key={loc} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${formData.locations.includes(loc) ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                                <Checkbox
                                                    checked={formData.locations.includes(loc)}
                                                    onChange={() => handleLocationChange(loc)}
                                                    id={`loc-${loc}`}
                                                />
                                                <div className="flex-grow">
                                                    <span className="font-medium text-gray-800 dark:text-white capitalize">{loc}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">{LOCATION_GUIDE[loc].aspectRatio}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <FormField label={t_page.status} id="status">
                                        <Select name="status" value={formData.status} onChange={handleChange} className={selectClasses}>
                                            <option value="active">{t_page.active}</option>
                                            <option value="inactive">{t_page.inactive}</option>
                                        </Select>
                                    </FormField>
                                    <FormField label={t_page.startDate} id="startDate">
                                        <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputClasses}/>
                                    </FormField>
                                    <FormField label={t_page.endDate} id="endDate">
                                        <Input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={inputClasses} />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                         <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button type="button" variant="secondary" onClick={() => navigate('/admin/banners')}>{t_shared.cancel}</Button>
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

export default AdminBannerFormPage;
