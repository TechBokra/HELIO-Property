
import { Fragment, type ReactNode, type FC, useState } from 'react';
import { useForm, SubmitHandler, FormProvider, FieldValues, RegisterOptions } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFormBySlug } from '../../services/forms';
import { addRequest } from '../../services/requests';
import { RequestType } from '../../types';
import type { FormFieldDefinition, SubmissionDestination } from '../../types';
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
import { getAttribution } from '../../utils/attribution';

interface DynamicFormProps {
    slug: string;
    defaultValues?: Record<string, unknown>;
    onSuccess?: () => void;
    className?: string;
    contextData?: Record<string, unknown>; 
    children?: ReactNode; 
    headerContent?: ReactNode; 
    footerContent?: ReactNode; // New prop for injecting buttons (Back, Cancel, etc.)
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
    const { showToast } = useToast();
    const [uploading, setUploading] = useState(false);

    const { data: formDef, isLoading } = useQuery({
        queryKey: ['form', slug],
        queryFn: () => getFormBySlug(slug),
    });

    const methods = useForm<FieldValues>({
        defaultValues: defaultValues || {}
    });
    
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = methods;

    const processFiles = async (formData: FieldValues, fields: FormFieldDefinition[]) => {
        const processedData = { ...formData };
        const fileFields = fields.filter(f => f.type === 'file');
        
        if (fileFields.length > 0) setUploading(true);

        try {
            for (const field of fileFields) {
                const fileList = formData[field.key];
                if (fileList && fileList.length > 0) {
                    // Upload to Cloudinary
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
    }

    const mutation = useMutation({
        mutationFn: async (processedData: Record<string, unknown>) => {
            if (!formDef) throw new Error('Form definition not found');
            const destination = formDef.destination as SubmissionDestination;

            const payload = { ...processedData, ...contextData };

            const requesterInfo = {
                name: String(payload.name || payload.customerName || payload.fullName || 'Anonymous'),
                phone: String(payload.phone || payload.customerPhone || ''),
                email: String(payload.email || payload.contactEmail || '')
            };

            switch (destination) {
                case 'crm_messages':
                    return addRequest(RequestType.CONTACT_MESSAGE, {
                        requesterInfo,
                        payload: { ...payload, inquiryType: 'client' }
                    });
                case 'crm_leads': {
                     const attr = getAttribution({
                         source: payload.propertyId ? 'property_page' : 'inquiry_form',
                         propertyId: payload.propertyId as string | undefined,
                         pageOrigin: window.location.pathname,
                     });
                     return addRequest(RequestType.LEAD, {
                        requesterInfo,
                        payload: {
                            customerName: requesterInfo.name,
                            customerPhone: requesterInfo.phone,
                            serviceType: (payload.serviceType as any) || 'general',
                            serviceTitle: (payload.serviceTitle as string) || `${formDef.title.en} Submission`,
                            ...payload,
                            ...attr,
                        }
                    });
                }
                case 'crm_partners':
                    return addRequest(RequestType.PARTNER_APPLICATION, {
                        requesterInfo,
                        payload: { ...payload, status: 'pending' }
                    });
                 case 'email':
                    // Simulate email sending delay
                    return new Promise(resolve => setTimeout(resolve, 1000));
                default:
                     return addRequest(RequestType.PROPERTY_INQUIRY, {
                        requesterInfo,
                        payload
                    });
            }
        },
        onSuccess: () => {
            showToast(language === 'ar' ? 'تم الإرسال بنجاح!' : 'Submitted successfully!', 'success');
            reset();
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            console.error(err);
            showToast(language === 'ar' ? 'حدث خطأ أثناء الإرسال.' : 'Submission failed.', 'error');
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
            showToast("Error processing form data", "error");
        }
    };

    if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>;
    if (!formDef) return <div className="text-red-500">Form not found: {slug}</div>;
    if (!formDef.isActive) return <div className="text-gray-500">This form is currently inactive.</div>;

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
            }
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
            case 'select':
                const options = Array.isArray(field.options) ? field.options : (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()) : []);
                return (
                    <Select {...commonProps} className={selectClasses}>
                        <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
                        {options.map(opt => {
                            const label = t.formOptions?.[opt as keyof typeof t.formOptions] || opt;
                            return <option key={opt} value={opt}>{label}</option>
                        })}
                    </Select>
                );
            case 'checkbox':
                return (
                    <div className="flex items-center gap-2">
                        <Checkbox {...commonProps} />
                        <label htmlFor={field.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">{label}</label>
                    </div>
                );
            case 'file':
                return (
                    <Input 
                        type="file" 
                        {...commonProps} 
                        className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-900 dark:file:text-amber-300" 
                        accept="image/*,application/pdf" 
                    />
                );
            default:
                return <Input type={field.type} {...commonProps} className={inputClasses} />;
        }
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${className}`}>
                {headerContent && <div className="mb-6">{headerContent}</div>}

                {/* Using 12-column grid for finer control */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {formDef.fields.map((field) => {
                        const isHidden = hiddenFields.includes(field.key);
                        if (isHidden) {
                            return <Fragment key={field.id}>{renderField(field)}</Fragment>;
                        }

                        // Determine colspan based on width config using 12-col system
                        // full = 12, half = 6, third = 4
                        let colSpanClass = 'md:col-span-12'; 
                        if (field.width === 'half') colSpanClass = 'md:col-span-6';
                        if (field.width === 'third') colSpanClass = 'md:col-span-4';
                        
                        // Force full width for textareas
                        if (field.type === 'textarea') colSpanClass = 'md:col-span-12';
                        
                        return (
                            <div key={field.id} className={colSpanClass}>
                                {field.type !== 'checkbox' && (
                                    <FormField 
                                        label={field.label[language]} 
                                        id={field.id} 
                                        error={errors[field.key]?.message as string}
                                    >
                                        {renderField(field)}
                                    </FormField>
                                )}
                                {field.type === 'checkbox' && (
                                    <div className="pt-6">
                                        {renderField(field)}
                                        {errors[field.key] && <p className="text-red-500 text-sm mt-1">{errors[field.key]?.message as string}</p>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {children && <div className="mt-8 space-y-6 border-t border-gray-100 dark:border-gray-700 pt-6">{children}</div>}

                {/* Footer Section with Buttons */}
                <div className="pt-8 mt-8 border-t border-gray-100 dark:border-gray-700 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                    {/* Left side: Back/Cancel buttons via prop */}
                    <div className="w-full sm:w-auto">
                        {footerContent}
                    </div>

                    {/* Right side: Submit */}
                    <div className="w-full sm:w-auto">
                        <Button 
                            type="submit" 
                            isLoading={isSubmitting || mutation.isPending || uploading} 
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8" 
                            size="lg"
                        >
                            {uploading ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') : 
                             submitButtonText || formDef.submitButtonLabel?.[language] || (language === 'ar' ? 'إرسال' : 'Submit')}
                            {submitButtonIcon}
                        </Button>
                    </div>
                </div>
            </form>
        </FormProvider>
    );
};

export default DynamicForm;
