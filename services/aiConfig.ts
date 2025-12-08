
import { supabase } from '../lib/supabase';
import type { AIEstimatorConfig } from '../types';
import { aiEstimatorConfigData as fallbackData } from '../data/aiConfig';

export const getAIEstimatorConfig = async (): Promise<AIEstimatorConfig | null> => {
    try {
        const { data, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'ai_config')
            .single();

        if (error || !data) {
            return fallbackData as AIEstimatorConfig;
        }
        return data.content as AIEstimatorConfig;
    } catch (e) {
        console.error("Error fetching AI config", e);
        return fallbackData as AIEstimatorConfig;
    }
};

export const updateAIEstimatorConfig = async (config: AIEstimatorConfig): Promise<boolean> => {
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'ai_config', content: config });

    if (error) {
        console.error("Error updating AI config", error);
        return false;
    }
    return true;
};

// Mock function for content generation (Placeholder for future backend integration)
export const generateContent = async (prompt: string, type: 'description' | 'image_prompt'): Promise<string> => {
    // In a real implementation, this would call an Edge Function or Backend API 
    // that wraps OpenAI/Gemini/Anthropic to keep keys secure.
    console.log(`Generating ${type} for prompt: ${prompt}`);
    return new Promise(resolve => setTimeout(() => resolve("AI Content Generation is currently in mock mode. Connect a backend service to enable."), 1000));
};
