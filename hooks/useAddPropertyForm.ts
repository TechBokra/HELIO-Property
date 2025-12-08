
import React, { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addRequest } from '../services/requests';
import { RequestType, AddPropertyRequest, FilterOption } from '../types';
import { useToast } from '../components/shared/ToastContext';
import { getAllPropertyTypes, getAllFinishingStatuses, getAllAmenities } from '../services/filters';
import { getPlans } from '../services/plans';
import { useLanguage } from '../components/shared/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../services/upload';

const purposeOptions = [
    { en: 'For Sale', ar: 'للبيع' },
    { en: 'For Rent', ar: 'إيجار' },
] as const;

export const useAddPropertyForm = () => {
    const { language, t } = useLanguage();
    const t_page = t.addPropertyPage;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(1);
    const [purpose, setPurpose] = useState<'For Sale' | 'For Rent' | null>(null);
    const [cooperationType, setCooperationType] = useState<'paid_listing' | 'commission' | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Data Fetching
    const { data: propertyTypes, isLoading: isLoadingPropTypes } = useQuery({ queryKey: ['propertyTypes'], queryFn: getAllPropertyTypes });
    const { data: finishingStatuses, isLoading: isLoadingFinishing } = useQuery({ queryKey: ['finishingStatuses'], queryFn: getAllFinishingStatuses });
    const { data: amenities, isLoading: isLoadingAmenities } = useQuery({ queryKey: ['amenities'], queryFn: getAllAmenities });
    const { data: plans, isLoading: isLoadingPlans } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
    const isLoadingContext = isLoadingPropTypes || isLoadingFinishing || isLoadingPlans || isLoadingAmenities;

    // React Hook Form
    const { register, handleSubmit, watch, setValue, formState: { errors }, reset, getValues } = useForm({
        defaultValues: {
            customerName: '', customerPhone: '', contactTime: '',
            description: { ar: '', en: '' },
            propertyType: '', finishingStatus: '', area: '', price: '',
            bedrooms: '', bathrooms: '', floor: '', address: '',
            latitude: '', longitude: '',
            isInCompound: 'no' as 'yes' | 'no',
            deliveryType: 'immediate' as 'immediate' | 'future',
            deliveryMonth: '', deliveryYear: '',
            hasInstallments: 'no' as 'yes' | 'no',
            realEstateFinanceAvailable: 'no' as 'yes' | 'no',
            downPayment: '', monthlyInstallment: '', years: '',
            listingStartDate: '', listingEndDate: '',
            isOwner: false,
            contactMethod: 'platform' as 'platform' | 'direct',
            ownerPhone: '',
            amenities: { en: [] as string[], ar: [] as string[] },
        }
    });
    
    const watchPropertyType = watch("propertyType");
    const watchLatitude = watch("latitude");
    const watchLongitude = watch("longitude");
    const watchAmenities = watch('amenities');

    // Mutation for submission
    const mutation = useMutation({
        mutationFn: (data: any) => addRequest(RequestType.PROPERTY_LISTING_REQUEST, data),
        onSuccess: () => {
            setFormSubmitted(true);
            queryClient.invalidateQueries({ queryKey: ['allRequests'] });
            queryClient.invalidateQueries({ queryKey: ['propertyRequests'] });
        },
        onError: (error) => {
            console.error("Failed to submit property request:", error);
            showToast('Submission failed. Please try again.', 'error');
        }
    });

    const resetForm = () => {
        reset();
        setImages([]);
        setImagePreviews([]);
        setCooperationType(null);
        setPurpose(null);
        setCurrentStep(1);
        setFormSubmitted(false);
    };

    // Step navigation
    const nextStep = () => setCurrentStep(prev => prev + 1);
    const prevStep = () => {
        if (currentStep === 3) setCooperationType(null);
        if (currentStep === 2) setPurpose(null);
        setCurrentStep(prev => prev - 1);
    }
    const handlePurposeSelect = (p: 'For Sale' | 'For Rent') => {
        setPurpose(p);
        nextStep();
    }
    const handleCooperationSelect = (c: 'paid_listing' | 'commission') => {
        setCooperationType(c);
        nextStep();
    }

    const plansForPurpose = useMemo(() => {
        if (!purpose || !plans?.individual) return {};
        const subCategory = purpose === 'For Sale' ? 'sale' : 'rent';
        return (plans.individual as any)[subCategory] || {};
    }, [purpose, plans]);

    // Image handling
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray: File[] = Array.from(e.target.files);
            if ((images.length + filesArray.length) > 10) {
                showToast('You can only upload a maximum of 10 images.', 'error');
                return;
            }
            setImages(prev => [...prev, ...filesArray]);
            const newPreviews = filesArray.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };
    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Location Modal Handlers
    const handleLocationSelect = (location: { lat: number, lng: number }) => {
        setValue('latitude', String(location.lat), { shouldValidate: true });
        setValue('longitude', String(location.lng), { shouldValidate: true });
        setIsLocationModalOpen(false);
    };

    // Dynamic Options
    const availableAmenities = useMemo(() => {
        if (!amenities) return [];
        if (!watchPropertyType) return amenities;
        return amenities.filter(amenity => 
            !amenity.applicableTo || amenity.applicableTo.length === 0 || amenity.applicableTo.includes(watchPropertyType)
        );
    }, [amenities, watchPropertyType]);

    const handleAmenityChange = (amenityEn: string) => {
        const currentAmenitiesEn = watchAmenities?.en || [];
        const newAmenitiesEn = currentAmenitiesEn.includes(amenityEn)
            ? currentAmenitiesEn.filter((a: string) => a !== amenityEn)
            : [...currentAmenitiesEn, amenityEn];
        const amenitiesAr = newAmenitiesEn.map((en: string) => amenities?.find(a => a.en === en)?.ar || en);
        setValue('amenities', { en: newAmenitiesEn, ar: amenitiesAr });
    };
    
    // Form submission
    const onSubmit = async (formData: any) => {
        const isOwner = formData.isOwner || getValues('isOwner');
        if (!isOwner) {
            showToast(t_page.errors.mustBeOwner, 'error');
            return;
        }

        if (!cooperationType || !purpose) {
            showToast(t_page.errors.cooperationType, 'error');
            return;
        }
        
        if (images.length === 0) {
            showToast(language === 'ar' ? 'يرجى رفع صورة واحدة على الأقل' : 'Please upload at least one image', 'error');
            return;
        }

        setIsUploading(true);
        let imageUrls: string[] = [];
        try {
             // Upload images to Cloudinary
             imageUrls = await Promise.all(images.map(file => uploadFile(file)));
        } catch (error) {
            console.error("Upload failed", error);
            showToast("Failed to upload images. Please check your connection.", "error");
            setIsUploading(false);
            return;
        }
        setIsUploading(false);
        
        const lat = formData.latitude || getValues('latitude') || '30.11';
        const lng = formData.longitude || getValues('longitude') || '31.65';
        
        const selectedTypeObj = propertyTypes?.find(t => t.en.toLowerCase() === (formData.propertyType || '').toLowerCase()) || { en: formData.propertyType, ar: formData.propertyType };
        const selectedFinishingObj = finishingStatuses?.find(s => s.en.toLowerCase() === (formData.finishingStatus || '').toLowerCase()) || { en: formData.finishingStatus, ar: formData.finishingStatus };

        const propertyDetails = {
            purpose: purposeOptions.find(o => o.en === purpose)!,
            title: { ar: 'عقار جديد (في انتظار العنوان)', en: 'New Property (Pending Title)' },
            description: { ar: formData['description.ar'] || '', en: formData['description.en'] || '' },
            propertyType: selectedTypeObj,
            finishingStatus: selectedFinishingObj,
            area: parseInt(formData.area),
            price: parseInt(formData.price),
            bedrooms: formData.bedrooms || formData.beds ? parseInt(formData.bedrooms || formData.beds) : undefined,
            bathrooms: formData.bathrooms || formData.baths ? parseInt(formData.bathrooms || formData.baths) : undefined,
            floor: formData.floor ? parseInt(formData.floor) : undefined,
            address: formData.address,
            amenities: formData.amenities || getValues('amenities'),
            location: { lat: parseFloat(lat), lng: parseFloat(lng) },
            isInCompound: formData.isInCompound === 'yes',
            deliveryType: formData.deliveryType,
            deliveryMonth: formData.deliveryMonth,
            deliveryYear: formData.deliveryYear,
            hasInstallments: formData.hasInstallments === 'yes',
            realEstateFinanceAvailable: formData.realEstateFinanceAvailable === 'yes',
            downPayment: formData.downPayment ? parseInt(formData.downPayment) : undefined,
            monthlyInstallment: formData.monthlyInstallment ? parseInt(formData.monthlyInstallment) : undefined,
            years: formData.years ? parseInt(formData.years) : undefined,
            listingStartDate: formData.listingStartDate,
            listingEndDate: formData.listingEndDate,
            contactMethod: cooperationType === 'commission' ? 'platform' : (formData.contactMethod || getValues('contactMethod')),
            ownerPhone: formData.ownerPhone || getValues('ownerPhone'),
        };
        
        if (cooperationType === 'paid_listing') {
            const planDetails = plansForPurpose['paid_listing'];
            const planPriceString = planDetails?.[language]?.price || "0";
            const priceNumeric = parseInt(planPriceString.replace(/[^0-9]/g, '')) || 0;

            navigate('/payment', { 
                state: { 
                    amount: priceNumeric,
                    description: `Property Listing Fee: ${propertyDetails.title.en || 'New Property'}`,
                    type: 'listing_fee',
                    userId: formData.customerPhone, 
                    userName: formData.customerName,
                    data: {
                        requesterInfo: { name: formData.customerName, phone: formData.customerPhone },
                        payload: {
                            contactTime: formData.contactTime,
                            cooperationType: cooperationType,
                            propertyDetails,
                            images: imageUrls,
                        }
                    }
                } 
            });
        } else {
            mutation.mutate({
                requesterInfo: { name: formData.customerName, phone: formData.customerPhone },
                payload: {
                    contactTime: formData.contactTime,
                    cooperationType: cooperationType,
                    propertyDetails,
                    images: imageUrls,
                }
            });
        }
    };

    return {
        currentStep,
        purpose,
        cooperationType,
        plansForPurpose,
        formSubmitted,
        isLoadingContext,
        isLocationModalOpen,
        imagePreviews,
        nextStep,
        prevStep,
        handlePurposeSelect,
        handleCooperationSelect,
        handleImageChange,
        removeImage,
        setIsLocationModalOpen,
        handleAmenityChange,
        handleLocationSelect,
        resetForm,
        register,
        handleSubmit: handleSubmit(onSubmit),
        watch,
        setValue,
        errors,
        onSubmit,
        watchPropertyType,
        watchAmenities,
        availableAmenities,
        watchLatitude,
        watchLongitude,
        propertyTypes,
        finishingStatuses,
        isSubmitting: mutation.isPending || isUploading,
    };
};
