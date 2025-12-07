import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useLanguage } from '../../shared/LanguageContext';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';
import { Role } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import type { Project } from '../../../types';

interface PropertyBasicInfoProps {
    projects: Project[];
    partnerProjects: Project[];
    isAdmin: boolean;
}

const PropertyBasicInfo: React.FC<PropertyBasicInfoProps> = ({ projects, partnerProjects, isAdmin }) => {
    const { register } = useFormContext();
    const { language, t } = useLanguage();
    const td = t.dashboard.propertyForm;
    const { currentUser } = useAuth();

    // Determine which projects list to show based on role
    const availableProjects = isAdmin ? projects : partnerProjects;
    const showProjectSelector = currentUser && 'type' in currentUser && (currentUser.role === Role.DEVELOPER_PARTNER || currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.LISTINGS_MANAGER);

    return (
        <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
                {language === 'ar' ? 'البيانات الأساسية' : 'Basic Information'}
            </h2>
            
            {showProjectSelector && (
                <FormField label={language === 'ar' ? 'المشروع (اختياري)' : 'Project (Optional)'} id="projectId">
                    <select {...register("projectId")} className={selectClasses}>
                        <option value="">{language === 'ar' ? 'اختر مشروعاً...' : 'Select a project...'}</option>
                        {availableProjects?.map(proj => (
                            <option key={proj.id} value={proj.id}>{proj.name[language]}</option>
                        ))}
                    </select>
                </FormField>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label={td.propertyTitleAr} id="title.ar">
                    <input type="text" {...register("title.ar", { required: true })} className={inputClasses} placeholder="مثال: شقة فاخرة في التجمع" />
                </FormField>
                <FormField label={td.propertyTitleEn} id="title.en">
                    <input type="text" {...register("title.en", { required: true })} className={inputClasses} placeholder="e.g. Luxury Apartment in New Cairo" />
                </FormField>
                
                <FormField label={td.addressAr} id="address.ar">
                    <input type="text" {...register("address.ar", { required: true })} className={inputClasses} />
                </FormField>
                <FormField label={td.addressEn} id="address.en">
                    <input type="text" {...register("address.en", { required: true })} className={inputClasses} />
                </FormField>

                <div className="md:col-span-2">
                    <FormField label={td.descriptionAr} id="description.ar">
                        <textarea {...register("description.ar")} className={inputClasses} rows={4} />
                    </FormField>
                </div>
                <div className="md:col-span-2">
                    <FormField label={td.descriptionEn} id="description.en">
                        <textarea {...register("description.en")} className={inputClasses} rows={4} />
                    </FormField>
                </div>
            </div>
        </div>
    );
};

export default PropertyBasicInfo;