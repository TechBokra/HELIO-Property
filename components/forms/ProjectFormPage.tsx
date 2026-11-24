import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Partner, Project } from '../../types';
import { useAuth } from '../auth/AuthContext';
import FormField, { inputClasses, selectClasses } from '../ui/FormField';
import { addProject, updateProject, getAllProjects } from '../../services/projects';
import { getAllPartnersForAdmin } from '../../services/partners';
import { Permission } from '../../types';
import { useSubscriptionUsage } from '../../hooks/useSubscriptionUsage';
import UpgradeNotice from '../shared/UpgradeNotice';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';
import { uploadFile } from '../../services/upload';
import { useCityStore } from '../../store/useCityStore';
import { invalidateAllProjectQueries } from '../../utils/queryInvalidation';

const ProjectFormPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { currentUser, hasPermission } = useAuth();
    const isAdmin = hasPermission(Permission.MANAGE_ALL_PROJECTS);
    const { data: projects, isLoading: projectsLoading } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: partners } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin,
        enabled: isAdmin,
    });
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const t_form = t.projectDashboard.projectForm;
    const cities = useCityStore((s) => s.cities);
    const activeCityId = useCityStore((s) => s.activeCityId);
    const adminCityScope = useCityStore((s) => s.adminCityScope);
    const defaultCityId = adminCityScope !== 'all' ? adminCityScope : (activeCityId || 'heliopolis');

    const { isLimitReached } = useSubscriptionUsage('projects');
    const { register, handleSubmit, reset } = useForm<Project>({
        defaultValues: { cityId: defaultCityId, partnerId: currentUser?.id || '' }
    });
    
    const [image, setImage] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const existingProject = useMemo(
        () => (projectId ? projects?.find(p => p.id === projectId) : undefined),
        [projectId, projects]
    );

    const selectablePartners = useMemo(() => {
        const list: Partner[] = (partners || []).filter((p) => {
            if (existingProject?.partnerId && p.id === existingProject.partnerId) return true;
            if (currentUser?.id && p.id === currentUser.id) return true;
            if (p.status && p.status !== 'active') return false;
            return p.type === 'developer' || p.type === 'agency';
        });
        if (currentUser && 'name' in currentUser && !list.some((p) => p.id === currentUser.id)) {
            list.unshift(currentUser);
        }
        return list;
    }, [partners, currentUser, existingProject]);

    useEffect(() => {
        if (projectId && projects) {
            const project = projects.find(p => p.id === projectId);
            if (project && currentUser && 'type' in currentUser && (project.partnerId === currentUser.id || hasPermission(Permission.MANAGE_ALL_PROJECTS))) {
                reset({
                    ...project,
                    cityId: project.cityId || 'heliopolis',
                    partnerId: project.partnerId || currentUser.id,
                });
                setImage(project.imageUrl);
            } else if (!projectsLoading) {
                const redirectPath = hasPermission(Permission.VIEW_ADMIN_DASHBOARD) ? '/admin/projects' : '/dashboard/projects';
                navigate(redirectPath);
            }
        }
    }, [projectId, currentUser, navigate, projects, projectsLoading, hasPermission, reset]);

    const handleSuccess = (savedId?: string) => {
        invalidateAllProjectQueries(queryClient, savedId || projectId);
        const redirectPath = hasPermission(Permission.VIEW_ADMIN_DASHBOARD) ? '/admin/projects' : '/dashboard/projects';
        navigate(redirectPath);
    };

    const addMutation = useMutation({
        mutationFn: addProject,
        onSuccess: (created) => {
            showToast(language === 'ar' ? 'تم إنشاء المشروع بنجاح!' : 'Project created successfully!', 'success');
            handleSuccess(created?.id);
        },
        onError: (err: any) => showToast(err?.message || (language === 'ar' ? 'فشل إنشاء المشروع.' : 'Failed to create project.'), 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { projectId: string; updates: Partial<Project> }) => updateProject(data.projectId, data.updates),
        onSuccess: (updated) => {
            showToast(language === 'ar' ? 'تم تحديث المشروع بنجاح!' : 'Project updated successfully!', 'success');
            handleSuccess(updated?.id || projectId);
        },
        onError: (err: any) => showToast(err?.message || (language === 'ar' ? 'فشل تحديث المشروع.' : 'Failed to update project.'), 'error'),
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImage(URL.createObjectURL(file));
        }
    };

    const onSubmit = async (formData: any) => {
        if (!currentUser || !('type' in currentUser)) return;
        
        setIsUploading(true);
        let imageUrl = image;
        
        if (imageFile) {
             try {
                imageUrl = await uploadFile(imageFile);
            } catch (error) {
                showToast(language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image', 'error');
                setIsUploading(false);
                return;
            }
        }
        setIsUploading(false);

        const resolvedPartnerId = isAdmin
            ? (formData.partnerId || existingProject?.partnerId || currentUser.id)
            : (existingProject?.partnerId || currentUser.id);

        const projectData = {
            ...formData,
            cityId: formData.cityId || existingProject?.cityId || defaultCityId,
            imageUrl: imageUrl,
            partnerId: resolvedPartnerId,
            features: existingProject?.features || [],
        };

        if (projectId) {
            updateMutation.mutate({ projectId, updates: projectData });
        } else {
            addMutation.mutate(projectData);
        }
    };
    
    if (projectsLoading && projectId) return <div>Loading project...</div>;

    if (isLimitReached && !projectId && !isAdmin) {
        return <UpgradeNotice />;
    }
    
    const isSubmitting = addMutation.isPending || updateMutation.isPending || isUploading;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                {projectId ? t_form.editTitle : t_form.addTitle}
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl bg-white dark:bg-gray-900 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label={language === 'ar' ? 'المدينة / البوابة الفرعية (Only Property)' : 'City Subdomain Portal (Only Property)'} id="cityId">
                        <select {...register("cityId", { required: true })} className={selectClasses}>
                            {cities.map(city => (
                                <option key={city.id} value={city.id}>
                                    {city.name[language]} ({city.brandTitle[language]} — {city.subdomain})
                                </option>
                            ))}
                        </select>
                    </FormField>

                    {isAdmin && (
                        <FormField label={language === 'ar' ? 'الشريك / المطور العقاري' : 'Partner / Developer'} id="partnerId">
                            <select {...register("partnerId", { required: true })} className={selectClasses}>
                                {selectablePartners.map(partner => (
                                    <option key={partner.id} value={partner.id}>
                                        {language === 'ar' ? (partner.nameAr || partner.name) : (partner.name || partner.nameAr)} ({partner.type})
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label={t_form.nameAr} id="name.ar">
                        <input type="text" {...register("name.ar", { required: true })} className={inputClasses} />
                    </FormField>
                     <FormField label={t_form.nameEn} id="name.en">
                        <input type="text" {...register("name.en", { required: true })} className={inputClasses} />
                    </FormField>
                </div>
                <div>
                     <FormField label={t_form.descriptionAr} id="description.ar">
                        <textarea {...register("description.ar", { required: true })} className={inputClasses} rows={4} />
                    </FormField>
                </div>
                 <div>
                     <FormField label={t_form.descriptionEn} id="description.en">
                        <textarea {...register("description.en", { required: true })} className={inputClasses} rows={4} />
                    </FormField>
                </div>
                 <FormField label={t_form.image} id="image">
                    <div className="flex items-center gap-4">
                        {image && <img src={image} alt="Project preview" className="w-24 h-24 rounded-md object-cover border" />}
                        <input type="file" id="image" accept="image/*" onChange={handleImageChange} className={`${inputClasses} p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100`} required={!projectId} />
                    </div>
                </FormField>
                <div className="flex justify-end pt-4">
                    <Button type="submit" isLoading={isSubmitting}>
                        {projectId ? t_form.saveChanges : t_form.createProject}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ProjectFormPage;
