
import React from 'react';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './Modal';
import { Button } from './Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} aria-labelledby="confirmation-title">
            <ModalHeader id="confirmation-title" onClose={onClose}>
                {title}
            </ModalHeader>
            <ModalContent>
                <p className="text-sm text-gray-500">{message}</p>
            </ModalContent>
            <ModalFooter>
                <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                    {cancelText}
                </Button>
                <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
                    {confirmText}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ConfirmationModal;
