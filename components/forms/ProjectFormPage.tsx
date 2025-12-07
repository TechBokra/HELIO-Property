

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Language, Project } from '../../types';
import { useAuth } from '../auth/AuthContext';
import FormField, { inputClasses } from '../ui/FormField';
import { addProject, updateProject, getAllProjects } from '../../services/projects';
import { Role, Permission } from '../../types';
import { useSubscriptionUsage } from '../../hooks/useSubscriptionUsage';
import UpgradeNotice from '../shared/UpgradeNotice';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const ProjectFormPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { currentUser, hasPermission } = useAuth();
    const { data: projects, isLoading: projectsLoading } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const t_form = t.projectDashboard.projectForm;

    const { isLimitReached } = useSubscriptionUsage('projects');
    const { register, handleSubmit, reset, formState: { isSubmitting: isFormSubmitting, errors } } = useForm<Project>();
    
    const [image, setImage] = useState<string>('');

    useEffect(() => {
        if (projectId && projects) {
            const project = projects.find(p => p.id === projectId);
            if (project && currentUser && 'type' in currentUser && (project.partnerId === currentUser.id || hasPermission(Permission.MANAGE_ALL_PROJECTS))) {
                reset(project);
                setImage(project.imageUrl);
            } else if (!projectsLoading) {
                const redirectPath = hasPermission(Permission.VIEW_ADMIN_DASHBOARD) ? '/admin/projects' : '/dashboard/projects';
                navigate(redirectPath);
            }
        }
    }, [projectId, currentUser, navigate, projects, projectsLoading, hasPermission, reset]);

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['allProjects'] });
        const redirectPath = hasPermission(Permission.VIEW_ADMIN_DASHBOARD) ? '/admin/projects' : '/dashboard/projects';
        navigate(redirectPath);
    };

    const addMutation = useMutation({
        mutationFn: addProject,
        onSuccess: () => {
            showToast('Project created successfully!', 'success');
            handleSuccess();
        },
        onError: () => showToast('Failed to create project.', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { projectId: string; updates: Partial<Project> }) => updateProject(data.projectId, data.updates),
        onSuccess: () => {
            showToast('Project updated successfully!', 'success');
            handleSuccess();
        },
        onError: () => showToast('Failed to update project.', 'error'),
    });

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setImage(base64);
        }
    };

    const onSubmit = async (formData: any) => {
        if (!currentUser || !('type' in currentUser)) return;

        const existingProject = projectId ? projects?.find(p => p.id === projectId) : undefined;
        const projectData = {
            ...formData,
            imageUrl: image,
            partnerId: existingProject?.partnerId || currentUser.id,
            features: existingProject?.features || [],
        };

        if (projectId) {
            updateMutation.mutate({ projectId, updates: projectData });
        } else {
            addMutation.mutate(projectData);
        }
    };
    
    if (projectsLoading && projectId) return <div>Loading project...</div>;

    const isAdmin = hasPermission(Permission.MANAGE_ALL_PROJECTS);
    if (isLimitReached && !projectId && !isAdmin) {
        return <UpgradeNotice />;
    }
    
    const isSubmitting = addMutation.isPending || updateMutation.isPending;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                {projectId ? t_form.editTitle : t_form.addTitle}
            </h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl bg-white dark:bg-gray-900 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700">
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