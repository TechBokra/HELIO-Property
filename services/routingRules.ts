
import { supabase } from '../lib/supabase';
import type { RoutingRule } from '../data/routingRules';
import { routingRulesData as fallbackRules } from '../data/routingRules';

export const getAllRoutingRules = async (): Promise<RoutingRule[]> => {
    try {
        const { data, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'automation_rules')
            .single();
        
        if (error || !data) {
            return fallbackRules; 
        }
        return data.content as RoutingRule[];
    } catch (e) {
        return fallbackRules;
    }
};

export const addRoutingRule = async (rule: Omit<RoutingRule, 'id'>): Promise<RoutingRule> => {
    const rules = await getAllRoutingRules();
    const newRule: RoutingRule = { ...rule, id: `rule-${Date.now()}` };
    const newRules = [...rules, newRule];
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'automation_rules', content: newRules });

    if (error) throw error;
    return newRule;
};

export const updateRoutingRule = async (id: string, updates: Partial<RoutingRule>): Promise<RoutingRule | null> => {
    const rules = await getAllRoutingRules();
    const index = rules.findIndex(r => r.id === id);
    
    if (index === -1) return null;
    
    const updatedRule = { ...rules[index], ...updates };
    rules[index] = updatedRule;
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'automation_rules', content: rules });

    if (error) throw error;
    return updatedRule;
};

export const deleteRoutingRule = async (id: string): Promise<boolean> => {
    let rules = await getAllRoutingRules();
    const initialLength = rules.length;
    rules = rules.filter(r => r.id !== id);
    
    if (rules.length === initialLength) return false;

    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'automation_rules', content: rules });

    return !error;
};

export const reorderRoutingRules = async (id: string, direction: 'up' | 'down'): Promise<RoutingRule[]> => {
    const rules = await getAllRoutingRules();
    const index = rules.findIndex(r => r.id === id);
    
    if (index < 0) return rules;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < rules.length) {
        const item = rules[index];
        rules.splice(index, 1);
        rules.splice(newIndex, 0, item);
        
        const { error } = await supabase
            .from('site_content')
            .upsert({ key: 'automation_rules', content: rules });
            
        if (error) throw error;
    }
    return rules;
};
