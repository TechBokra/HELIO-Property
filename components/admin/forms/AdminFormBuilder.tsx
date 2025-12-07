
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import type { FormDefinition, FormFieldType, ValidationRuleType } from '../../../types';
import { saveForm } from '../../../services/forms';
import { useToast } from '../../shared/ToastContext';
import { useLanguage } from '../../shared/LanguageContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Checkbox } from '../../ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';
import { TrashIcon, ArrowUpIcon, ArrowDownIcon, CloseIcon, PlusIcon, CogIcon, ShieldCheckIcon } from '../../ui/Icons';

interface AdminFormBuilderProps {
    formToEdit?: FormDefinition;
    onClose: () => void;
}

const fieldTypes: FormFieldType[] = ['text', 'textarea', 'number', 'email', 'tel', 'select', 'checkbox', 'radio', 'date', 'file'];
const validationTypes: {value: ValidationRuleType, label: string}[] = [
    { value: 'none', label: 'None (Default)' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone_eg', label: 'Egyptian Phone' },
    { value: 'url', label: 'URL / Link' },
    { value: 'number', label: 'Numbers Only' },
    { value: 'custom', label: 'Custom Regex Pattern' },
];

const AdminFormBuilder: React.FC<AdminFormBuilderProps> = ({ formToEdit, onClose }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [expandedField, setExpandedField] = useState<number | null>(null);

    const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormDefinition>({
        defaultValues: formToEdit || {
            title: { ar: '', en: '' },
            description: { ar: '', en: '' },
            slug: '',
            category: 'public',
            destination: 'crm_messages',
            isActive: true,
            submitButtonLabel: { ar: 'إرسال', en: 'Submit' },
            fields: []
        }
    });

    const { fields, append, remove, swap } = useFieldArray({ control, name: 'fields' });

    const mutation = useMutation({
        mutationFn: saveForm,
        onSuccess: () => {
            showToast('Form saved successfully!', 'success');
            onClose();
        },
        onError: () => showToast('Failed to save form.', 'error')
    });

    const onSubmit = (data: FormDefinition) => {
        mutation.mutate(data);
    };

    const addField = () => {
        append({
            id: `field-${Date.now()}`,
            type: 'text',
            key: `field_${Date.now()}`,
            label: { ar: 'حقل جديد', en: 'New Field' },
            required: false,
            width: 'full',
            validation: { type: 'none' }
        });
        setExpandedField(fields.length); // Auto expand new field
    };
    
    const toggleExpand = (index: number) => {
        setExpandedField(expandedField === index ? null : index);
    };

    return (
        <div className="animate-fadeIn max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formToEdit ? 'Edit Form' : 'Create New Form'}
                    </h2>
                    <p className="text-sm text-gray-500">Design your data collection form with robust validation.</p>
                </div>
                <Button variant="secondary" onClick={onClose}><CloseIcon className="w-5 h-5 mr-2"/> Close</Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Basic Info */}
                <Card>
                    <CardHeader><CardTitle>General Configuration</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Form Title (AR)" id="title.ar" error={errors.title?.ar?.message}>
                            <Input {...register('title.ar', { required: 'Arabic title is required' })} dir="rtl" placeholder="مثال: اتصل بنا" />
                        </FormField>
                        <FormField label="Form Title (EN)" id="title.en" error={errors.title?.en?.message}>
                            <Input {...register('title.en', { required: 'English title is required' })} dir="ltr" placeholder="e.g. Contact Us" />
                        </FormField>
                        
                        <FormField label="Slug (Unique ID)" id="slug" error={errors.slug?.message}>
                            <Input 
                                {...register('slug', { required: 'Slug is required', pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase letters and hyphens only' } })} 
                                placeholder="unique-form-id" 
                                className="font-mono text-sm"
                            />
                        </FormField>

                         <div className="flex items-end pb-3">
                            <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 w-full border-gray-200 dark:border-gray-700">
                                <Checkbox id="isActive" {...register('isActive')} />
                                <label htmlFor="isActive" className="cursor-pointer font-medium">Form is Active</label>
                            </div>
                        </div>
                        
                        <FormField label="Category" id="category">
                            <Select {...register('category')} className={selectClasses}>
                                <option value="public">Public Pages</option>
                                <option value="lead_gen">Lead Generation</option>
                                <option value="partner_app">Partner Application</option>
                                <option value="admin_internal">Internal Admin Form</option>
                            </Select>
                        </FormField>

                        <FormField label="Destination" id="destination">
                            <Select {...register('destination')} className={selectClasses}>
                                <option value="crm_messages">CRM: General Messages</option>
                                <option value="crm_leads">CRM: Leads Pipeline</option>
                                <option value="crm_partners">CRM: Partner Requests</option>
                                <option value="email">Email Notification Only</option>
                            </Select>
                        </FormField>

                         <FormField label="Submit Button (AR)" id="submitButtonLabel.ar">
                            <Input {...register('submitButtonLabel.ar')} dir="rtl" placeholder="إرسال" />
                        </FormField>
                         <FormField label="Submit Button (EN)" id="submitButtonLabel.en">
                            <Input {...register('submitButtonLabel.en')} dir="ltr" placeholder="Submit" />
                        </FormField>
                    </CardContent>
                </Card>

                {/* Fields Builder */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between sticky top-0 bg-gray-50 dark:bg-gray-900 py-4 z-10 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <CogIcon className="w-6 h-6 text-amber-500" /> Form Fields
                        </h3>
                        <Button type="button" onClick={addField} className="flex items-center gap-2 shadow-md">
                            <PlusIcon className="w-5 h-5" /> Add Field
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm relative group transition-all duration-200 ${expandedField === index ? 'ring-2 ring-amber-500 shadow-md' : 'hover:border-amber-400'}`}>
                                <div className="absolute top-4 right-4 flex gap-1">
                                    <Button type="button" size="icon" variant="ghost" onClick={() => toggleExpand(index)} className={expandedField === index ? 'bg-amber-100 text-amber-600' : ''}><CogIcon className="w-4 h-4" /></Button>
                                    <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index - 1)} disabled={index === 0}><ArrowUpIcon className="w-4 h-4" /></Button>
                                    <Button type="button" size="icon" variant="ghost" onClick={() => swap(index, index + 1)} disabled={index === fields.length - 1}><ArrowDownIcon className="w-4 h-4" /></Button>
                                    <Button type="button" size="icon" variant="danger" onClick={() => remove(index)}><TrashIcon className="w-4 h-4" /></Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pr-32 mb-2 items-center">
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Label (EN)</label>
                                        <Input {...register(`fields.${index}.label.en`, { required: true })} dir="ltr" placeholder="Field Name" className="h-9 text-sm" />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Key (Variable)</label>
                                        <Input {...register(`fields.${index}.key`, { required: true, pattern: /^[a-zA-Z0-9_]+$/ })} placeholder="field_key" className="font-mono text-xs h-9 bg-gray-50" />
                                    </div>
                                     <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                        <Select {...register(`fields.${index}.type`)} className={`${selectClasses} h-9 py-1 text-sm`}>
                                            {fieldTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2 flex items-center pt-5 justify-center">
                                         <Checkbox id={`req-${field.id}`} {...register(`fields.${index}.required`)} />
                                        <label htmlFor={`req-${field.id}`} className="text-sm font-semibold ml-2 cursor-pointer">Required</label>
                                    </div>
                                </div>

                                {expandedField === index && (
                                    <div className="mt-4 pt-6 border-t border-gray-100 dark:border-gray-700 animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b pb-2">Display Options</h4>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Label (Arabic)</label>
                                                <Input {...register(`fields.${index}.label.ar`, { required: true })} dir="rtl" placeholder="اسم الحقل" />
                                            </div>
                                             <div>
                                                <label className="block text-xs font-medium mb-1">Placeholder (EN)</label>
                                                <Input {...register(`fields.${index}.placeholder.en`)} dir="ltr" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Placeholder (AR)</label>
                                                <Input {...register(`fields.${index}.placeholder.ar`)} dir="rtl" />
                                            </div>
                                             <div>
                                                <label className="block text-xs font-medium mb-1">Width Layout</label>
                                                <Select {...register(`fields.${index}.width`)} className={selectClasses}>
                                                    <option value="full">Full Width (100%)</option>
                                                    <option value="half">Half Width (50%)</option>
                                                    <option value="third">One Third (33%)</option>
                                                </Select>
                                            </div>
                                            {['select', 'radio', 'checkbox'].includes(watch(`fields.${index}.type`)) && (
                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                                                    <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">Options (Comma Separated)</label>
                                                    <Input {...register(`fields.${index}.options` as any)} placeholder="Option 1, Option 2, Option 3" />
                                                    <p className="text-[10px] text-blue-600 mt-1">Keys for translation should be defined in localization files.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                                                <h4 className="text-sm font-bold text-amber-600 flex items-center gap-2">
                                                    <ShieldCheckIcon className="w-4 h-4" /> Advanced Validation
                                                </h4>
                                            </div>
                                            
                                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-800/30 space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Validation Rule</label>
                                                    <Select {...register(`fields.${index}.validation.type`)} className={selectClasses}>
                                                        {validationTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </Select>
                                                </div>
                                                
                                                {watch(`fields.${index}.validation.type`) === 'custom' && (
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Regex Pattern</label>
                                                        <Input {...register(`fields.${index}.validation.pattern`)} placeholder="e.g. ^[A-Z]{3}-\d{3}$" className="font-mono text-xs bg-white" />
                                                    </div>
                                                )}
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Min Length</label>
                                                        <Input type="number" {...register(`fields.${index}.validation.minLength`, { valueAsNumber: true })} className="bg-white" />
                                                    </div>
                                                     <div>
                                                        <label className="block text-xs font-medium mb-1">Max Length</label>
                                                        <Input type="number" {...register(`fields.${index}.validation.maxLength`, { valueAsNumber: true })} className="bg-white" />
                                                    </div>
                                                </div>

                                                {watch(`fields.${index}.validation.type`) !== 'none' && (
                                                     <div className="grid grid-cols-1 gap-2 pt-2">
                                                        <label className="block text-xs font-medium text-gray-500">Custom Error Message</label>
                                                        <Input {...register(`fields.${index}.validation.errorMessage.en`)} placeholder="English Error Message" className="bg-white text-xs" />
                                                        <Input {...register(`fields.${index}.validation.errorMessage.ar`)} placeholder="رسالة الخطأ بالعربية" dir="rtl" className="bg-white text-xs" />
                                                     </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {fields.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                            <p className="text-gray-500 mb-4">No fields added yet.</p>
                            <Button type="button" onClick={addField} variant="outline">Start Adding Fields</Button>
                        </div>
                    )}
                </div>
                
                <div className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 z-20 shadow-lg rounded-b-lg -mx-4 -mb-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={isSubmitting}>Save Form</Button>
                </div>
            </form>
        </div>
    );
};

export default AdminFormBuilder;
