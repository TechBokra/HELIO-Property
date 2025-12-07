import React from 'react';
import { useLanguage } from '../../shared/LanguageContext';
import FormField, { inputClasses } from '../../ui/FormField';
import { CloseIcon } from '../../ui/Icons';

interface PropertyMediaProps {
    mainImage: string;
    galleryImages: string[];
    handleMainImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleGalleryImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeGalleryImage: (index: number) => void;
}

const PropertyMedia: React.FC<PropertyMediaProps> = ({ 
    mainImage, galleryImages, handleMainImageChange, handleGalleryImagesChange, removeGalleryImage 
}) => {
    const { language, t } = useLanguage();
    const td = t.dashboard.propertyForm;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
                {language === 'ar' ? 'الصور والوسائط' : 'Media & Images'}
            </h2>
            
            <div className="space-y-6">
                <FormField label={td.mainImage} id="imageUrl">
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        {mainImage ? (
                             <img src={mainImage} alt="Main preview" className="w-32 h-32 rounded-lg object-cover border border-amber-200 shadow-sm"/>
                        ) : (
                            <div className="w-32 h-32 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs">No Image</div>
                        )}
                        <input type="file" id="imageUrl" accept="image/*" onChange={handleMainImageChange} className={`${inputClasses} flex-grow`} />
                    </div>
                </FormField>

                <FormField label={td.galleryImages} id="gallery">
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <input type="file" id="gallery" multiple accept="image/*" onChange={handleGalleryImagesChange} className={inputClasses} />
                        {galleryImages.length > 0 ? (
                             <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {galleryImages.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img src={img} alt={`Gallery ${index+1}`} className="w-full h-24 object-cover rounded-md shadow-sm border border-gray-200 dark:border-gray-700"/>
                                        <button 
                                            type="button" 
                                            onClick={() => removeGalleryImage(index)} 
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" 
                                            aria-label="Remove image"
                                        >
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 mt-2 italic text-center py-4">No gallery images added yet.</p>
                        )}
                    </div>
                </FormField>
            </div>
        </div>
    );
};

export default PropertyMedia;