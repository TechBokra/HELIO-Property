import React, { useEffect, useRef, type FC, type ReactNode, type MouseEvent } from 'react';
import { CloseIcon } from './Icons';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './Card';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    'aria-labelledby': string;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, children, className, ...props }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
                document.body.style.overflow = 'hidden';
            }
            
            // Focus management
            const firstFocusable = dialog.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
            if (firstFocusable) {
                firstFocusable.focus();
            }
        } else {
            if (dialog.open) {
                dialog.close();
            }
            document.body.style.overflow = '';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = '';
            if (dialog.open) {
                dialog.close();
            }
        };
    }, [isOpen]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault(); // Prevent default browser escape behavior (which might not trigger state update)
            onClose();
        }
    };

    const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === dialogRef.current) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <dialog
            ref={dialogRef}
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
            className="p-0 bg-transparent backdrop:bg-black/70 backdrop:backdrop-blur-sm rounded-lg shadow-xl max-w-lg w-full m-auto open:animate-fadeIn"
            aria-modal="true"
            {...props}
        >
            <div className="w-full h-full flex items-center justify-center p-4">
                <Card className={`w-full max-h-[90vh] overflow-y-auto ${className}`}>{children}</Card>
            </div>
        </dialog>
    );
};

const ModalHeader: FC<{ children: ReactNode; onClose: () => void; id: string }> = ({
    children,
    onClose,
    id,
}) => (
    <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4 mb-2">
        <CardTitle id={id}>{children}</CardTitle>
        <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
            type="button"
        >
            <CloseIcon className="w-5 h-5" />
        </button>
    </CardHeader>
);

const ModalContent = CardContent;
const ModalFooter = CardFooter;

export { Modal, ModalHeader, ModalContent, ModalFooter };