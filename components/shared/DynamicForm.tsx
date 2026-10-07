import { Fragment, type ReactNode, type FC, useState } from 'react';
import { useForm, SubmitHandler, FormProvider, FieldValues, RegisterOptions } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFormBySlug } from '../../services/forms';
import { submitIntake, IntakeValidationError } from '../../services/intake';
import { getAllProperties } from '../../services/properties';
import { getAllProjects } from '../../services/projects';
import { getAllPartnersForAdmin } from '../../services/partners';
import type { FormFieldDefinition } from '../../types';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import FormField, { inputClasses, selectClasses } from '../ui/FormField';
import { PATTERNS, MESSAGES, CONFIG } from '../../utils/validation';
import { uploadFile } from '../../services/upload';

interface DynamicFormProps {
    slug: string;
    defaultValues?: Record<string, unknown>;
    onSuccess?: () => void;
    className?: string;
    contextData?: Record<string, unknown>; 
    children?: ReactNode; 
    headerContent?: ReactNode; 
    footerContent?: ReactNode;
    customSubmit?: (data: Record<string, unknown>) => void; 
    submitButtonText?: string;
    submitButtonIcon?: ReactNode;
    hiddenFields?: string[];
}

const DynamicForm: FC<DynamicFormProps> = ({ 
    slug, 
    defaultValues, 
    onSuccess, 
    className, 
    contextData, 
    children, 
    headerContent,
    footerContent,
    customSubmit,
    submitButtonText,
    submitButtonIcon,
    hiddenFields = []
}) => {
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const { showToast } = useToast();
    const [uploading, setUploading] = useState(false);

    const { data: formDef, isLoading } = useQuery({
        queryKey: ['form', slug],
        queryFn: () => getFormBySlug(slug),
    });

    // Conditionally query entity selectors only if form fields require them
    const hasPropertySelector = formDef?.fields?.some(f => f.type === 'property_selector');
    const hasProjectSelector = formDef?.fields?.some(f => f.type === 'project_selector');
    const hasPartnerSelector = formDef?.fields?.some(f => f.type === 'partner_selector');

    const { data: properties } = useQuery({
        queryKey: ['allPropertiesForForm'],
        queryFn: getAllProperties,
        enabled: !!hasPropertySelector,
    });

    const { data: projects } = useQuery({
        queryKey: ['allProjectsForForm'],
        queryFn: getAllProjects,
        enabled: !!hasProjectSelector,
    });

    const { data: partners } = useQuery({
        queryKey: ['allPartnersForForm'],
        queryFn: getAllPartnersForAdmin,
        enabled: !!hasPartnerSelector,
    });

    const methods = useForm<FieldValues>({
        defaultValues: defaultValues || {}
    });
    
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError } = methods;

    const processFiles = async (formData: FieldValues, fields: FormFieldDefinition[]) => {
        const processedData = { ...formData };
        const fileFields = fields.filter(f => f.type === 'file');
        
        if (fileFields.length > 0) setUploading(true);

        try {
            for (const field of fileFields) {
                const fileList = formData[field.key];
                if (fileList && fileList.length > 0) {
                    const url = await uploadFile(fileList[0]);
                    processedData[field.key] = url;
                } else {
                    delete processedData[field.key];
                }
            }
        } catch (error) {
            console.error("File upload error", error);
            throw error;
        } finally {
            setUploading(false);
        }
        return processedData;
    };

    const validateFile = (file: File) => {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return MESSAGES[language].file_too_large;
        }
        return true;
    };

    // Canonical Intake Mutation
    const mutation = useMutation({
        mutationFn: async (processedData: Record<string, unknown>) => {
            if (!formDef) throw new Error('Form definition not found');

            return submitIntake({
                formSlug: formDef.slug,
                requestType: formDef.requestType,
                domain: formDef.domain,
                formData: processedData,
                contextData,
            });
        },
        onSuccess: (result) => {
            const msg = result.message?.[language] || (isAr ? 'تم إرسال طلبك بنجاح!' : 'Your request was submitted successfully!');
            showToast(msg, 'success');
            reset();
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            if (err instanceof IntakeValidationError) {
                // Populate server validation errors into react-hook-form
                Object.entries(err.errors).forEach(([fieldKey, errObj]) => {
                    setError(fieldKey, {
                        type: 'server',
                        message: errObj[language] || errObj.en,
                    });
                });
                showToast(isAr ? 'يرجى تصحيح الأخطاء الموضحة في النموذج.' : 'Please correct the highlighted form errors.', 'error');
            } else {
                console.error('Intake submission error:', err);
                showToast(err.message || (isAr ? 'تعذر إرسال الطلب، يرجى المحاولة لاحقاً.' : 'Failed to submit request. Please try again.'), 'error');
            }
        }
    });

    const onSubmit: SubmitHandler<FieldValues> = async (data) => {
        if (!formDef) return;
        try {
            const processedData = await processFiles(data, formDef.fields);
            if (customSubmit) {
                customSubmit(processedData);
            } else {
                mutation.mutate(processedData);
            }
        } catch (error) {
            console.error("Form processing error:", error);
            showToast(isAr ? 'فشل معالجة ملفات النموذج.' : 'Error processing form files.', 'error');
        }
    };

    if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl border border-gray-200"></div>;
    if (!formDef) return <div className="text-red-500 p-4 border border-red-200 rounded-xl text-xs">Form not found: {slug}</div>;
    if (!formDef.isActive) return <div className="text-gray-500 p-4 border border-gray-200 rounded-xl text-xs">This form is currently inactive.</div>;

    const getValidationRules = (field: FormFieldDefinition): RegisterOptions => {
        const rules: RegisterOptions = {
            required: field.required ? MESSAGES[language].required : false
        };

        if (field.type === 'email') {
            rules.pattern = { value: PATTERNS.EMAIL, message: MESSAGES[language].invalid_email };
        }
        if (field.type === 'tel') {
            rules.pattern = { value: /^[0-9+\-\s()]*$/, message: MESSAGES[language].invalid_number }; 
        }
        if (field.type === 'number') {
             rules.min = { value: 0, message: MESSAGES[language].invalid_number };
        }
        if (field.type === 'file') {
            rules.validate = {
                fileSize: (files: any) => !files || files.length === 0 || validateFile(files[0]) || true
            };
        }

        if (field.validation) {
            const { type, pattern, minLength, maxLength, errorMessage } = field.validation;
            
            if (minLength) rules.minLength = { value: minLength, message: MESSAGES[language].min_length(minLength) };
            if (maxLength) rules.maxLength = { value: maxLength, message: MESSAGES[language].max_length(maxLength) };

            const customMsg = errorMessage?.[language];

            switch (type) {
                case 'email':
                    rules.pattern = { value: PATTERNS.EMAIL, message: customMsg || MESSAGES[language].invalid_email };
                    break;
                case 'phone_eg':
                    rules.pattern = { value: PATTERNS.EGYPTIAN_PHONE, message: customMsg || MESSAGES[language].invalid_phone };
                    break;
                case 'url':
                    rules.pattern = { value: PATTERNS.URL, message: customMsg || MESSAGES[language].invalid_url };
                    break;
                case 'number':
                    rules.pattern = { value: PATTERNS.NUMBERS_ONLY, message: customMsg || MESSAGES[language].invalid_number };
                    break;
                case 'custom':
                    if (pattern) {
                        try {
                            rules.pattern = { value: new RegExp(pattern), message: customMsg || 'Invalid Format' };
                        } catch (e) { console.error("Invalid Regex", pattern); }
                    }
                    break;
            }
        }
        return rules;
    };

    const renderField = (field: FormFieldDefinition) => {
        const label = field.label[language];
        const validationRules = getValidationRules(field);
        const isHidden = hiddenFields.includes(field.key);

        const commonProps = {
            id: field.id,
            placeholder: field.placeholder?.[language],
            ...register(field.key, validationRules)
        };

        if (isHidden) {
            return <input type="hidden" {...commonProps} />;
        }

        switch (field.type) {
            case 'textarea':
                return <Textarea {...commonProps} rows={4} className={inputClasses} />;
            
            case 'select': {
                const options = Array.isArray(field.options) 
                    ? field.options 
                    : (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()) : []);
                return (
                    <Select {...commonProps} className={selectClasses}>
                        <option value="">{isAr ? 'اختر...' : 'Select...'}</option>
                        {options.map(opt => {
                            const optLabel = t.formOptions?.[opt as keyof typeof t.formOptions] || opt;
                            return <option key={opt} value={opt}>{optLabel}</option>;
                        })}
                    </Select>
                );
            }

            case 'radio': {
                const options = Array.isArray(field.options) 
                    ? field.options 
                    : (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()) : []);
                return (
                    <div className="flex flex-wrap gap-4 pt-1">
                        {options.map(opt => (
                            <label key={opt} className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input 
                                    type="radio" 
                                    value={opt} 
                                    {...register(field.key, validationRules)} 
                                    className="text-amber-500 focus:ring-amber-500 h-4 w-4"
                                />
                                <span>{t.formOptions?.[opt as keyof typeof t.formOptions] || opt}</span>
                            </label>
                        ))}
                    </div>
                );
            }

            case 'multi-select': {
                const options = Array.isArray(field.options) 
                    ? field.options 
                    : (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()) : []);
                return (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {options.map(opt => (
                            <label key={opt} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-amber-400 cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    value={opt} 
                                    {...register(field.key, validationRules)} 
                                    className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4 border-gray-300"
                                />
                                <span>{t.formOptions?.[opt as keyof typeof t.formOptions] || opt}</span>
                            </label>
                        ))}
                    </div>
                );
            }

            case 'checkbox':
                return (
                    <div className="flex items-center gap-2">
                        <Checkbox {...commonProps} />
                        <label htmlFor={field.id} className="text-xs text-gray-700 font-semibold cursor-pointer">{label}</label>
                    </div>
                );

            case 'date':
                return <Input type="date" {...commonProps} className={inputClasses} />;

            case 'file':
                return (
                    <Input 
                        type="file" 
                        {...commonProps} 
                        className="p-2 border rounded-lg bg-white border-gray-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" 
                        accept="image/jpeg,image/png,image/webp,application/pdf" 
                    />
                );

            case 'property_selector':
                return (
                    <Select {...commonProps} className={selectClasses}>
                        <option value="">{isAr ? 'اختر العقار المعني...' : 'Select associated property...'}</option>
                        {(properties || []).map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title?.[language] || p.title?.ar || `#${p.id.slice(0, 8)}`}
                            </option>
                        ))}
                    </Select>
                );

            case 'project_selector':
                return (
                    <Select {...commonProps} className={selectClasses}>
                        <option value="">{isAr ? 'اختر الكمبوند أو المشروع...' : 'Select project/compound...'}</option>
                        {(projects || []).map(pr => (
                            <option key={pr.id} value={pr.id}>
                                {pr.name?.[language] || pr.name?.ar}
                            </option>
                        ))}
                    </Select>
                );

            case 'partner_selector':
                return (
                    <Select {...commonProps} className={selectClasses}>
                        <option value="">{isAr ? 'اختر الشريك أو الشركة...' : 'Select partner/developer...'}</option>
                        {(partners || []).map(pt => (
                            <option key={pt.id} value={pt.id}>
                                {pt.name || pt.email}
                            </option>
                        ))}
                    </Select>
                );

            default:
                return <Input type={field.type} {...commonProps} className={inputClasses} />;
        }
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${className}`}>
                {headerContent && <div className="mb-6">{headerContent}</div>}

                {/* 12-column responsive layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {formDef.fields.map((field) => {
                        const isHidden = hiddenFields.includes(field.key);
                        if (isHidden) {
                            return <Fragment key={field.id}>{renderField(field)}</Fragment>;
                        }

                        let colSpanClass = 'md:col-span-12'; 
                        if (field.width === 'half') colSpanClass = 'md:col-span-6';
                        if (field.width === 'third') colSpanClass = 'md:col-span-4';
                        if (field.type === 'textarea') colSpanClass = 'md:col-span-12';
                        
                        return (
                            <div key={field.id} className={colSpanClass}>
                                {field.type !== 'checkbox' ? (
                                    <FormField 
                                        label={field.label[language]} 
                                        id={field.id} 
                                        error={errors[field.key]?.message as string}
                                    >
                                        {renderField(field)}
                                        {field.helpText && (
                                            <p className="text-[11px] text-gray-400 mt-1">{field.helpText[language]}</p>
                                        )}
                                    </FormField>
                                ) : (
                                    <div className="pt-2">
                                        {renderField(field)}
                                        {errors[field.key] && (
                                            <p className="text-red-500 text-xs mt-1">{errors[field.key]?.message as string}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {children && <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">{children}</div>}

                {/* Footer Section with Buttons */}
                <div className="pt-6 mt-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                    <div className="w-full sm:w-auto">
                        {footerContent}
                    </div>

                    <div className="w-full sm:w-auto">
                        <Button 
                            type="submit" 
                            isLoading={isSubmitting || mutation.isPending || uploading} 
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8" 
                            size="lg"
                        >
                            {uploading ? (isAr ? 'جاري الرفع...' : 'Uploading...') : 
                             submitButtonText || formDef.submitButtonLabel?.[language] || (isAr ? 'إرسال' : 'Submit')}
                            {submitButtonIcon}
                        </Button>
                    </div>
                </div>
            </form>
        </FormProvider>
    );
};

export default DynamicForm;
