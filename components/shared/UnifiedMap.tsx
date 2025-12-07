import { useRef, type FC, type ReactNode, type MouseEvent } from 'react';
import { LocationMarkerIcon } from '../ui/Icons';
import { useQuery } from '@tanstack/react-query';
import { getContent } from '../../services/content';
import { useLanguage } from './LanguageContext';

// Estimated geographical boundaries for the New Heliopolis map image
// These constants act as the "Source of Truth" for the entire app's mapping logic
export const MAP_BOUNDS = {
    maxLat: 30.17,
    minLat: 30.09,
    minLng: 31.58,
    maxLng: 31.68,
};

export interface MapMarker {
    id: string;
    lat: number;
    lng: number;
    tooltip?: ReactNode;
    color?: 'red' | 'amber' | 'green' | 'blue';
    onClick?: () => void;
}

interface UnifiedMapProps {
    mode?: 'read' | 'pick';
    markers?: MapMarker[];
    activeMarkerId?: string | null;
    onLocationSelect?: (lat: number, lng: number) => void;
    onMarkerHover?: (id: string | null) => void;
    className?: string;
    height?: string;
}

const UnifiedMap: FC<UnifiedMapProps> = ({
    mode = 'read',
    markers = [],
    activeMarkerId,
    onLocationSelect,
    onMarkerHover,
    className = '',
    height = '100%'
}) => {
    const { language } = useLanguage();
    const { data: siteContent, isLoading } = useQuery({ queryKey: ['siteContent'], queryFn: getContent });
    const mapRef = useRef<HTMLDivElement>(null);

    const convertToPixel = (lat: number, lng: number) => {
        const latRange = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
        const lngRange = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;

        const x = ((lng - MAP_BOUNDS.minLng) / lngRange) * 100;
        const y = ((MAP_BOUNDS.maxLat - lat) / latRange) * 100;

        return { x, y };
    };

    const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
        if (mode !== 'pick' || !onLocationSelect) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        const lngRange = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;
        const latRange = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;

        const lng = MAP_BOUNDS.minLng + (xPercent / 100) * lngRange;
        const lat = MAP_BOUNDS.maxLat - (yPercent / 100) * latRange;

        onLocationSelect(lat, lng);
    };

    // Pin styling helper
    const getPinColorClass = (color?: string, isActive?: boolean) => {
        if (isActive) return 'text-amber-500 scale-125 z-30';
        switch (color) {
            case 'green': return 'text-green-600';
            case 'blue': return 'text-blue-600';
            case 'amber': return 'text-amber-500';
            default: return 'text-red-600';
        }
    };

    return (
        <div className={`relative bg-gray-200 overflow-hidden rounded-lg ${className}`} style={{ height }}>
            {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse bg-gray-100">
                    Loading map...
                </div>
            ) : (
                <div 
                    className={`absolute inset-0 bg-no-repeat bg-center bg-cover transition-opacity duration-500 ${mode === 'pick' ? 'cursor-crosshair' : 'cursor-default'} bg-gray-300`}
                    style={{ 
                        backgroundImage: siteContent?.locationPickerMapUrl ? `url('${siteContent.locationPickerMapUrl}')` : undefined,
                    }}
                    onClick={handleMapClick}
                    title={language === 'ar' ? 'خريطة هليوبوليس الجديدة' : 'New Heliopolis Map'}
                >
                     {!siteContent?.locationPickerMapUrl && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            Map image not configured.
                        </div>
                     )}
                </div>
            )}

            {/* Render Markers */}
            {markers.map(marker => {
                const pos = convertToPixel(marker.lat, marker.lng);
                // Safety check to keep pins visually inside container mostly
                if (pos.x < -5 || pos.x > 105 || pos.y < -5 || pos.y > 105) return null;

                const isActive = activeMarkerId === marker.id;

                return (
                    <div
                        key={marker.id}
                        className="absolute transform -translate-x-1/2 -translate-y-full z-10 group"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        onMouseEnter={() => onMarkerHover?.(marker.id)}
                        onMouseLeave={() => onMarkerHover?.(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            marker.onClick?.();
                        }}
                    >
                        <LocationMarkerIcon 
                            className={`w-8 h-8 sm:w-10 sm:h-10 drop-shadow-lg transition-all duration-200 ${getPinColorClass(marker.color, isActive)} hover:scale-110 cursor-pointer`} 
                        />
                        
                        {/* Tooltip */}
                        {marker.tooltip && (isActive || mode === 'read') && (
                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-[200px] transition-opacity duration-200 ${isActive ? 'opacity-100 z-40' : 'opacity-0 group-hover:opacity-100 z-20 pointer-events-none'}`}>
                                {marker.tooltip}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default UnifiedMap;