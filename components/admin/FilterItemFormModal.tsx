
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { FilterOption } from '../../types';
import FormField from '../ui/FormField';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { addFilterOption, updateFilterOption, getAllPropertyTypes } from '../../services/filters';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Checkbox } from '../ui/Checkbox';

interface FilterItemFormModalProps {
    dataType: 'propertyType' | 'finishingStatus' | 'amenity';
    itemToEdit?: FilterOption;
    onClose: () => void;
    onSave: () => void;
}

const FilterItemFormModal: React.FC<FilterItemFormModalProps> = ({ dataType, itemToEdit, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const t_shared = t.adminShared;
    const { showToast } = useToast();

    // Fetch property types to allow mapping (only needed if we are editing amenities or finishing)
    const { data: propertyTypes } = useQuery({ 
        queryKey: ['propertyTypes'], 
        queryFn: getAllPropertyTypes,
        enabled: dataType !== 'propertyType' 
    });

    const [formData, setFormData] = useState({
        en: itemToEdit?.en || '',
        ar: itemToEdit?.ar || '',
        applicableTo: itemToEdit?.applicableTo || [],
    });

    const mutation = useMutation({
        mutationFn: (data: { en: string; ar: string; applicableTo?: string[] }) => {
            const payload = { 
                ...data,
                // If applicableTo is empty or not needed (propertyType), we can either send undefined or empty array. 
                // Logic downstream usually treats empty array as "Applicable to All" or "None" depending on implementation.
                // Here, for propertyType, we exclude it. For others, we send it.
                applicableTo: dataType === 'propertyType' ? undefined : data.applicableTo 
            };

            if (itemToEdit) {
                return updateFilterOption(dataType, { ...itemToEdit, ...payload });
            } else {
                return addFilterOption(dataType, payload);
            }
        },
        onSuccess: () => {
            showToast(`Filter option saved successfully!`, 'success');
            onSave();
        },
        onError: () => {
            showToast('Failed to save filter option.', 'error');
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleApplicableToChange = (typeEn: string) => {
        setFormData(prev => {
            const current = prev.applicableTo || [];
            if (current.includes(typeEn)) {
                return { ...prev, applicableTo: current.filter(t => t !== typeEn) };
            } else {
                return { ...prev, applicableTo: [...current, typeEn] };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    const isApplicableSectionVisible = dataType !== 'propertyType' && propertyTypes && propertyTypes.length > 0;

    return (
        <Modal isOpen={true} onClose={onClose} aria-labelledby="filter-form-title">
            <ModalHeader onClose={onClose} id="filter-form-title">
                {itemToEdit ? t_shared.edit : t_shared.add} {dataType === 'amenity' ? 'Amenity' : dataType === 'finishingStatus' ? 'Finishing Status' : 'Property Type'}
            </ModalHeader>
            <form onSubmit={handleSubmit}>
                <ModalContent className="space-y-6 pt-2">
                    <div className="space-y-4">
                        <FormField label="Name (English)" id="en">
                            <Input type="text" name="en" value={formData.en} onChange={handleChange} required placeholder="e.g. Swimming Pool" />
                        </FormField>
                        <FormField label="Name (Arabic)" id="ar">
                            <Input type="text" name="ar" value={formData.ar} onChange={handleChange} required placeholder="مثال: حمام سباحة" />
                        </FormField>
                    </div>

                    {isApplicableSectionVisible && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 animate-fadeIn">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Applicable To (Property Types)
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Select which property types this option should appear for. Leave unchecked to apply to all (or none, depending on logic).
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {propertyTypes?.map((type) => (
                                    <label key={type.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                                        <Checkbox 
                                            checked={formData.applicableTo?.includes(type.en)}
                                            onCheckedChange={() => handleApplicableToChange(type.en)}
                                        />
                                        <span className="text-sm text-gray-800 dark:text-gray-200">{type[language]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </ModalContent>
                <ModalFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>{t_shared.cancel}</Button>
                    <Button type="submit" isLoading={mutation.isPending}>
                        {t_shared.save}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default FilterItemFormModal;
