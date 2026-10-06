
import { supabase } from '../lib/supabase';
import { Permission } from '../types';
import type { RoutingRule } from '../data/routingRules';
import { routingRulesData as fallbackRules } from '../data/routingRules';
import { requirePermission } from './authGuard';

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
    requirePermission(Permission.MANAGE_AUTOMATION);
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
    requirePermission(Permission.MANAGE_AUTOMATION);
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
    requirePermission(Permission.MANAGE_AUTOMATION);
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

/**
 * P1.2: Evaluates active routing rules against an incoming request or lead context.
 * Returns the matched assignee partner/manager UUID, or null if no rule matches.
 */
export const evaluateRoutingRules = async (requestContext: {
    type: string;
    payload?: any;
    requesterInfo?: any;
}): Promise<string | null> => {
    try {
        const rules = await getAllRoutingRules();
        const activeRules = rules.filter(r => r.active);

        for (const rule of activeRules) {
            let allConditionsMet = true;

            for (const cond of rule.conditions) {
                let actualVal: any;
                if (cond.field === 'type') {
                    actualVal = requestContext.type;
                } else if (cond.field.startsWith('payload.')) {
                    const key = cond.field.replace('payload.', '');
                    actualVal = requestContext.payload ? requestContext.payload[key] : undefined;
                } else if (cond.field.startsWith('requesterInfo.')) {
                    const key = cond.field.replace('requesterInfo.', '');
                    actualVal = requestContext.requesterInfo ? requestContext.requesterInfo[key] : undefined;
                } else {
                    actualVal = (requestContext as any)[cond.field] ?? requestContext.payload?.[cond.field];
                }

                if (actualVal === undefined || actualVal === null) {
                    allConditionsMet = false;
                    break;
                }

                const expectedVal = cond.value;
                let conditionPassed = false;

                switch (cond.operator) {
                    case 'equals':
                        conditionPassed = String(actualVal).toLowerCase() === String(expectedVal).toLowerCase();
                        break;
                    case 'not_equals':
                        conditionPassed = String(actualVal).toLowerCase() !== String(expectedVal).toLowerCase();
                        break;
                    case 'contains':
                        conditionPassed = String(actualVal).toLowerCase().includes(String(expectedVal).toLowerCase());
                        break;
                    case 'greater_than':
                        conditionPassed = Number(actualVal) > Number(expectedVal);
                        break;
                    case 'less_than':
                        conditionPassed = Number(actualVal) < Number(expectedVal);
                        break;
                    default:
                        conditionPassed = false;
                }

                if (!conditionPassed) {
                    allConditionsMet = false;
                    break;
                }
            }

            if (allConditionsMet && rule.action?.assignTo) {
                return rule.action.assignTo;
            }
        }

        return null;
    } catch (e) {
        console.warn('Error evaluating routing rules, falling back:', e);
        return null;
    }
};

