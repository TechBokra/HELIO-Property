
import { z } from 'zod';

// Configuration Constants
export const CONFIG = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    ACCEPTED_DOC_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
};

// Regex Patterns
export const PATTERNS = {
    // Email Pattern
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    // Egyptian Phone: Starts with 010, 011, 012, 015 followed by 8 digits
    EGYPTIAN_PHONE: /^01[0125][0-9]{8}$/,
    // URL Pattern
    URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    // English Characters Only (for slugs/keys)
    ENGLISH_ONLY: /^[a-zA-Z0-9_-]+$/,
    // Numbers Only
    NUMBERS_ONLY: /^\d+$/
};

// Helper messages (Bilingual)
export const MESSAGES = {
    ar: {
        required: "هذا الحقل مطلوب",
        invalid_email: "البريد الإلكتروني غير صحيح",
        invalid_phone: "رقم الهاتف يجب أن يكون مصرياً صحيحاً (11 رقم يبدأ بـ 01)",
        invalid_url: "رابط غير صحيح",
        min_length: (min: number) => `يجب أن يحتوي على ${min} حروف على الأقل`,
        max_length: (max: number) => `يجب ألا يزيد عن ${max} حرف`,
        invalid_number: "يجب إدخال أرقام فقط",
        file_too_large: `حجم الملف كبير جداً (الحد الأقصى ${CONFIG.MAX_FILE_SIZE / 1024 / 1024} ميجابايت)`,
        invalid_file_type: "نوع الملف غير مدعوم",
        password_min: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    },
    en: {
        required: "This field is required",
        invalid_email: "Invalid email address",
        invalid_phone: "Invalid Egyptian phone number (11 digits starting with 01)",
        invalid_url: "Invalid URL",
        min_length: (min: number) => `Must be at least ${min} characters`,
        max_length: (max: number) => `Must not exceed ${max} characters`,
        invalid_number: "Must be numbers only",
        file_too_large: `File size is too large (Max ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
        invalid_file_type: "Unsupported file type",
        password_min: "Password must be at least 8 characters",
    }
};

// Reusable Zod Schemas
export const commonSchemas = {
    email: z.string().min(1, { message: "Required" }).regex(PATTERNS.EMAIL, "Invalid email address"),
    phoneEG: z.string().min(1, { message: "Required" }).regex(PATTERNS.EGYPTIAN_PHONE, "Invalid Egyptian phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    url: z.string().optional().or(z.literal("")).refine((val) => !val || PATTERNS.URL.test(val), "Invalid URL"),
};

/**
 * Safe Data Validation Helper
 * Validates data against a Zod schema and returns a safe result.
 */
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean, data?: T, error?: string } => {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    } else {
        return { success: false, error: result.error.errors[0].message };
    }
};
