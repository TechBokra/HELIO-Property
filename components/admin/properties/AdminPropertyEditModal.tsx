
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Property, ListingStatus } from '../../../types';
import { updateProperty } from '../../../services/properties';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';

interface AdminPropertyEditModalProps {
    property: Property;
    onClose: () => void;
    onSave: () => void;
}

const AdminPropertyEditModal: React.FC<AdminPropertyEditModalProps> = ({ property, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState<ListingStatus>(property.listingStatus);
    const [startDate, setStartDate] = useState(property.listingStartDate?.split('T')[0] || '');
    const [endDate, setEndDate] = useState(property.listingEndDate?.split('T')[0] || '');

    const mutation = useMutation({
        mutationFn: (updates: Partial<Property>) => updateProperty(property.id, updates),
        onSuccess: () => {
            showToast('Property updated successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
            onSave();
        },
        onError: () => {
            showToast('Failed to update property.', 'error');
        }
    });

    const handleSave = () => {
        mutation.mutate({ 
            listingStatus: status,
            listingStartDate: startDate || undefined,
            listingEndDate: endDate || undefined,
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} aria-labelledby="edit-property-title">
            <ModalHeader onClose={onClose} id="edit-property-title">
                {t_admin.editPropertyModal.title}: {property.title[language]}
            </ModalHeader>
            <ModalContent className="space-y-4 pt-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t_admin.propertyTable.liveStatus}
                    </label>
                    <Select value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                        <option value="sold">Sold/Rented</option>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t_admin.editPropertyModal.listingStartDate}
                        </label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t_admin.editPropertyModal.listingEndDate}
                        </label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Button variant="secondary" onClick={onClose}>{t.adminShared.cancel}</Button>
                <Button onClick={handleSave} isLoading={mutation.isPending}>{t.adminShared.save}</Button>
            </ModalFooter>
        </Modal>
    );
};

export default AdminPropertyEditModal;
