
import React from 'react';
import { useToastManager, ToastMessage } from '../shared/ToastContext';
import { CheckCircleIcon, XCircleIcon, CloseIcon } from './Icons';

const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const { id, message, type } = toast;
  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isSuccess ? 'border-green-400' : 'border-red-400';
  const textColor = isSuccess ? 'text-green-800' : 'text-red-800';
  const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`w-full max-w-sm p-4 ${bgColor} border-l-4 ${borderColor} rounded-lg shadow-lg flex items-start gap-3 animate-fadeIn`}>
      <div className="flex-shrink-0">
        {isSuccess ? <CheckCircleIcon className={`w-6 h-6 ${iconColor}`} /> : <XCircleIcon className={`w-6 h-6 ${iconColor}`} />}
      </div>
      <div className={`flex-grow text-sm font-medium ${textColor}`}>
        {message}
      </div>
      <button onClick={() => onDismiss(id)} className="text-gray-400 hover:text-gray-600">
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastManager();

  return (
    <div className="fixed top-24 right-6 z-[1000] w-full max-w-sm space-y-3">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
