
import { ar } from '../locales/ar/index';
import { en } from '../locales/en/index';

// This file now serves as the aggregation point for the modular translation files.
// It keeps the existing export names (arTranslations, enTranslations) so that
// the rest of the application doesn't need to change its imports immediately.

export const arTranslations = ar;
export const enTranslations = en;
