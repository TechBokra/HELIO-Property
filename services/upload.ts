// Safely access environment variables
import { getContent } from './content';

const getEnv = () => {
    try {
        return (import.meta as any).env || {};
    } catch {
        return {};
    }
};

const env = getEnv();

export interface CloudinaryConfig {
    cloudName: string;
    uploadPreset: string;
    folder?: string;
    apiKey?: string;
}

// In-memory cache to avoid repeated DB calls on rapid multiple uploads
let cachedConfig: CloudinaryConfig | null = null;

export const saveLocalCloudinaryConfig = (config: Partial<CloudinaryConfig>) => {
    try {
        const existing = getStoredLocalConfig();
        const merged = { ...existing, ...config };
        localStorage.setItem('cloudinary_config', JSON.stringify(merged));
        cachedConfig = merged as CloudinaryConfig;
    } catch {
        // ignore storage errors
    }
};

const getStoredLocalConfig = (): Partial<CloudinaryConfig> => {
    try {
        const local = localStorage.getItem('cloudinary_config');
        if (local) {
            return JSON.parse(local);
        }
    } catch {
        // ignore
    }
    return {};
};

/**
 * Resolves current Cloudinary configuration with cascade:
 * 1. LocalStorage overrides
 * 2. Supabase site_content integrationConfiguration
 * 3. Environment variables (VITE_CLOUDINARY_*)
 * 4. Safe built-in defaults
 */
export const getCloudinarySettings = async (): Promise<CloudinaryConfig> => {
    if (cachedConfig?.cloudName && cachedConfig?.uploadPreset) {
        return cachedConfig;
    }

    // 1. LocalStorage
    const local = getStoredLocalConfig();
    if (local.cloudName && local.uploadPreset) {
        cachedConfig = {
            cloudName: local.cloudName,
            uploadPreset: local.uploadPreset,
            folder: local.folder || env.VITE_CLOUDINARY_FOLDER || 'onlyhelio',
            apiKey: local.apiKey || env.VITE_CLOUDINARY_API_KEY
        };
        return cachedConfig;
    }

    // 2. Database site_content
    try {
        const content = await getContent();
        const cfg = content?.integrationConfiguration?.cloudinary;
        if (cfg?.cloudName && cfg?.uploadPreset) {
            cachedConfig = {
                cloudName: cfg.cloudName,
                uploadPreset: cfg.uploadPreset,
                folder: cfg.folder || env.VITE_CLOUDINARY_FOLDER || 'onlyhelio',
                apiKey: cfg.apiKey
            };
            return cachedConfig;
        }
    } catch {
        // fallback to env
    }

    // 3. Fallback to Env / Defaults
    cachedConfig = {
        cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || 'dwg0hr34g',
        uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || 'onlyhelio_uploads',
        folder: env.VITE_CLOUDINARY_FOLDER || 'onlyhelio',
        apiKey: env.VITE_CLOUDINARY_API_KEY
    };

    return cachedConfig;
};

export interface UploadOptions {
    folder?: string;
    tags?: string[];
}

/**
 * Uploads a file directly to Cloudinary into the project folder.
 */
export const uploadFile = async (
    file: File, 
    options?: UploadOptions
): Promise<string> => {
    if (!file) {
        throw new Error("No file provided for upload.");
    }
    
    // 15MB limit check
    if (file.size > 15 * 1024 * 1024) {
         throw new Error("File size exceeds 15MB limit.");
    }

    const config = await getCloudinarySettings();
    const apiUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);

    // Compute destination folder
    let targetFolder = config.folder || 'onlyhelio';
    const isOptionsObj = options && typeof options === 'object';
    if (isOptionsObj && options.folder) {
        targetFolder = targetFolder ? `${targetFolder}/${options.folder}` : options.folder;
    }
    if (targetFolder) {
        formData.append('folder', targetFolder);
    }

    if (isOptionsObj && options.tags && options.tags.length > 0) {
        formData.append('tags', options.tags.join(','));
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || `Cloudinary upload failed with status ${response.status}`;
            throw new Error(message);
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        // Fallback to local URL for offline dev mode if upload fails
        if (process.env.NODE_ENV === 'development') {
             console.warn("Returning local blob URL due to upload failure (Dev Mode Fallback):", error?.message);
             return URL.createObjectURL(file);
        }
        throw error;
    }
};

/**
 * Interactive connection tester for Cloudinary credentials & folder path.
 */
export const testCloudinaryConnection = async (config: {
    cloudName: string;
    uploadPreset: string;
    folder?: string;
}): Promise<{ success: boolean; url?: string; publicId?: string; error?: string }> => {
    try {
        if (!config.cloudName?.trim() || !config.uploadPreset?.trim()) {
            return {
                success: false,
                error: 'Please enter both Cloud Name and Upload Preset.'
            };
        }

        // Generate tiny 1x1 test PNG
        const pixelBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAElFTkSuQmCC';
        const res = await fetch(pixelBase64);
        const blob = await res.blob();
        const testFile = new File([blob], 'cloudinary_test_connection.png', { type: 'image/png' });

        const formData = new FormData();
        formData.append('file', testFile);
        formData.append('upload_preset', config.uploadPreset.trim());
        if (config.folder?.trim()) {
            formData.append('folder', config.folder.trim());
        }

        const apiUrl = `https://api.cloudinary.com/v1_1/${config.cloudName.trim()}/image/upload`;
        const uploadRes = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });

        const data = await uploadRes.json();
        if (!uploadRes.ok) {
            return {
                success: false,
                error: data.error?.message || `HTTP ${uploadRes.status}: Check your cloud name or preset settings.`
            };
        }

        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id
        };
    } catch (e: any) {
        return {
            success: false,
            error: e?.message || 'Network connection failed'
        };
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