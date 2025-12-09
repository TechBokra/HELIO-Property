// Safely access environment variables
const getEnv = () => {
    try {
        return (import.meta as any).env || {};
    } catch {
        return {};
    }
};

const env = getEnv();

// Prefer environment variables for Vercel, fallback to hardcoded for local dev
const CLOUDINARY_CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME || 'dwg0hr34g';
const CLOUDINARY_UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET || 'onlyhelio_uploads';
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const uploadFile = async (file: File): Promise<string> => {
    if (!file) {
        throw new Error("No file provided for upload.");
    }
    
    // Basic validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
         throw new Error("File size exceeds 10MB limit.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_API_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        // Fallback to local URL for offline dev mode if upload fails
        if (process.env.NODE_ENV === 'development') {
             console.warn("Returning local blob URL due to upload failure (Dev Mode).");
             return URL.createObjectURL(file);
        }
        throw error;
    }
};

// Helper to convert File to Base64 (fallback or preview)
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};