
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { CloseIcon } from '../ui/Icons';
import UnifiedMap, { MapMarker } from './UnifiedMap';

interface LocationPickerModalProps {
    onClose: () => void;
    onLocationSelect: (location: { lat: number, lng: number }) => void;
    initialLocation?: { lat: number, lng: number };
}

const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ onClose, onLocationSelect, initialLocation }) => {
    const { language } = useLanguage();
    const modalRef = useRef<HTMLDivElement>(null);
    
    // Local state for the pin being dragged/placed
    const [tempPin, setTempPin] = useState<{ lat: number, lng: number } | undefined>(initialLocation);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    const handleMapSelect = (lat: number, lng: number) => {
        setTempPin({ lat, lng });
    };

    const handleConfirm = () => {
        if (tempPin) {
            onLocationSelect(tempPin);
        }
    };

    const markers: MapMarker[] = tempPin ? [{
        id: 'selection',
        lat: tempPin.lat,
        lng: tempPin.lng,
        color: 'red'
    }] : [];

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex justify-center items-center p-4 animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="location-picker-title">
            <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 id="location-picker-title" className="text-xl font-bold text-gray-900">
                        {language === 'ar' ? 'حدد الموقع على الخريطة' : 'Select Location on Map'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow relative">
                    <UnifiedMap 
                        mode="pick"
                        markers={markers}
                        onLocationSelect={handleMapSelect}
                        height="100%"
                    />
                    
                    {!tempPin && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none shadow-lg backdrop-blur-sm">
                            {language === 'ar' ? 'انقر في أي مكان لتحديد الموقع' : 'Click anywhere to place pin'}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-100 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm font-mono text-gray-700 bg-white px-3 py-1 rounded border">
                        {tempPin ? `Lat: ${tempPin.lat.toFixed(6)}, Lng: ${tempPin.lng.toFixed(6)}` : '---, ---'}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium transition-colors text-gray-800">
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button onClick={handleConfirm} disabled={!tempPin} className="px-6 py-2 rounded-lg bg-amber-500 text-gray-900 font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                            {language === 'ar' ? 'تأكيد الموقع' : 'Confirm Location'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationPickerModal;
