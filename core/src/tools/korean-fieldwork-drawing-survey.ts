import { NewResource } from '../model/document/resource';


export const KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS = {
    devices: 'drawingThreeDDevices',
    methods: 'drawingSurveyMethods',
    stages: 'drawingSurveyStages',
    updatedAt: 'drawingSurveyUpdatedAt'
} as const;

const DRAWING_SURVEY_METHOD_LABELS: Readonly<Record<string, string>> = {
    handMeasured: '\uc190\uc2e4\uce21',
    threeDMeasured: '3D \uc2e4\uce21'
};

const DRAWING_SURVEY_DEVICE_LABELS: Readonly<Record<string, string>> = {
    dslr: 'DSLR',
    drone: '\ub4dc\ub860'
};

const DRAWING_SURVEY_STAGE_LABELS: Readonly<Record<string, string>> = {
    afterCompletion: '\uc870\uc0ac \uc644\ub8cc',
    duringInvestigation: '\uc870\uc0ac \uc911'
};


export function getKoreanFieldworkDrawingSurveySummary(resource: NewResource): string|undefined {

    const summaries = [
        getDrawingSurveyFieldSummary(
            '\uc2e4\uce21 \ubc29\uc2dd',
            resource[KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.methods],
            DRAWING_SURVEY_METHOD_LABELS
        ),
        getDrawingSurveyFieldSummary(
            '3D \uc7a5\ube44',
            resource[KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.devices],
            DRAWING_SURVEY_DEVICE_LABELS
        ),
        getDrawingSurveyFieldSummary(
            '\uc2e4\uce21 \ub2e8\uacc4',
            resource[KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.stages],
            DRAWING_SURVEY_STAGE_LABELS
        )
    ].filter((summary): summary is string => !!summary);

    return summaries.length > 0 ? summaries.join(' / ') : undefined;
}


export function hasKoreanFieldworkDrawingSurveySummary(resource: NewResource): boolean {

    return !!getKoreanFieldworkDrawingSurveySummary(resource);
}


function getDrawingSurveyFieldSummary(label: string,
                                      value: unknown,
                                      labels: Readonly<Record<string, string>>): string|undefined {

    const values = getStringArray(value);
    if (values.length === 0) return undefined;

    return `${label}: ${values.map(entry => labels[entry] ?? entry).join('\u00b7')}`;
}


function getStringArray(value: unknown): string[] {

    return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
}
