import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useLanguage } from '../../shared/LanguageContext';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';
import { Role } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import type { Partner, Project } from '../../../types';
import { useCityStore } from '../../../store/useCityStore';
import { getAccessibleCitiesForUser } from '../../../utils/cityScope';

interface PropertyBasicInfoProps {
    projects: Project[];
    partnerProjects: Project[];
    isAdmin: boolean;
    partners?: Partner[];
}

const PropertyBasicInfo: React.FC<PropertyBasicInfoProps> = ({ projects, partnerProjects, isAdmin, partners = [] }) => {
    const { register, watch, formState: { errors } } = useFormContext<any>();
    const { language, t } = useLanguage();
    const td = t.dashboard.propertyForm;
    const { currentUser } = useAuth();
    const cities = useCityStore((s) => s.cities);
    const currentCityId = watch('cityId');
    const selectableCities = React.useMemo(() => {
        const accessible = getAccessibleCitiesForUser(cities, currentUser);
        if (currentCityId && !accessible.some((c) => c.id === currentCityId)) {
            const matched = cities.find((c) => c.id === currentCityId);
            if (matched) return [matched, ...accessible];
        }
        return accessible;
    }, [cities, currentUser, currentCityId]);
    const reqMsg = language === 'ar' ? 'هذا الحقل مطلوب' : 'This field is required';

    const availableProjects = isAdmin ? projects : partnerProjects;
    const showProjectSelector = currentUser && (currentUser.role === Role.DEVELOPER_PARTNER || currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.LISTINGS_MANAGER || isAdmin);

    return (
        <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
                {language === 'ar' ? 'البيانات الأساسية' : 'Basic Information'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label={language === 'ar' ? 'المدينة / النطاق الفرعي (Only Property)' : 'City Subdomain Portal (Only Property)'} id="cityId">
                    <select {...register("cityId", { required: true })} className={selectClasses}>
                        {selectableCities.map(city => (
                            <option key={city.id} value={city.id}>
                                {city.name[language]} ({city.brandTitle[language]} — {city.subdomain})
                            </option>
                        ))}
                    </select>
                </FormField>

                {isAdmin && (
                    <FormField label={language === 'ar' ? 'الشريك / المطور العقاري' : 'Partner / Owner'} id="partnerId">
                        <select {...register("partnerId")} className={selectClasses}>
                            {partners.map(partner => (
                                <option key={partner.id} value={partner.id}>
                                    {language === 'ar' ? (partner.nameAr || partner.name) : (partner.name || partner.nameAr)} ({partner.type})
                                </option>
                            ))}
                        </select>
                    </FormField>
                )}

                {showProjectSelector && (
                    <FormField label={language === 'ar' ? 'المشروع (اختياري)' : 'Project (Optional)'} id="projectId">
                        <select {...register("projectId")} className={selectClasses}>
                            <option value="">{language === 'ar' ? 'اختر مشروعاً...' : 'Select a project...'}</option>
                            {availableProjects?.map(proj => (
                                <option key={proj.id} value={proj.id}>{proj.name?.[language] || proj.name?.en || proj.name?.ar || ''}</option>
                            ))}
                        </select>
                    </FormField>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label={td.propertyTitleAr} id="title.ar" error={(errors?.title as any)?.ar?.message as string | undefined}>
                    <input type="text" {...register("title.ar", { required: reqMsg })} className={inputClasses} placeholder="مثال: شقة فاخرة في التجمع" />
                </FormField>
                <FormField label={td.propertyTitleEn} id="title.en" error={(errors?.title as any)?.en?.message as string | undefined}>
                    <input type="text" {...register("title.en", { required: reqMsg })} className={inputClasses} placeholder="e.g. Luxury Apartment in New Cairo" />
                </FormField>
                
                <FormField label={td.addressAr} id="address.ar" error={(errors?.address as any)?.ar?.message as string | undefined}>
                    <input type="text" {...register("address.ar", { required: reqMsg })} className={inputClasses} />
                </FormField>
                <FormField label={td.addressEn} id="address.en" error={(errors?.address as any)?.en?.message as string | undefined}>
                    <input type="text" {...register("address.en", { required: reqMsg })} className={inputClasses} />
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
