import {
    Document,
    getKoreanFieldworkChecklistSteps as getSharedKoreanFieldworkChecklistSteps,
    KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS,
    KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS
} from 'idai-field-core';


export interface KoreanFieldworkChecklistMetrics {
    done: number;
    total: number;
}

export {
    KOREAN_FIELDWORK_FEATURE_CHECKLIST_STEPS,
    KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS
};


export function getKoreanFieldworkChecklistSteps(categoryName: string,
                                                 investigationMode?: string): readonly string[] {

    return getSharedKoreanFieldworkChecklistSteps(categoryName, investigationMode);
}


export function isKoreanFieldworkChecklistRecord(categoryName: string,
                                                 investigationMode?: string): boolean {

    return getKoreanFieldworkChecklistSteps(categoryName, investigationMode).length > 0;
}


export function getKoreanFieldworkChecklistMetrics(documents: readonly Document[],
                                                   investigationMode?: string): KoreanFieldworkChecklistMetrics {

    return documents.reduce((metrics, document) => {
        const steps = getKoreanFieldworkChecklistSteps(document.resource.category, investigationMode);
        if (steps.length === 0) return metrics;

        return {
            done: metrics.done + countKoreanFieldworkChecklistDone(document, steps),
            total: metrics.total + steps.length
        };
    }, { done: 0, total: 0 });
}


export function countKoreanFieldworkChecklistDone(document: Document,
                                                  checklistSteps: readonly string[]): number {

    return getStringArray(
        (document.resource as unknown as Record<string, unknown>).featureInvestigationChecklist
    ).filter(value => checklistSteps.includes(value)).length;
}


function getStringArray(value: unknown): string[] {

    return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : [];
}
