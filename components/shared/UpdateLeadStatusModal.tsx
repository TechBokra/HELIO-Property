
import React from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from './LanguageContext';
import { LeadStatus } from '../../types';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

interface UpdateLeadStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (status: LeadStatus, note: string) => void;
    currentStatus: LeadStatus;
    isLoading: boolean;
}

const UpdateLeadStatusModal: React.FC<UpdateLeadStatusModalProps> = ({ isOpen, onClose, onUpdate, currentStatus, isLoading }) => {
    const { t } = useLanguage();
    const { register, handleSubmit, formState: { errors } } = useForm<{ status: LeadStatus, note: string }>({
        defaultValues: {
            status: currentStatus,
            note: ''
        }
    });

    const onSubmit = (data: { status: LeadStatus, note:string }) => {
        onUpdate(data.status, data.note);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} aria-labelledby="update-status-title">
            <ModalHeader id="update-status-title" onClose={onClose}>
                Update Request Status
            </ModalHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <ModalContent className="space-y-4 pt-2">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium mb-1">New Status</label>
                        <Select id="status" {...register("status")}>
                            {Object.entries(t.dashboard.leadStatus).map(([key, value]) => (
                                <option key={key} value={key}>{value as string}</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="note" className="block text-sm font-medium mb-1">Comment / Note (Required)</label>
                        <Textarea 
                            id="note" 
                            {...register("note", { required: "A comment is required to update the status." })} 
                            rows={4}
                            placeholder="e.g., Contacted client, scheduled a site visit for tomorrow."
                        />
                        {errors.note && <p className="text-red-500 text-sm mt-1">{errors.note.message}</p>}
                    </div>
                </ModalContent>
                <ModalFooter>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>{t.adminShared.cancel}</Button>
                    <Button type="submit" isLoading={isLoading}>{t.adminShared.save}</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default UpdateLeadStatusModal;
