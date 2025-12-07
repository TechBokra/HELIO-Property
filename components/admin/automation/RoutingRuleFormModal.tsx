
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoutingRule } from '../../../data/routingRules';
import { addRoutingRule, updateRoutingRule } from '../../../services/routingRules';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { TrashIcon, CheckCircleIcon } from '../../ui/Icons';
import { Role } from '../../../types';

interface RoutingRuleFormModalProps {
    ruleToEdit?: RoutingRule;
    onClose: () => void;
    onSave: () => void;
}

const RoutingRuleFormModal: React.FC<RoutingRuleFormModalProps> = ({ ruleToEdit, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const t_auto = t.adminDashboard.automation.modal;
    const t_shared = t.adminShared;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });

    const { register, handleSubmit, control, formState: { errors } } = useForm<RoutingRule>({
        defaultValues: ruleToEdit || { name: { en: '', ar: '' }, active: true, conditions: [{ field: 'type', operator: 'equals', value: '' }], action: { assignTo: '' } }
    });
    
    const { fields, append, remove } = useFieldArray({ control, name: "conditions" });

    const mutation = useMutation({
        mutationFn: (data: RoutingRule) => {
            if (ruleToEdit) {
                return updateRoutingRule(ruleToEdit.id, data) as Promise<RoutingRule | null>;
            }
            return addRoutingRule(data);
        },
        onSuccess: () => {
            showToast(`Rule ${ruleToEdit ? 'updated' : 'created'} successfully!`, 'success');
            onSave();
        },
        onError: () => {
            showToast('Failed to save rule.', 'error');
        }
    });

    const onSubmit = (data: RoutingRule) => {
        mutation.mutate(data);
    };

    const fieldOptions = [
        { value: 'type', label: 'Request Type (LEAD, PARTNER_APP, etc.)' },
        { value: 'payload.serviceType', label: 'Service Type (finishing, decorations, property)' },
        { value: 'payload.itemCategory', label: 'Decoration Category' },
        { value: 'payload.budgetRange', label: 'Budget Range' },
        { value: 'payload.companyType', label: 'Partner Type' },
        { value: 'payload.cooperationType', label: 'Cooperation (paid/commission)' },
        { value: 'payload.propertyDetails.price', label: 'Property Price' },
        { value: 'payload.propertyDetails.propertyType.en', label: 'Property Type (Apartment/Villa)' },
        { value: 'requesterInfo.name', label: 'Requester Name' },
        { value: 'requesterInfo.email', label: 'Requester Email' },
    ];

    const operators = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'];
    
    // Filter only internal managers and admins for assignment
    const managers = (partners || []).filter(p => 
        (p.role as string).includes('_manager') || 
        p.role === Role.SUPER_ADMIN ||
        p.type === 'admin'
    );

    return (
        <Modal isOpen={true} onClose={onClose} aria-labelledby="rule-form-title" className="max-w-3xl">
            <ModalHeader onClose={onClose} id="rule-form-title">{ruleToEdit ? t_auto.editTitle : t_auto.addTitle}</ModalHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <ModalContent className="space-y-6 pt-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t_auto.ruleName} (EN)</label>
                            <Input {...register('name.en', { required: true })} placeholder="e.g. Route Decor to Manager" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t_auto.ruleName} (AR)</label>
                            <Input {...register('name.ar', { required: true })} placeholder="مثال: توجيه الديكور" />
                        </div>
                    </div>

                    {/* Logic Builder */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-200">
                            LOGIC BUILDER
                        </div>
                        <div className="p-4 space-y-6">
                            {/* IF SECTION */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">IF</span>
                                    {t_auto.conditions}
                                </h4>
                                <div className="space-y-2">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-2">
                                            <Select {...register(`conditions.${index}.field`)} className="w-1/3" defaultValue="type">
                                                {fieldOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </Select>
                                            <Select {...register(`conditions.${index}.operator`)} className="w-1/4" defaultValue="equals">
                                                {operators.map(op => <option key={op} value={op}>{op.replace('_', ' ')}</option>)}
                                            </Select>
                                            <Input {...register(`conditions.${index}.value`, { required: true })} placeholder="Value" className="flex-grow" />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-gray-400 hover:text-red-500">
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="link" size="sm" className="mt-2 text-amber-600 px-0" onClick={() => append({ field: 'type', operator: 'equals', value: '' })}>
                                    + Add Condition
                                </Button>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700"></div>

                            {/* THEN SECTION */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px]">THEN</span>
                                    {t_auto.action}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 dark:bg-green-900/10 p-4 rounded-md border border-green-100 dark:border-green-800/30">
                                     <div>
                                        <label className="block text-sm font-medium mb-1 text-green-800 dark:text-green-300">{t_auto.assignTo}</label>
                                        <Select {...register('action.assignTo', { required: true })} className="bg-white dark:bg-gray-800">
                                            <option value="" disabled>Select a user...</option>
                                            {managers.map(p => (
                                                <option key={p.id} value={p.id}>{language === 'ar' ? p.nameAr : p.name} ({p.role.replace(/_/g, ' ')})</option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </ModalContent>
                <ModalFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>{t_shared.cancel}</Button>
                    <Button type="submit" isLoading={mutation.isPending}>{t_shared.save}</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default RoutingRuleFormModal;
